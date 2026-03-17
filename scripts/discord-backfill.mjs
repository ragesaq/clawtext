#!/usr/bin/env node
/**
 * discord-backfill.mjs
 *
 * Fetches historical Discord channel/thread messages via the Discord API
 * and writes them into the journal, bridging the gap between "before the
 * journal existed" and "now".
 *
 * Typical use case:
 *   - Session was lost before the journal was set up
 *   - Run this once to pull history from Discord and checkpoint it into
 *     the journal so restore-context.mjs and clawtext-restore can use it
 *
 * Usage:
 *   node scripts/discord-backfill.mjs --channel <channelId> [options]
 *
 * Options:
 *   --channel <id>        Discord channel or thread ID to backfill (required)
 *   --limit <n>           Max messages to fetch (default: 100, max: 500)
 *   --before <messageId>  Fetch messages before this message ID (pagination)
 *   --after <messageId>   Fetch messages after this message ID
 *   --stop-at-journal     Stop fetching once we reach messages already in journal (default: true)
 *   --dry-run             Print what would be written, don't write
 *   --verbose             Detailed output
 *   --token <token>       Discord bot token (defaults to DISCORD_BOT_TOKEN env or openclaw.json)
 *
 * Examples:
 *   # Backfill this thread, stop when we hit existing journal entries
 *   node scripts/discord-backfill.mjs --channel 1482230722935918672
 *
 *   # Backfill up to 300 messages
 *   node scripts/discord-backfill.mjs --channel 1482230722935918672 --limit 300
 *
 *   # Dry run — see what would be written
 *   node scripts/discord-backfill.mjs --channel 1482230722935918672 --dry-run --verbose
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const WORKSPACE = path.join(os.homedir(), '.openclaw', 'workspace');
const JOURNAL_DIR = path.join(WORKSPACE, 'journal');
const CONFIG_FILE = path.join(os.homedir(), '.openclaw', 'openclaw.json');

const DISCORD_API = 'https://discord.com/api/v10';
const MAX_PER_REQUEST = 100; // Discord API hard limit

// ── Arg parsing ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    channel: null,
    limit: 100,
    before: null,
    after: null,
    stopAtJournal: true,
    dryRun: false,
    verbose: false,
    token: null,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--channel':   args.channel = argv[++i]; break;
      case '--limit':     args.limit = Math.min(500, parseInt(argv[++i], 10)); break;
      case '--before':    args.before = argv[++i]; break;
      case '--after':     args.after = argv[++i]; break;
      case '--no-stop-at-journal': args.stopAtJournal = false; break;
      case '--dry-run':   args.dryRun = true; break;
      case '--verbose':   args.verbose = true; break;
      case '--token':     args.token = argv[++i]; break;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const log = (...a) => console.log('[discord-backfill]', ...a);
const debug = (...a) => { if (args.verbose) console.log('[discord-backfill:debug]', ...a); };

if (!args.channel) {
  console.error('Usage: node scripts/discord-backfill.mjs --channel <channelId> [options]');
  process.exit(1);
}

// ── Load bot token ────────────────────────────────────────────────────────────
function loadToken() {
  if (args.token) return args.token;
  if (process.env.DISCORD_BOT_TOKEN) return process.env.DISCORD_BOT_TOKEN;
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const token = cfg?.channels?.discord?.token;
    if (token) return token;
    // Multi-account support
    const accounts = cfg?.channels?.discord?.accounts || {};
    for (const acc of Object.values(accounts)) {
      if (acc?.token) return acc.token;
    }
  } catch { /* fallthrough */ }
  return null;
}

const BOT_TOKEN = loadToken();
if (!BOT_TOKEN) {
  console.error('[discord-backfill] No Discord bot token found. Set DISCORD_BOT_TOKEN or check openclaw.json.');
  process.exit(1);
}

