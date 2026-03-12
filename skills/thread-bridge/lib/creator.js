const { execFile } = require('child_process');
const util = require('util');
const execFileP = util.promisify(execFile);
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.resolve(process.cwd(), 'memory/thread-bridge-log.jsonl');
const DEFAULT_TIMEOUT_MS = 20000;
const SAFE_THREAD_TITLE_CHARS = 95;
const SAFE_INITIAL_MESSAGE_CHARS = 1800;
const SAFE_REPLY_MESSAGE_CHARS = 1800;

async function runOpenClaw(args, options = {}) {
  return execFileP('openclaw', args, {
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
    maxBuffer: options.maxBuffer ?? 8 * 1024 * 1024,
  });
}

function extractJson(output) {
  const text = String(output || '').trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) {
    throw new Error('No JSON found in OpenClaw output');
  }
  return JSON.parse(text.slice(first, last + 1));
}

function normalizeThreadTitle(title) {
  const raw = String(title || 'New Thread').replace(/\s+/g, ' ').trim();
  if (!raw) return 'New Thread';
  return raw.length > SAFE_THREAD_TITLE_CHARS
    ? raw.slice(0, SAFE_THREAD_TITLE_CHARS - 1).trimEnd() + '…'
    : raw;
}

function splitMessage(text, maxChars = SAFE_REPLY_MESSAGE_CHARS) {
  const input = String(text || '');
  if (!input) return [''];

  const normalized = input.replace(/\r\n/g, '\n');
  const parts = [];
  let remaining = normalized;

  while (remaining.length > maxChars) {
    let cut = remaining.lastIndexOf('\n\n', maxChars);
    if (cut < Math.floor(maxChars * 0.5)) {
      cut = remaining.lastIndexOf('\n', maxChars);
    }
    if (cut < Math.floor(maxChars * 0.5)) {
      cut = remaining.lastIndexOf(' ', maxChars);
    }
    if (cut < Math.floor(maxChars * 0.5)) {
      cut = maxChars;
    }

    const chunk = remaining.slice(0, cut).trim();
    if (chunk) parts.push(chunk);
    remaining = remaining.slice(cut).trimStart();
  }

  if (remaining.trim()) {
    parts.push(remaining.trim());
  }

  return parts.length > 0 ? parts : [''];
}

function prepareThreadMessages(initialMessage, opts = {}) {
  const maxInitial = opts.maxInitialChars ?? SAFE_INITIAL_MESSAGE_CHARS;
  const maxReply = opts.maxReplyChars ?? SAFE_REPLY_MESSAGE_CHARS;
  const chunks = splitMessage(initialMessage, maxReply);

  if (chunks.length <= 1 && String(chunks[0] || '').length <= maxInitial) {
    return { initial: chunks[0] || '', followUps: [] };
  }

  const firstChunk = chunks[0] || '';
  let initial = firstChunk;
  const followUps = chunks.slice(1);

  const continuationNote = '\n\n[continued below]';
  if (initial.length + continuationNote.length <= maxInitial) {
    initial = initial + continuationNote;
  } else if (initial.length > maxInitial) {
    initial = initial.slice(0, maxInitial - continuationNote.length - 1).trimEnd() + '…' + continuationNote;
  }

  return { initial, followUps };
}

async function sendThreadFollowUp(channelId, message) {
  const args = [
    'message',
    'send',
    '--channel', 'discord',
    '--target', `channel:${channelId}`,
    '-m', String(message || ''),
    '--json',
  ];
  const { stdout } = await runOpenClaw(args);
  try {
    return extractJson(stdout);
  } catch {
    return { raw: stdout };
  }
}

function parseThreadCreate(stdout) {
  const parsed = extractJson(stdout);
  const payload = parsed && parsed.payload ? parsed.payload : parsed;
  const thread = payload && payload.thread ? payload.thread : parsed.thread || parsed.channel || parsed;
  const id = thread && (thread.id || thread.thread_id);
  const url = (thread && thread.url) || parsed.url || null;
  return { id, url, raw: parsed };
}

async function createForumPost(forumChannelId, title, initialMessage, options = {}) {
  const safeTitle = normalizeThreadTitle(title);
  const messagePlan = prepareThreadMessages(initialMessage, options);
  const args = [
    'message',
    'thread',
    'create',
    '--channel', 'discord',
    '--target', `channel:${forumChannelId}`,
    '--thread-name', safeTitle,
    '-m', messagePlan.initial,
    '--json',
  ];

  try {
    const { stdout } = await runOpenClaw(args, { timeout: options.timeout ?? DEFAULT_TIMEOUT_MS });
    const create = parseThreadCreate(stdout);

    if (!create.id) {
      throw new Error('thread id missing from OpenClaw response');
    }

    for (const followUp of messagePlan.followUps) {
      await sendThreadFollowUp(create.id, followUp);
    }

    return {
      id: create.id,
      url: create.url,
      raw: create.raw,
      chunking: {
        initialChars: messagePlan.initial.length,
        followUpCount: messagePlan.followUps.length,
      },
    };
  } catch (err) {
    throw new Error(`Failed to create forum post: ${err.message}`);
  }
}

