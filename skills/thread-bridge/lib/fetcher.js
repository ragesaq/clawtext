const { execFile } = require('child_process');
const util = require('util');
const execFileP = util.promisify(execFile);

async function runOpenClaw(args, options = {}) {
  return execFileP('openclaw', args, {
    timeout: options.timeout ?? 20000,
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

// Fetcher: small wrapper around the `openclaw` CLI for reading thread/channel information
// Context notes: inbound metadata injected by OpenClaw may expose fields like:
// { from, content, channelId, conversationId, messageId, metadata: { threadId, senderId, guildId, channelName, ... } }
// This module expects to be run in the same environment that has the openclaw CLI configured.

async function fetchMessages(threadId, limit = 100) {
  const safeLimit = Math.min(limit, 500);
  try {
    const { stdout } = await runOpenClaw([
      'message',
      'read',
      '--channel', 'discord',
      '--target', `channel:${threadId}`,
      '--limit', String(safeLimit),
      '--json',
    ]);
    try {
      const parsed = extractJson(stdout);
      const msgsRaw = parsed.messages || parsed || [];
      const msgs = (Array.isArray(msgsRaw) ? msgsRaw : []).filter((m) => {
        if (!m) return false;
        if (m.type && (m.type === 'system' || m.type === 'bot')) return false;
        if (m.author && m.author.bot) return false;
        if (!m.content || (typeof m.content === 'string' && m.content.trim() === '')) return false;
        return true;
      }).map((m) => ({
        id: m.id,
        author: m.author && (m.author.username || m.author.name),
        content: m.content,
        ts: m.ts,
      }));
      return msgs;
    } catch (_e) {
      return stdout.split('\n').slice(-limit);
    }
  } catch (err) {
    throw new Error(`Failed to fetch messages: ${err.message}`);
  }
}

async function getForumForThread(threadId) {
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
    return (parsed && parsed.channel && parsed.channel.parent_id) || null;
  } catch (_err) {
    return null;
  }
}

async function getThreadTitle(threadId) {
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
    return (parsed && parsed.channel && (parsed.channel.name || parsed.channel.topic)) || `Thread ${threadId}`;
  } catch (_err) {
    return `Thread ${threadId}`;
  }
}

async function archiveThread(threadId) {
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
    const last = parsed && parsed.channel && parsed.channel.last_message_id;
    if (last) {
      await runOpenClaw([
        'message',
        'delete',
        '--channel', 'discord',
        '--target', `channel:${threadId}`,
        '--message-id', String(last),
        '--json',
      ], { timeout: 8000 });
      return true;
    }
    return true;
  } catch (err) {
    throw new Error(`Failed to archive thread (best-effort): ${err.message}`);
  }
}

module.exports = { fetchMessages, getForumForThread, getThreadTitle, archiveThread, extractJson };