// ── Load existing journal entries for this channel (for dedup) ────────────────
function loadExistingJournalMessageIds(channelId) {
  const ids = new Set();
  const timestamps = [];
  if (!fs.existsSync(JOURNAL_DIR)) return { ids, oldestTs: null };

  const files = fs.readdirSync(JOURNAL_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.jsonl$/))
    .sort();

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(JOURNAL_DIR, file), 'utf8');
      for (const line of raw.trim().split('\n').filter(Boolean)) {
        try {
          const rec = JSON.parse(line);
          if (rec.channel === channelId || rec.conversationId === channelId) {
            if (rec.discordMessageId) ids.add(rec.discordMessageId);
            if (rec.ts) timestamps.push(rec.ts);
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  const oldestTs = timestamps.length > 0 ? Math.min(...timestamps) : null;
  return { ids, oldestTs };
}

// ── Discord API: fetch messages ───────────────────────────────────────────────
async function fetchDiscordMessages(channelId, params = {}) {
  const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`);
  url.searchParams.set('limit', String(Math.min(params.limit || MAX_PER_REQUEST, MAX_PER_REQUEST)));
  if (params.before) url.searchParams.set('before', params.before);
  if (params.after)  url.searchParams.set('after', params.after);

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Normalize Discord message → journal record ────────────────────────────────
function normalizeDiscordMessage(msg, channelId) {
  const ts = new Date(msg.timestamp).getTime();
  const isBot = msg.author?.bot === true;
  const senderName = msg.author?.global_name || msg.author?.username || 'unknown';
  const senderId = msg.author?.id;

  // Reconstruct content — include embeds/attachments as metadata
  let content = msg.content || '';
  if (msg.attachments?.length > 0) {
    content += msg.attachments.map(a => ` [attachment: ${a.filename}]`).join('');
  }
  if (msg.embeds?.length > 0 && !content.trim()) {
    content = msg.embeds.map(e => e.title || e.description || '[embed]').join(' | ');
  }

  return {
    ts,
    iso: new Date(ts).toISOString(),
    dir: isBot ? 'out' : 'in',
    sender: isBot ? 'agent' : senderName,
    senderId,
    channel: channelId,
    discordMessageId: msg.id,           // key for dedup
    source: 'discord-backfill',          // tag so we know provenance
    content: content.slice(0, 8000),
    threadName: null,                    // filled in by caller if known
  };
}

// ── Write records to journal ──────────────────────────────────────────────────
function writeToJournal(records, dryRun) {
  if (records.length === 0) return;

  // Group by date
  const byDate = new Map();
  for (const rec of records) {
    const date = new Date(rec.ts).toISOString().slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(rec);
  }

  if (!dryRun && !fs.existsSync(JOURNAL_DIR)) {
    fs.mkdirSync(JOURNAL_DIR, { recursive: true });
  }

  let written = 0;
  for (const [date, recs] of byDate) {
    const file = path.join(JOURNAL_DIR, `${date}.jsonl`);
    const lines = recs.map(r => JSON.stringify(r)).join('\n') + '\n';
    if (dryRun) {
      log(`[dry-run] Would write ${recs.length} records to ${path.basename(file)}`);
    } else {
      fs.appendFileSync(file, lines, 'utf8');
      written += recs.length;
    }
  }
  return written;
}

// ── Write a backfill checkpoint record ───────────────────────────────────────
function writeBackfillCheckpoint(channelId, stats, dryRun) {
  const nowMs = Date.now();
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const record = {
    type: 'checkpoint',
    subtype: 'discord-backfill',
    ts: nowMs,
    iso: new Date(nowMs).toISOString(),
    channel: channelId,
    source: 'discord-backfill',
    messagesFetched: stats.fetched,
    messagesWritten: stats.written,
    messagesSkipped: stats.skipped,
    oldestMessageTs: stats.oldestTs,
    newestMessageTs: stats.newestTs,
    oldestMessageId: stats.oldestId,
  };
  const file = path.join(JOURNAL_DIR, `${today}.jsonl`);
  if (!dryRun) {
    fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
  }
  debug('Backfill checkpoint written:', record);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const channelId = args.channel;
  log(`Starting backfill for channel ${channelId}`);
  if (args.dryRun) log('DRY RUN — nothing will be written');

  // Load existing journal state for dedup
  const { ids: existingIds, oldestTs: journalOldestTs } = loadExistingJournalMessageIds(channelId);
  log(`Existing journal entries for channel: ${existingIds.size}`);
  if (journalOldestTs) {
    log(`Journal coverage starts: ${new Date(journalOldestTs).toISOString()}`);
  } else {
    log('Journal has no existing entries for this channel — full backfill');
  }

  const allRecords = [];
  let before = args.before || null;
  let after = args.after || null;
  let remaining = args.limit;
  let hitExisting = false;
  let pageCount = 0;

  while (remaining > 0 && !hitExisting) {
    const fetchLimit = Math.min(remaining, MAX_PER_REQUEST);
    debug(`Fetching page ${pageCount + 1}: limit=${fetchLimit} before=${before} after=${after}`);

    let messages;
    try {
      messages = await fetchDiscordMessages(channelId, { limit: fetchLimit, before, after });
    } catch (err) {
      console.error('[discord-backfill] API error:', err.message);
      break;
    }

    if (!messages || messages.length === 0) {
      debug('No more messages from API');
      break;
    }

    pageCount++;
    debug(`Got ${messages.length} messages`);

    // Discord returns newest-first by default (when using `before`)
    for (const msg of messages) {
      if (existingIds.has(msg.id)) {
        debug(`Hit existing journal entry at message ${msg.id}, stopping`);
        if (args.stopAtJournal) { hitExisting = true; break; }
        continue;
      }

      const record = normalizeDiscordMessage(msg, channelId);

      // Also stop if we've gone past the oldest journal entry timestamp
      if (args.stopAtJournal && journalOldestTs && record.ts >= journalOldestTs) {
        debug(`Message ${msg.id} is newer than journal start, may overlap — skipping`);
        continue;
      }

      allRecords.push(record);
      remaining--;
    }

    if (hitExisting) break;
    if (messages.length < fetchLimit) break; // no more pages

    // Paginate: use oldest message id as next `before`
    before = messages[messages.length - 1].id;

    // Respect rate limits — Discord allows 50 req/s but be conservative
    await new Promise(r => setTimeout(r, 200));
  }

  if (allRecords.length === 0) {
    log('No new messages to write (all already in journal or nothing fetched)');
    return;
  }

  // Sort oldest→newest before writing
  allRecords.sort((a, b) => a.ts - b.ts);

  const stats = {
    fetched: allRecords.length,
    written: 0,
    skipped: 0,
    oldestTs: allRecords[0].ts,
    newestTs: allRecords[allRecords.length - 1].ts,
    oldestId: allRecords[0].discordMessageId,
  };

  if (args.verbose) {
    log(`\n=== Messages to write ===`);
    for (const rec of allRecords.slice(0, 5)) {
      log(`  [${rec.iso}] ${rec.dir} ${rec.sender}: ${rec.content.slice(0, 80)}`);
    }
    if (allRecords.length > 5) log(`  ... and ${allRecords.length - 5} more`);
  }

  stats.written = writeToJournal(allRecords, args.dryRun) || allRecords.length;
  if (!args.dryRun) writeBackfillCheckpoint(channelId, stats, false);

  log(`\n=== Backfill complete ===`);
  log(`  Fetched:  ${stats.fetched} messages`);
  log(`  Written:  ${args.dryRun ? '(dry-run)' : stats.written} records`);
  log(`  Coverage: ${new Date(stats.oldestTs).toISOString()} → ${new Date(stats.newestTs).toISOString()}`);
  log(`  Journal now covers: ${new Date(stats.oldestTs).toISOString()} onward`);
  log(`\n  Recovery command:`);
  log(`  node scripts/restore-context.mjs --channel ${channelId} --limit 100`);
}

main().catch(err => {
  console.error('[discord-backfill] Fatal:', err.message);
  process.exit(1);
});
