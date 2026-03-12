/**
 * action-adapter.js — MindGardener Action Adapter
 *
 * Detects action intents in staged summaries and routes them to handler stubs
 * instead of promoting into RAG. Safe default: writes draft JSON to
 * memory/review-actions/ for human review/approval before execution.
 *
 * Supported action types:
 *   - reminder  : "remind me", "remind at", "set reminder", "reminder:"
 *   - note      : "add note", "save note", "note:", "log note"
 *   - issue     : "create issue", "open issue", "github issue", "file issue"
 *   - thread    : "create thread", "new thread", "post to thread"
 *   - message   : "post to discord", "send message to", "notify channel"
 *
 * Integration: call detectAndRouteAction(content, meta) before RAG promotion.
 * Returns { routed: boolean, actionType?, draftPath?, reason? }
 *
 * High-impact actions (issue, thread, message) always go to review.
 * Low-impact actions (note, reminder) can be auto-executed if enabled in config.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../..');
const REVIEW_ACTIONS_DIR = path.join(WORKSPACE, 'memory', 'review-actions');
const ACTIONS_LOG = path.join(WORKSPACE, 'memory', 'actions.log');

// ─── Action pattern registry ───────────────────────────────────────────────

const ACTION_PATTERNS = [
  {
    type: 'reminder',
    autoExecute: false, // set true in config to auto-create cron reminder
    confidence: 0.85,
    patterns: [
      /\b(?:remind\s+me|set\s+(?:a\s+)?reminder|reminder\s*:|add\s+reminder)\b/i,
      /\bremind\b.{0,60}\b(?:at|on|in|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    ],
    extractFields(text) {
      // Try to extract when + what
      const whenMatch = text.match(
        /\b(?:at|on|in|by)\s+([\d:apmAPM\s]+(?:am|pm)?|tomorrow|tonight|[\w\s,]+\d{4})/i
      );
      const whatMatch = text.match(/(?:remind(?:\s+me)?\s+(?:to|about)\s+)(.{10,120})/i);
      return {
        when: whenMatch ? whenMatch[1].trim() : null,
        what: whatMatch ? whatMatch[1].replace(/\n.*/s, '').trim() : null,
      };
    },
  },
  {
    type: 'note',
    autoExecute: false,
    confidence: 0.80,
    patterns: [
      /\b(?:add\s+(?:a\s+)?note|save\s+(?:a\s+)?note|log\s+(?:a\s+)?note|note\s*:)\b/i,
      /^note:\s+/im,
    ],
    extractFields(text) {
      const match = text.match(/(?:note\s*[:—]?\s*)(.{5,400})/i);
      return { content: match ? match[1].replace(/\n.*/s, '').trim() : text.slice(0, 200) };
    },
  },
  {
    type: 'issue',
    autoExecute: false, // always review before filing
    confidence: 0.88,
    patterns: [
      /\b(?:create\s+(?:a\s+)?(?:github\s+)?issue|open\s+(?:a\s+)?(?:github\s+)?issue|file\s+(?:a\s+)?(?:github\s+)?issue|log\s+(?:a\s+)?(?:github\s+)?issue)\b/i,
      /\bgithub\s+issue\b.*\b(?:for|about|regarding)\b/i,
    ],
    extractFields(text) {
      const titleMatch = text.match(/(?:issue\s+(?:titled?|for|about|regarding)\s+["']?)([^\n"']{5,120})/i);
      const repoMatch = text.match(/(?:in|on|repo|repository)\s+([a-z0-9_\-\/]+\/[a-z0-9_\-\/]+)/i);
      return {
        title: titleMatch ? titleMatch[1].trim() : null,
        repo: repoMatch ? repoMatch[1].trim() : null,
      };
    },
  },
  {
    type: 'thread',
    autoExecute: false,
    confidence: 0.82,
    patterns: [
      /\b(?:create\s+(?:a\s+)?(?:new\s+)?thread|start\s+(?:a\s+)?(?:new\s+)?thread|new\s+(?:forum\s+)?(?:post|thread)|spin\s+off\s+(?:a\s+)?(?:new\s+)?thread)\b/i,
      /\bpost\s+(?:this|it|that)\s+(?:to|in|as)\s+(?:a\s+)?(?:new\s+)?thread\b/i,
    ],
    extractFields(text) {
      const titleMatch = text.match(/(?:thread|post)\s+(?:about|titled?|called?|named?)\s+["']?([^\n"']{5,100})/i);
      const forumMatch = text.match(/(?:in|to|on)\s+([\w\-]+(?:\s+[\w\-]+)?)\s+(?:forum|channel)\b/i);
      return {
        title: titleMatch ? titleMatch[1].trim() : null,
        forum: forumMatch ? forumMatch[1].trim() : null,
      };
    },
  },
  {
    type: 'message',
    autoExecute: false,
    confidence: 0.82,
    patterns: [
      /\b(?:post\s+(?:this\s+)?to\s+discord|post\s+(?:this\s+)?(?:summary\s+)?to\s+discord|send\s+(?:a\s+)?message\s+to|notify\s+(?:the\s+)?channel|message\s+(?:the\s+)?channel)\b/i,
      /\b(?:post|send)\s+.{0,30}\s+to\s+discord\b/i,
      /\b(?:announce|broadcast)\s+(?:in|to)\s+(?:#[\w\-]+|channel)\b/i,
    ],
    extractFields(text) {
      const chanMatch = text.match(/(?:to|in)\s+(#[\w\-]+|[\w\-]+(?:\s+channel)?)/i);
      const msgMatch = text.match(/(?:message|post|announce|broadcast)\s*[:—]?\s*["']?(.{10,400})/i);
      return {
        channel: chanMatch ? chanMatch[1].trim() : null,
        message: msgMatch ? msgMatch[1].replace(/\n.*/s, '').trim() : null,
      };
    },
  },
];

// ─── Handler stubs ──────────────────────────────────────────────────────────

const HANDLERS = {
  reminder: (fields, meta) => ({
    handler: 'cron-reminder',
    status: 'draft',
    instructions: 'Review then execute: create a cron reminder using the cron tool with the when/what fields.',
    fields,
    example: `cron.add({ schedule: { kind: 'at', at: '<when>' }, payload: { kind: 'systemEvent', text: '<what>' }, sessionTarget: 'main' })`,
  }),
  note: (fields, meta) => ({
    handler: 'memory-note',
    status: 'draft',
    instructions: 'Review then execute: append this note to memory/YYYY-MM-DD.md or the appropriate project file.',
    fields,
  }),
  issue: (fields, meta) => ({
    handler: 'github-issue',
    status: 'draft',
    instructions: 'Review then execute: open a GitHub issue in the specified repo with the given title.',
    fields,
    example: `gh issue create --repo <repo> --title "<title>" --body "<body>"`,
  }),
  thread: (fields, meta) => ({
    handler: 'thread-bridge',
    status: 'draft',
    instructions: 'Review then execute: use the thread-bridge skill to create a new forum post/thread.',
    fields,
    example: `sessions_spawn({ task: 'freshThread(...)', runtime: 'subagent' })`,
  }),
  message: (fields, meta) => ({
    handler: 'discord-message',
    status: 'draft',
    instructions: 'Review then execute: send this message to the specified Discord channel.',
    fields,
    example: `message({ action: 'send', target: '<channel>', message: '<message>' })`,
  }),
};

// ─── Core detection ─────────────────────────────────────────────────────────

/**
 * Detect action intent in a piece of text.
 * Returns { matched: boolean, type?, confidence?, fields? }
 */
export function detectAction(text) {
  for (const def of ACTION_PATTERNS) {
    for (const re of def.patterns) {
      if (re.test(text)) {
        return {
          matched: true,
          type: def.type,
          confidence: def.confidence,
          autoExecute: def.autoExecute,
          fields: def.extractFields(text),
        };
      }
    }
  }
  return { matched: false };
}

/**
 * Main integration point: detect action in content, write draft to review-actions/.
 * Returns { routed, actionType?, draftPath?, reason? }
 */
export function detectAndRouteAction(content, meta = {}) {
  const detection = detectAction(content);
  if (!detection.matched) return { routed: false, reason: 'no_action_detected' };

  ensureDir(REVIEW_ACTIONS_DIR);

  const ts = new Date().toISOString().replace(/[:.]/g, '');
  const id = crypto.randomBytes(4).toString('hex');
  const filename = `${ts}-${detection.type}-${id}.json`;
  const draftPath = path.join(REVIEW_ACTIONS_DIR, filename);

  const handler = HANDLERS[detection.type];
  const draft = {
    id,
    ts: new Date().toISOString(),
    actionType: detection.type,
    confidence: detection.confidence,
    autoExecute: detection.autoExecute,
    source: meta.source || 'mindgardener',
    originalContent: content.slice(0, 1000),
    ...(handler ? handler(detection.fields, meta) : { handler: 'unknown', status: 'draft', fields: detection.fields }),
  };

  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2) + '\n');

  // Append to actions log
  const logLine = `${new Date().toISOString()} ACTION_DETECTED type=${detection.type} confidence=${detection.confidence} id=${id} draft=${filename}\n`;
  fs.appendFileSync(ACTIONS_LOG, logLine);

  console.log(`[action-adapter] routed action: type=${detection.type} confidence=${detection.confidence} → ${filename}`);

  return {
    routed: true,
    actionType: detection.type,
    confidence: detection.confidence,
    draftPath,
    draftFile: filename,
  };
}

// ─── CLI: list pending review-actions ───────────────────────────────────────

export function listPendingActions() {
  if (!fs.existsSync(REVIEW_ACTIONS_DIR)) return [];
  return fs.readdirSync(REVIEW_ACTIONS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(REVIEW_ACTIONS_DIR, f), 'utf8'));
        return { file: f, ...d };
      } catch { return { file: f, error: 'parse_failed' }; }
    })
    .sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
}

export function approveAction(filename) {
  const p = path.join(REVIEW_ACTIONS_DIR, filename);
  if (!fs.existsSync(p)) throw new Error(`Draft not found: ${filename}`);
  const draft = JSON.parse(fs.readFileSync(p, 'utf8'));
  // Mark approved — actual execution is manual/agent-driven
  draft.status = 'approved';
  draft.approvedAt = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(draft, null, 2) + '\n');
  const logLine = `${new Date().toISOString()} ACTION_APPROVED type=${draft.actionType} id=${draft.id} file=${filename}\n`;
  fs.appendFileSync(ACTIONS_LOG, logLine);
  return draft;
}

export function dismissAction(filename) {
  const p = path.join(REVIEW_ACTIONS_DIR, filename);
  if (!fs.existsSync(p)) throw new Error(`Draft not found: ${filename}`);
  const draft = JSON.parse(fs.readFileSync(p, 'utf8'));
  draft.status = 'dismissed';
  draft.dismissedAt = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(draft, null, 2) + '\n');
  const logLine = `${new Date().toISOString()} ACTION_DISMISSED type=${draft.actionType} id=${draft.id} file=${filename}\n`;
  fs.appendFileSync(ACTIONS_LOG, logLine);
  return draft;
}

// ─── Util ────────────────────────────────────────────────────────────────────

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
