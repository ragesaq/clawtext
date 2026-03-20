/**
 * ClawCouncil Integration Helper
 *
 * Packages ClawText memory context (slots + advisor + session matrix) into
 * a structured payload for ClawCouncil advisor sessions.
 *
 * ClawText = data layer. ClawCouncil = orchestration. This is the bridge.
 */

import path from 'path';
import { expandSlotTemplates, type SlotTemplateExpansion } from '../slots/template-expansion.js';
import type { SlotApiContext } from '../slots/slot-api.js';
import { reflect, shouldReflect, type Memory } from '../reflect/index.js';
import { loadAdvisorState, listCouncilPerspectives } from '../slots/advisor.js';
import { loadSessionMatrixState, getSessionById, getRelatedSessions } from '../slots/sessionMatrix.js';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface CouncilContextOptions {
  /** ID of the current session (e.g. discord-thread:1482230722935918672) */
  sessionId: string;
  /** Optional: current topic/query for reflect synthesis */
  query?: string;
  /** Memories to include (from RAG retrieval) */
  memories?: Memory[];
  /** Whether to run reflect synthesis when memories are provided */
  enableReflect?: boolean;
  /** Max raw memories to list when reflect is not used */
  maxRawMemories?: number;
  /** Workspace root (defaults to OPENCLAW_WORKSPACE_PATH or ~/.openclaw/workspace) */
  workspacePath?: string;
}

