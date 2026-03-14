#!/usr/bin/env node
/**
 * ClawBridge v2.0 CLI
 *
 * Usage:
 *   clawbridge extract --source-thread <id> --target-forum <id> [options]
 *   clawbridge format --input <yaml> --format <short|full|bootstrap|clipboard>
 *
 * Options:
 *   --depth <quick|standard|deep|exhaustive>  Extraction depth (default: standard)
 *   --model <model>                           LLM model override
 *   --objective "..."                         Thread objective
 *   --title "..."                             New thread title
 *   --no-create-thread                        Don't create Discord thread
 *   --attach-thread <id>                      Post to existing thread
 *   --ingest                                  Ingest into ClawText memory
 *   --validate                                Force validation pass
 *   --previous <yaml>                         Previous handoff for diff
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const bridge = require('./index.cjs');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('-')) { out._.push(a); continue; }
    if (a.startsWith('--no-')) {
      out[a.slice(5)] = false;
      continue;
    }
    if (a.startsWith('--')) {
      const body = a.slice(2);
      let key = body, value = true;
      if (body.includes('=')) {
        const idx = body.indexOf('=');
        key = body.slice(0, idx);
        value = body.slice(idx + 1);
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        value = argv[++i];
      }
      out[key] = value;
      continue;
    }
    const key = a.replace(/^-+/, '');
    let value = true;
    if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) value = argv[++i];
    out[key] = value;
  }
  return out;
}

function readMessages(sourceThreadId, limit) {
  const result = execFileSync('openclaw', [
    'message', 'read',
    '--channel', 'discord',
    '--target', `channel:${sourceThreadId}`,
    '--limit', String(limit),
    '--json',
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

  try {
    const idx = result.indexOf('{');
    if (idx === -1) return [];
    const parsed = JSON.parse(result.slice(idx));
    return parsed?.payload?.messages || [];
  } catch {
    return [];
  }
}

function splitForDiscord(text, max = 1800) {
  if (text.length <= max) return [text];
  const paras = text.split('\n\n');
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if (!cur) { cur = p.length <= max ? p : p.slice(0, max); continue; }
    const candidate = `${cur}\n\n${p}`;
    if (candidate.length <= max) { cur = candidate; }
    else { chunks.push(cur); cur = p.length <= max ? p : p.slice(0, max); }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function sendToThread(threadId, text) {
  const chunks = splitForDiscord(text, 1800);
  for (const c of chunks) {
    execFileSync('openclaw', [
      'message', 'send',
      '--channel', 'discord',
      '--target', threadId,
      '-m', c,
      '--json',
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  }
}

function createThread(targetForum, title, initMessage) {
  const result = execFileSync('openclaw', [
    'message', 'thread', 'create',
    '--channel', 'discord',
    '--target', `channel:${targetForum}`,
    `--thread-name=${title}`,
    '-m', initMessage,
    '--json',
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

  const idx = result.indexOf('{');
  if (idx === -1) throw new Error('Failed to parse thread creation response');
  const parsed = JSON.parse(result.slice(idx));
  const threadId = parsed?.payload?.thread?.id || parsed?.thread?.id;
  if (!threadId) throw new Error('Failed to get thread ID from response');
  return threadId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  if (!cmd || cmd === 'help' || args.help) {
    console.log(`
ClawBridge v2.0 — LLM-Powered Context Transfer

Commands:
  extract    Extract and bridge a Discord thread
  format     Re-format an existing mind-meld YAML

Extract Options:
  --source-thread <id>    Source Discord thread ID (required)
  --target-forum <id>     Target forum channel ID (required for posting)
  --title "..."           New thread title (required if creating thread)
  --depth <level>         quick|standard|deep|exhaustive (default: standard)
  --model <model>         LLM model override
  --objective "..."       Thread objective / focus
  --no-create-thread      Generate artifacts only, don't post
  --attach-thread <id>    Post to existing thread
  --ingest                Ingest into ClawText memory
  --validate              Force validation pass
  --previous <yaml>       Previous handoff YAML path (for diff)
  --limit <n>             Message read limit (default: per depth level)

Format Options:
  --input <yaml>          Path to mind-meld YAML file
  --format <type>         short|full|bootstrap|clipboard|diff

Examples:
  clawbridge extract --source-thread 123 --target-forum 456 --title "New Thread" --depth deep
  clawbridge extract --source-thread 123 --no-create-thread --depth exhaustive
  clawbridge format --input docs/handoffs/CLAWBRIDGE_MINDMELD_2026-03-14.yaml --format clipboard
`);
    process.exit(0);
  }

  if (cmd === 'extract') {
    const sourceThread = args['source-thread'] || args.sourceThread;
    const targetForum = args['target-forum'] || args.targetForum;
    const depth = args.depth || 'standard';
    const depthConfig = bridge.DEPTH_CONFIG[depth] || bridge.DEPTH_CONFIG.standard;
    const limit = Number(args.limit || depthConfig.messages);
    const workspace = args.workspace || path.join(process.env.HOME || '', '.openclaw', 'workspace');

    if (!sourceThread) {
      console.error('Missing required: --source-thread <id>');
      process.exit(1);
    }

    // Read messages
    console.log(`[ClawBridge] Reading ${limit} messages from thread ${sourceThread}...`);
    const messages = readMessages(sourceThread, limit);
    console.log(`[ClawBridge] Got ${messages.length} messages`);

    if (messages.length === 0) {
      console.error('No messages found in source thread');
      process.exit(1);
    }

    // Load previous handoff for diff (if provided)
    let previousHandoff = null;
    if (args.previous && fs.existsSync(args.previous)) {
      previousHandoff = fs.readFileSync(args.previous, 'utf8');
    }

    // Run pipeline
    const result = await bridge.pipeline({
      messages,
      depth,
      sourceThread,
      objective: args.objective,
      model: args.model,
      previousHandoff,
      workspace,
      validate: args.validate !== false && depthConfig.validate,
    });

    // Post to Discord if requested
    const noCreateThread = args['create-thread'] === false;
    const attachThread = args['attach-thread'] || args.attachThread;

    if (targetForum && !noCreateThread) {
      const title = args.title;
      if (!title && !attachThread) {
        console.error('Missing --title for new thread creation');
        process.exit(1);
      }

      const initMsg = [
        `🧠 **ClawBridge v2.0 Extract (${depth})**`,
        '',
        `Source: ${sourceThread} | ${messages.length} messages | Depth: ${depth}`,
        `Generated: ${new Date().toISOString()}`,
      ].join('\n');

      let threadId = attachThread;
      if (!threadId) {
        threadId = createThread(targetForum, title, initMsg);
      } else {
        sendToThread(threadId, initMsg);
      }

      // Post artifacts
      sendToThread(threadId, `## Short Handoff\n\n${result.artifacts.short}`);
      sendToThread(threadId, `## Full Continuity Packet\n\n${result.artifacts.full}`);
      sendToThread(threadId, `## Agent Bootstrap\n\n${result.artifacts.bootstrap}`);

      const guild = args['guild-id'] || args.guildId || '1474997926919929927';
      const url = `https://discord.com/channels/${guild}/${targetForum}/${threadId}`;

      console.log(JSON.stringify({
        ok: true,
        depth,
        threadId,
        threadUrl: url,
        artifacts: Object.fromEntries(
          Object.entries(result.paths).map(([k, v]) => [k, path.relative(workspace, v)])
        ),
        provenance: result.packet.provenance,
      }, null, 2));
    } else {
      // Just output artifacts
      console.log(JSON.stringify({
        ok: true,
        depth,
        artifacts: Object.fromEntries(
          Object.entries(result.paths).map(([k, v]) => [k, path.relative(workspace, v)])
        ),
        provenance: result.packet.provenance,
      }, null, 2));
    }

    // Ingest into ClawText if requested
    if (args.ingest) {
      const ingestCli = path.join(workspace, 'skills', 'clawtext', 'bin', 'ingest.js');
      const buildClusters = path.join(workspace, 'skills', 'clawtext', 'scripts', 'build-clusters.js');

      try {
        execFileSync('node', [
          ingestCli, 'ingest-text',
          `--input=${result.paths.full}`,
          `--project=${args.project || 'clawbridge'}`,
          `--source=clawbridge:v2:${sourceThread}`,
          '--type=continuity-packet',
          '--verbose',
        ], { stdio: 'inherit' });

        execFileSync('node', [buildClusters, '--force'], { stdio: 'inherit' });
        console.log('[ClawBridge] Ingested into ClawText memory');
      } catch (e) {
        console.error(`[ClawBridge] Ingest failed: ${e.message}`);
      }
    }
  }

  if (cmd === 'format') {
    const input = args.input;
    const fmt = args.format || 'full';

    if (!input || !fs.existsSync(input)) {
      console.error('Missing or invalid --input <yaml-path>');
      process.exit(1);
    }

    const yamlContent = fs.readFileSync(input, 'utf8');
    let packet;
    try {
      packet = JSON.parse(yamlContent);
      if (packet.handoff) packet = packet.handoff;
    } catch {
      packet = { _raw: yamlContent };
    }

    console.log(bridge.format(packet, fmt));
  }
}

main().catch(e => {
  console.error(`[ClawBridge] Fatal: ${e.message}`);
  process.exit(1);
});
