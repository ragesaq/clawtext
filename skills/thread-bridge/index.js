const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFileP = util.promisify(execFile);
const fetcher = require('./lib/fetcher');
const summarizer = require('./lib/summarizer');
const creator = require('./lib/creator');
const linker = require('./lib/linker');

// Allowed forum channel IDs (from subagent context)
const ALLOWED_FORUMS = new Set([
  '1475021817168134144',
  '1475021931446272151',
  '1475021987628712029',
  '1475022122861461606',
  '1475373158260277298',
  '1476018965284261908',
  '1477543809905721365',
  '1478859644633088064',
  '1475021875024494612'
]);
const GUILD_ID = '1474997926919929927';

// Parse inbound metadata object injected by OpenClaw into agent messages.
// Expected shape (best-effort):
// { from, content, channelId, conversationId, messageId, metadata: { threadId, senderId, guildId, channelName, ... } }
function parseCallerContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return null;
  const metadata = ctx.metadata || {};
  const conversationId = ctx.conversationId || ctx.channelId || null;
  const guildId = metadata.guildId || null;
  const channelId = ctx.channelId || conversationId || null;
  const threadId = metadata.threadId || conversationId || null;
  return { guildId, channelId, threadId, raw: ctx };
}

function getCallerContext(inboundMeta) {
  // inboundMeta is the raw inbound metadata object; return parsed ctx
  return parseCallerContext(inboundMeta);
}

function resolveGuildContext(parsedCtx, options = {}) {
  // If parsedCtx provided and contains guildId, prefer it. Otherwise accept options.callerGuildId
  const ctx = parsedCtx || (options && options.ctx) || null;
  const callerGuildId = (ctx && ctx.guildId) || options.callerGuildId || null;
  if (!callerGuildId) {
    console.warn('thread-bridge: caller guild not provided, defaulting to single-guild deployment');
    return { guildId: GUILD_ID, ctx };
  }
  if (String(callerGuildId) !== GUILD_ID) {
    throw new Error('Caller not in permitted guild');
  }
  return { guildId: callerGuildId, ctx };
}

function applyEffortDefaults(opts, actionType) {
  // actionType: 'refresh' | 'split' | 'fresh'
  const effort = opts.effort || 'medium';
  const table = {
    refresh: { low: 50, medium: 150, high: 300, max: 500 },
    split: { low: 5, medium: 15, high: 30, max: 50 },
    fresh: { low: 0, medium: 0, high: 0, max: 0 }
  };
  if (opts.messageCount === undefined || opts.messageCount === null) {
    opts.messageCount = table[actionType][effort] || table[actionType]['medium'];
  }
  // set default summaryStyle per effort if not provided
  if (!opts.summaryStyle) {
    const styleMap = { low: 'bullets', medium: 'brief', high: 'detailed', max: 'detailed' };
    opts.summaryStyle = styleMap[effort] || 'brief';
  }
  return opts;
}

function normalizeContinuityOption(continuity) {
  if (continuity === false) return { enabled: false };
  if (continuity === true || continuity === undefined || continuity === null) {
    return { enabled: true, mode: 'dual', ingest: false };
  }
  return {
    enabled: continuity.enabled !== false,
    mode: continuity.mode || 'dual',
    ingest: Boolean(continuity.ingest),
  };
}

function extractJson(output) {
  const t = String(output || '').trim();
  const idx = t.indexOf('{');
  if (idx === -1) throw new Error('No JSON found in clawbridge output');
  return JSON.parse(t.slice(idx));
}

async function attachContinuityPacket({ sourceThreadId, targetForumId, targetThreadId, mode = 'dual', ingest = false }) {
  const workspace = path.resolve(process.cwd());
  const clawbridgeBin = path.join(workspace, 'skills', 'clawbridge', 'bin', 'clawbridge.js');

  const args = [
    clawbridgeBin,
    'extract-discord-thread',
    '--source-thread', String(sourceThreadId),
    '--target-forum', String(targetForumId),
    '--attach-thread', String(targetThreadId),
    '--no-create-thread',
    '--mode', String(mode || 'dual'),
  ];
  if (ingest) args.push('--ingest');

  const { stdout } = await execFileP('node', args, {
    timeout: ingest ? 180000 : 60000,
    maxBuffer: 8 * 1024 * 1024,
  });

  return extractJson(stdout);
}