export interface CouncilContextPayload {
  /** Advisor context block (formatted string) */
  advisorContext: string;
  /** Session matrix context block (formatted string) */
  sessionContext: string;
  /** Synthesized memory string (reflect output or raw list) */
  memoryContext: string;
  /** Whether reflect synthesis was used */
  reflectUsed: boolean;
  /** Full slot expansion for use in prompt templates */
  expansion: SlotTemplateExpansion;
  /** Raw metadata for debugging/logging */
  meta: {
    sessionId: string;
    advisorId: string | null;
    memoriesCount: number;
    reflectModel: string | null;
    reflectLatencyMs: number | null;
    generatedAt: string;
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function resolveWorkspacePath(override?: string): string {
  return (
    override ||
    process.env.OPENCLAW_WORKSPACE_PATH ||
    path.join(process.env.HOME || '', '.openclaw', 'workspace')
  );
}

function buildAdvisorContextBlock(workspacePath: string, sessionId: string): string {
  const state = loadAdvisorState(workspacePath);
  const session = loadSessionMatrixState(workspacePath).sessions.find(
    (s) => s.sessionId === sessionId
  );

  const lines: string[] = [];

  if (session?.ownerAdvisorId) {
    lines.push(`- Active advisor owner: ${session.ownerAdvisorId}`);
    if (session.domain) lines.push(`- Session domain: ${session.domain}`);
    if (session.project) lines.push(`- Session project: ${session.project}`);
  }

  if (session?.domain) {
    const rule = state.routingRules.find((r) => r.domain === session.domain);
    if (rule) {
      const advisorId = rule.currentAdvisorId || rule.seedAdvisorId;
      lines.push(
        `- Domain route [${session.domain}]: ${advisorId} (${rule.strategy}, current=${rule.currentAdvisorId})`
      );
    }
  }

  const perspectives = listCouncilPerspectives(workspacePath, { includeInactive: false });
  if (perspectives.length > 0) {
    lines.push(`- Council perspectives: ${perspectives.map((p) => p.label).join(', ')}`);
  }

  return lines.length > 0 ? `## Advisor Context\n${lines.join('\n')}` : '';
}

function buildSessionContextBlock(workspacePath: string, sessionId: string): string {
  const session = getSessionById(workspacePath, sessionId);
  if (!session) return '';

  const lines: string[] = [
    `## Session Matrix Context`,
    `- Current session: ${sessionId}`,
    `- Project: ${session.project || 'unknown'}`,
    `- Owner: ${session.ownerAdvisorId || 'unset'}`,
    `- Domain: ${session.domain || 'unknown'}`,
    `- Status: ${session.status}`,
  ];

  const related = getRelatedSessions(workspacePath, sessionId);
  if (related.length > 0) {
    lines.push(`- Related sessions:`);
    for (const rel of related.slice(0, 4)) {
      lines.push(
        `  - ${rel.sessionId} (${rel.reason}; owner=${rel.ownerAdvisorId || 'unset'}; domain=${rel.domain || 'unknown'}; status=${rel.status})`
      );
    }
  }

  return lines.join('\n');
}

// ──────────────────────────────────────────────
// Core function
// ──────────────────────────────────────────────

/**
 * Render a structured context payload for a ClawCouncil session.
 *
 * Usage:
 * ```ts
 * const ctx = await renderCouncilContext({ sessionId, query, memories });
 * // Inject ctx.advisorContext + ctx.memoryContext into your advisor prompt
 * ```
 */
export async function renderCouncilContext(
  options: CouncilContextOptions
): Promise<CouncilContextPayload> {
  const {
    sessionId,
    query,
    memories = [],
    enableReflect = true,
    maxRawMemories = 5,
    workspacePath: workspaceOverride,
  } = options;

  const workspacePath = resolveWorkspacePath(workspaceOverride);

  // ── Build context blocks ────────────────────
  const advisorContext = buildAdvisorContextBlock(workspacePath, sessionId);
  const sessionContext = buildSessionContextBlock(workspacePath, sessionId);

  // ── Resolve active advisor ID ───────────────
  const session = loadSessionMatrixState(workspacePath).sessions.find(
    (s) => s.sessionId === sessionId
  );
  const advisorId = session?.ownerAdvisorId || null;

  // ── Memory synthesis via reflect ────────────
  let memoryContext = '';
  let reflectUsed = false;
  let reflectModel: string | null = null;
  let reflectLatencyMs: number | null = null;

  if (memories.length > 0) {
    const useReflect = enableReflect && (await shouldReflect(memories));

    if (useReflect && query) {
      const result = await reflect({ query, memories });
      memoryContext = result.reflection;
      reflectUsed = true;
      reflectModel = result.model;
      reflectLatencyMs = result.latencyMs;
    } else {
      memoryContext = memories
        .slice(0, maxRawMemories)
        .map((m, i) => `${i + 1}. ${m.content}`)
        .join('\n');
    }
  }

  // ── Build combined template for slot expansion ──
  const combinedTemplate = [advisorContext, sessionContext].filter(Boolean).join('\n\n');

  const slotCtx: SlotApiContext = {
    workspacePath,
    sessionKey: sessionId,
  };
  const expansion = expandSlotTemplates(combinedTemplate, slotCtx, { onMissing: 'leave' });

  return {
    advisorContext,
    sessionContext,
    memoryContext,
    reflectUsed,
    expansion,
    meta: {
      sessionId,
      advisorId,
      memoriesCount: memories.length,
      reflectModel,
      reflectLatencyMs,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Convenience: expand a prompt template string with full council context.
 *
 * Supported tokens: {{advisor.active}}, {{session.matrix:<id>}}, plus any
 * slot tokens supported by expandSlotTemplates.
 *
 * Additionally injects:
 * - {{memory.context}} → synthesized memory block (reflect or raw)
 * - {{advisor.context}} → advisor context block
 * - {{session.context}} → session matrix block
 */
export async function renderCouncilPromptBlock(
  template: string,
  options: CouncilContextOptions
): Promise<string> {
  const ctx = await renderCouncilContext(options);
  const workspacePath = resolveWorkspacePath(options.workspacePath);

  // First pass: inject named blocks
  let result = template
    .replace(/\{\{memory\.context\}\}/g, ctx.memoryContext)
    .replace(/\{\{advisor\.context\}\}/g, ctx.advisorContext)
    .replace(/\{\{session\.context\}\}/g, ctx.sessionContext);

  // Second pass: full slot expansion for any remaining {{...}} tokens
  const slotCtx: SlotApiContext = {
    workspacePath,
    sessionKey: options.sessionId,
  };
  const expanded = expandSlotTemplates(result, slotCtx, { onMissing: 'leave' });
  return expanded.output;
}