async function createChannelThread(channelId, title, initialMessage, options = {}) {
  const safeTitle = normalizeThreadTitle(title);
  const messagePlan = prepareThreadMessages(initialMessage, options);
  const args = [
    'message',
    'thread',
    'create',
    '--channel', 'discord',
    '--target', `channel:${channelId}`,
    '--thread-name', safeTitle,
    '-m', messagePlan.initial,
    '--json',
  ];

  try {
    const { stdout } = await runOpenClaw(args, { timeout: options.timeout ?? DEFAULT_TIMEOUT_MS });
    const create = parseThreadCreate(stdout);

    if (!create.id) {
      throw new Error('thread id missing from OpenClaw response');
    }

    for (const followUp of messagePlan.followUps) {
      await sendThreadFollowUp(create.id, followUp);
    }

    return {
      id: create.id,
      url: create.url,
      raw: create.raw,
      chunking: {
        initialChars: messagePlan.initial.length,
        followUpCount: messagePlan.followUps.length,
      },
    };
  } catch (err) {
    throw new Error(`Failed to create channel thread: ${err.message}`);
  }
}

async function createThread(targetChannelId, title, initialMessage, options = {}) {
  try {
    const { stdout } = await runOpenClaw([
      'message',
      'channel',
      'info',
      '--channel', 'discord',
      '--target', `channel:${targetChannelId}`,
      '--json',
    ], { timeout: 8000 });
    const parsed = extractJson(stdout);
    const ch = parsed && parsed.channel;
    if (ch && (ch.type === 15 || ch.type === 'GUILD_FORUM' || ch.type_name === 'GUILD_FORUM')) {
      return await createForumPost(targetChannelId, title, initialMessage, options);
    }
    return await createChannelThread(targetChannelId, title, initialMessage, options);
  } catch (_err) {
    return await createForumPost(targetChannelId, title, initialMessage, options);
  }
}

async function verifyThreadInForum(threadId, expectedForumId) {
  try {
    const { stdout } = await runOpenClaw([
      'message',
      'channel',
      'info',
      '--channel', 'discord',
      '--target', `channel:${threadId}`,
      '--json',
    ], { timeout: 8000 });
    const parsed = extractJson(stdout);
    const parent = parsed && parsed.channel && parsed.channel.parent_id;
    return String(parent) === String(expectedForumId);
  } catch (_err) {
    return false;
  }
}

async function nextPartNumber(forumChannelId, sourceTitle) {
  try {
    const { stdout } = await runOpenClaw([
      'message',
      'thread',
      'list',
      '--channel', 'discord',
      '--channel-id', String(forumChannelId),
      '--limit', '50',
      '--json',
    ], { timeout: 8000 });
    let parsed;
    try { parsed = extractJson(stdout); } catch (_e) { parsed = null; }
    if (parsed && Array.isArray(parsed.threads)) {
      const regex = new RegExp(`^${escapeRegex(sourceTitle)}\\s*—\\s*Part\\s*(\\d+)$`);
      let max = 1;
      parsed.threads.forEach((t) => {
        if (t.name) {
          const m = t.name.match(regex);
          if (m) max = Math.max(max, Number(m[1]) + 1);
        }
      });
      return max;
    }
    return 2;
  } catch (_err) {
    return 2;
  }
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildThreadUrl(forumId, threadId) {
  return `https://discord.com/channels/${process.env.DISCORD_GUILD_ID || ''}/${forumId}/${threadId}`;
}

async function autoTitleFromSummary(summary) {
  if (!summary) return 'Split Thread';
  const firstLine = summary.split('\n').find((l) => l.trim());
  const title = firstLine ? firstLine.trim() : 'Split Thread';
  return normalizeThreadTitle(title.slice(0, 120));
}

async function logOperation(obj) {
  try {
    const line = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, obj));
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, line + '\n', { encoding: 'utf8' });
  } catch (err) {
    console.error('Failed to log thread-bridge operation', err.message);
  }
}

module.exports = {
  createForumPost,
  createChannelThread,
  createThread,
  verifyThreadInForum,
  nextPartNumber,
  buildThreadUrl,
  autoTitleFromSummary,
  logOperation,
  normalizeThreadTitle,
  splitMessage,
  prepareThreadMessages,
  extractJson,
};
