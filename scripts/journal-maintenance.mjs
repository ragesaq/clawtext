#!/usr/bin/env node
/**
 * journal-maintenance.mjs
 *
 * Nightly maintenance for the ClawText journal system:
 *
 *   1. COMPRESS — gzip journal files older than COMPRESS_AFTER_DAYS (default 30)
 *                 ~10:1 compression ratio on JSONL text → negligible storage forever
 *
 *   2. GIT COMMIT — stage and commit any new/modified journal files to workspace repo
 *                   provides a second layer of durability beyond the filesystem
 *
 *   3. REPORT — print a summary of journal health (size, coverage, oldest entry)
 *
 * Usage:
 *   node scripts/journal-maintenance.mjs [options]
 *
 * Options:
 *   --compress-after <days>   Days before compressing (default: 30)
 *   --no-git                  Skip git commit step
 *   --report-only             Only print report, no mutations
 *   --verbose                 Detailed output
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync, spawnSync } from 'child_process';
import zlib from 'zlib';

const WORKSPACE = path.join(os.homedir(), '.openclaw', 'workspace');
const JOURNAL_DIR = path.join(WORKSPACE, 'journal');

// ── Arg parsing ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { compressAfter: 30, git: true, reportOnly: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--no-git') args.git = false;
    else if (argv[i] === '--report-only') args.reportOnly = true;
    else if (argv[i] === '--verbose') args.verbose = true;
    else if (argv[i] === '--compress-after' && argv[i + 1]) {
      args.compressAfter = parseInt(argv[++i], 10);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const log = (...a) => console.log('[journal-maintenance]', ...a);
const debug = (...a) => { if (args.verbose) console.log('[journal-maintenance:debug]', ...a); };

// ── Helpers ───────────────────────────────────────────────────────────────────
function getJournalFiles() {
  if (!fs.existsSync(JOURNAL_DIR)) return { raw: [], compressed: [] };
  const entries = fs.readdirSync(JOURNAL_DIR);
  return {
    raw: entries
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.jsonl$/))
      .map(f => ({ name: f, date: f.slice(0, 10), full: path.join(JOURNAL_DIR, f) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    compressed: entries
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.jsonl\.gz$/))
      .map(f => ({ name: f, date: f.slice(0, 10), full: path.join(JOURNAL_DIR, f) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function cutoffDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function gzipFile(srcPath) {
  const destPath = srcPath + '.gz';
  const src = fs.readFileSync(srcPath);
  const compressed = zlib.gzipSync(src, { level: 9 });
  fs.writeFileSync(destPath, compressed);
  return { destPath, originalBytes: src.length, compressedBytes: compressed.length };
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

// ── Step 1: Compress old journal files ───────────────────────────────────────
function runCompress() {
  if (!fs.existsSync(JOURNAL_DIR)) {
    log('Journal directory does not exist yet, skipping compress.');
    return { compressed: 0, bytesSaved: 0 };
  }

  const { raw } = getJournalFiles();
  const cutoff = cutoffDate(args.compressAfter);
  const toCompress = raw.filter(f => f.date < cutoff);

  if (toCompress.length === 0) {
    debug(`No files older than ${args.compressAfter} days to compress.`);
    return { compressed: 0, bytesSaved: 0 };
  }

  let compressed = 0;
  let bytesSaved = 0;

  for (const file of toCompress) {
    try {
      const { destPath, originalBytes, compressedBytes } = gzipFile(file.full);
      const saved = originalBytes - compressedBytes;
      bytesSaved += saved;
      compressed++;
      // Remove original after successful compression
      fs.unlinkSync(file.full);
      debug(`Compressed ${file.name}: ${(originalBytes/1024).toFixed(1)}KB → ${(compressedBytes/1024).toFixed(1)}KB (${Math.round((1 - compressedBytes/originalBytes)*100)}% reduction)`);
    } catch (err) {
      console.error(`[journal-maintenance] Failed to compress ${file.name}:`, err.message);
    }
  }

  if (compressed > 0) {
    log(`Compressed ${compressed} file(s), saved ${(bytesSaved/1024).toFixed(1)} KB`);
  }
  return { compressed, bytesSaved };
}

// ── Step 2: Git commit journal files ─────────────────────────────────────────
function runGitCommit() {
  const repoRoot = WORKSPACE;
  const today = new Date().toISOString().slice(0, 10);

  // Check it's a git repo
  try {
    execSync('git rev-parse --git-dir', { cwd: repoRoot, stdio: 'ignore' });
  } catch {
    debug('Workspace is not a git repo, skipping git commit.');
    return { committed: false, reason: 'not-a-git-repo' };
  }

  try {
    // Stage journal dir
    const addResult = spawnSync('git', ['add', 'journal/'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    if (addResult.status !== 0) {
      debug('git add failed:', addResult.stderr);
      return { committed: false, reason: 'git-add-failed' };
    }

    // Check if there's anything staged
    const diffResult = spawnSync('git', ['diff', '--cached', '--quiet'], {
      cwd: repoRoot,
    });

    if (diffResult.status === 0) {
      debug('No journal changes to commit.');
      return { committed: false, reason: 'nothing-to-commit' };
    }

    // Commit
    const commitResult = spawnSync(
      'git',
      ['commit', '-m', `chore: journal checkpoint ${today}`],
      { cwd: repoRoot, encoding: 'utf8' }
    );

    if (commitResult.status === 0) {
      log(`Git committed journal checkpoint for ${today}`);
      return { committed: true };
    } else {
      debug('git commit failed:', commitResult.stderr);
      return { committed: false, reason: 'git-commit-failed' };
    }
  } catch (err) {
    debug('Git step error:', err.message);
    return { committed: false, reason: err.message };
  }
}

// ── Step 3: Report ────────────────────────────────────────────────────────────
function runReport() {
  if (!fs.existsSync(JOURNAL_DIR)) {
    log('Journal directory does not exist yet.');
    return;
  }

  const { raw, compressed } = getJournalFiles();
  const allFiles = [...raw, ...compressed].sort((a, b) => a.date.localeCompare(b.date));

  if (allFiles.length === 0) {
    log('Journal is empty — no entries recorded yet.');
    return;
  }

  // Total size
  let totalBytes = 0;
  for (const f of allFiles) {
    try { totalBytes += fs.statSync(f.full).size; } catch {}
  }

  // Message count from raw files only (compressed need decompression)
  let totalMessages = 0;
  for (const f of raw) {
    totalMessages += countLines(f.full);
  }

  const oldest = allFiles[0].date;
  const newest = allFiles[allFiles.length - 1].date;
  const today = new Date().toISOString().slice(0, 10);

  // Coverage — days since oldest entry
  const daysSince = Math.round((Date.now() - new Date(oldest).getTime()) / 86400000);

  log('─── Journal Health Report ───────────────────────────────');
  log(`  Coverage:    ${oldest} → ${today} (${daysSince} days)`);
  log(`  Files:       ${raw.length} raw + ${compressed.length} compressed = ${allFiles.length} total`);
  log(`  Size:        ${(totalBytes / 1024).toFixed(1)} KB on disk`);
  log(`  Messages:    ${totalMessages.toLocaleString()} (raw files only)`);
  log(`  Oldest:      ${oldest}`);
  log(`  Newest:      ${newest}`);
  log(`  Compress at: >${args.compressAfter} days old`);
  log('────────────────────────────────────────────────────────');
}

// ── Main ──────────────────────────────────────────────────────────────────────
log(`Starting journal maintenance (${new Date().toISOString()})`);

if (args.reportOnly) {
  runReport();
  process.exit(0);
}

const compressResult = runCompress();
const gitResult = args.git ? runGitCommit() : { committed: false, reason: 'skipped' };
runReport();

log(`Done. compressed=${compressResult.compressed} git-committed=${gitResult.committed}`);