async function refreshThread(sourceThreadId, options = {}, ctx = null) {
  const parsed = parseCallerContext(ctx) || null;
  resolveGuildContext(parsed, options);

  const opts = Object.assign({
    messageCount: undefined,
    summaryStyle: undefined,
    postHandoffInSource: true,
    archiveSource: false,
    threadTitle: undefined,
    targetForum: undefined,
    effort: 'medium',
    continuity: true,
  }, options);

  opts.continuity = normalizeContinuityOption(opts.continuity);

  applyEffortDefaults(opts, 'refresh');

  // Fetch messages
  const messages = await fetcher.fetchMessages(sourceThreadId, opts.messageCount);

  // Summarize
  const promptOpts = { style: opts.summaryStyle, mode: 'refresh', effort: opts.effort };
  const summary = await summarizer.summarize(messages, promptOpts);

  // Determine target forum
  const forum = opts.targetForum || (await fetcher.getForumForThread(sourceThreadId));
  if (!ALLOWED_FORUMS.has(String(forum))) {
    throw new Error('Target forum not allowed');
  }

  // Title
  let title = opts.threadTitle;
  if (!title) {
    const sourceTitle = await fetcher.getThreadTitle(sourceThreadId);
    const part = await creator.nextPartNumber(forum, sourceTitle);
    title = `${sourceTitle} — Part ${part}`;
  }

  // Create forum post (forum channels expected)
  const createResp = await creator.createForumPost(forum, title, summary, opts);

  // Attach ClawBridge continuity packet into the new thread/post
  let continuityResult = null;
  if (opts.continuity.enabled && createResp && createResp.id) {
    try {
      continuityResult = await attachContinuityPacket({
        sourceThreadId,
        targetForumId: forum,
        targetThreadId: createResp.id,
        mode: opts.continuity.mode,
        ingest: opts.continuity.ingest,
      });
    } catch (err) {
      continuityResult = { ok: false, error: err.message };
    }
  }

  // Post handoff in source
  if (opts.postHandoffInSource) {
    const link = createResp.url || creator.buildThreadUrl(forum, createResp.id);
    await linker.postHandoff(sourceThreadId, link, createResp.id);
  }

  // Archive source if requested (require confirmation)
  if (opts.archiveSource) {
    // require explicit confirmation flag to be true
    if (opts.confirmArchive !== true) {
      throw new Error('archiveSource requested but no explicit confirmation (confirmArchive:true) provided');
    }
    await fetcher.archiveThread(sourceThreadId);
  }

  // Log operation
  await creator.logOperation({ type: 'refresh', sourceThreadId, newThreadId: createResp.id, forum, options: opts, continuity: continuityResult });

  return { newThreadId: createResp.id, newThreadUrl: createResp.url, continuity: continuityResult };
}

async function splitThread(sourceThreadId, newTitle, forumChannelId, options = {}, ctx = null) {
  const parsed = parseCallerContext(ctx) || null;
  resolveGuildContext(parsed, options);

  const opts = Object.assign({
    messageCount: undefined,
    summaryStyle: undefined,
    postHandoffInSource: true,
    archiveSource: false,
    effort: 'medium',
    continuity: true,
  }, options);

  opts.continuity = normalizeContinuityOption(opts.continuity);

  applyEffortDefaults(opts, 'split');

  const messages = await fetcher.fetchMessages(sourceThreadId, opts.messageCount);
  const promptOpts = { style: opts.summaryStyle, mode: 'split', titleHint: newTitle, effort: opts.effort };
  const summary = await summarizer.summarize(messages, promptOpts);

  const forum = forumChannelId || (await fetcher.getForumForThread(sourceThreadId));
  if (!ALLOWED_FORUMS.has(String(forum))) {
    throw new Error('Target forum not allowed');
  }

  const title = newTitle || (await creator.autoTitleFromSummary(summary));
  const createResp = await creator.createForumPost(forum, title, summary, opts);

  let continuityResult = null;
  if (opts.continuity.enabled && createResp && createResp.id) {
    try {
      continuityResult = await attachContinuityPacket({
        sourceThreadId,
        targetForumId: forum,
        targetThreadId: createResp.id,
        mode: opts.continuity.mode,
        ingest: opts.continuity.ingest,
      });
    } catch (err) {
      continuityResult = { ok: false, error: err.message };
    }
  }

  if (opts.postHandoffInSource) {
    const link = createResp.url || creator.buildThreadUrl(forum, createResp.id);
    await linker.postSplitLink(sourceThreadId, link, createResp.id, title);
  }

  await creator.logOperation({ type: 'split', sourceThreadId, newThreadId: createResp.id, forum, options: opts, continuity: continuityResult });

  return { newThreadId: createResp.id, continuity: continuityResult };
}

async function freshThread(forumChannelId, title, seedText, options = {}, ctx = null) {
  const parsed = parseCallerContext(ctx) || null;
  resolveGuildContext(parsed, options);

  const opts = Object.assign({
    messageCount: 0,
    postHandoffInSource: false,
    archiveSource: false,
    effort: 'low'
  }, options);

  applyEffortDefaults(opts, 'fresh');

  const forum = forumChannelId;
  if (!ALLOWED_FORUMS.has(String(forum))) {
    throw new Error('Target forum not allowed');
  }

  let initialMessage = '';
  if (seedText) initialMessage = seedText;

  const createResp = await creator.createForumPost(forum, title, initialMessage, opts);

  await creator.logOperation({ type: 'fresh', newThreadId: createResp.id, forum, options: opts });

  return { newThreadId: createResp.id };
}

module.exports = { refreshThread, splitThread, freshThread, getCallerContext };

