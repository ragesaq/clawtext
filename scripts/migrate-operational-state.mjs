#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const workspacePath = path.join(process.env.HOME || '', '.openclaw', 'workspace');
const legacyDir = path.join(workspacePath, 'memory', 'operational');
const stateDir = path.join(workspacePath, 'state', 'clawtext', 'prod', 'operational');
const archiveRoot = path.join(workspacePath, 'memory', 'archive');
const stamp = new Date().toISOString().slice(0, 10);
const backupDir = path.join(archiveRoot, `operational-legacy-${stamp}`);

const report = {
  copiedFiles: 0,
  skippedSame: 0,
  conflicts: 0,
  mergedLogs: {},
  rebuiltIndexEntries: 0,
  signatures: 0,
  archivedLegacyDir: null,
  createdCompatSymlink: false,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function sameFileContent(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  return fs.readFileSync(a).equals(fs.readFileSync(b));
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function copyTreeSubset(subdir) {
  const src = path.join(legacyDir, subdir);
  if (!fs.existsSync(src)) return;
  for (const file of walkFiles(src)) {
    const rel = path.relative(legacyDir, file);
    const dest = path.join(stateDir, rel);
    ensureDir(path.dirname(dest));
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(file, dest);
      report.copiedFiles += 1;
    } else if (sameFileContent(file, dest)) {
      report.skippedSame += 1;
    } else {
      const conflictDest = `${dest}.legacy-${stamp}`;
      if (!fs.existsSync(conflictDest)) {
        fs.copyFileSync(file, conflictDest);
      }
      report.conflicts += 1;
    }
  }
}

function mergeJsonArrayFile(name) {
  const src = path.join(legacyDir, name);
  const dest = path.join(stateDir, name);
  const a = readJson(src, []);
  const b = readJson(dest, []);
  const merged = [];
  const seen = new Set();
  for (const item of [...a, ...b]) {
    const key = JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  if (merged.length) {
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, JSON.stringify(merged, null, 2) + '\n');
  }
  report.mergedLogs[name] = merged.length;
}

function mergeSignatures() {
  const src = readJson(path.join(legacyDir, 'signatures.json'), {});
  const destPath = path.join(stateDir, 'signatures.json');
  const dst = readJson(destPath, {});
  const out = { ...dst };
  for (const [key, values] of Object.entries(src)) {
    const current = Array.isArray(out[key]) ? out[key] : [];
    const merged = [...new Set([...current, ...(Array.isArray(values) ? values : [])])];
    out[key] = merged;
  }
  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, JSON.stringify(out, null, 2) + '\n');
  report.signatures = Object.keys(out).length;
}

function copyIfMissing(name) {
  const src = path.join(legacyDir, name);
  const dest = path.join(stateDir, name);
  if (!fs.existsSync(src)) return;
  ensureDir(path.dirname(dest));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    report.copiedFiles += 1;
  } else if (sameFileContent(src, dest)) {
    report.skippedSame += 1;
  }
}

function mergeJsonl(name) {
  const src = path.join(legacyDir, name);
  const dest = path.join(stateDir, name);
  const lines = [];
  const seen = new Set();
  for (const file of [src, dest]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
    }
  }
  if (lines.length) {
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, lines.join('\n') + '\n');
  }
}

function inferStatus(relPath, parsed) {
  if (parsed?.status) return parsed.status;
  if (relPath.startsWith('raw/')) return 'raw';
  if (relPath.startsWith('candidates/')) return 'candidate';
  if (relPath.startsWith('patterns/')) return 'reviewed';
  if (relPath.startsWith('archive/')) return 'archived';
  return 'raw';
}

function rebuildIndex() {
  const index = {};
  for (const root of ['raw', 'candidates', 'patterns', 'archive']) {
    const dir = path.join(stateDir, root);
    if (!fs.existsSync(dir)) continue;
    for (const file of walkFiles(dir).filter((p) => p.endsWith('.yaml'))) {
      const rel = path.relative(stateDir, file);
      try {
        const parsed = yaml.load(fs.readFileSync(file, 'utf8')) || {};
        const patternKey = parsed.patternKey;
        if (!patternKey) continue;
        index[patternKey] = {
          patternKey,
          filePath: rel,
          status: inferStatus(rel, parsed),
          type: parsed.type || 'error-pattern',
          scope: parsed.scope || 'global',
          recurrenceCount: parsed.recurrenceCount || 1,
          lastSeenAt: parsed.lastSeenAt || parsed.updatedAt || parsed.createdAt || new Date().toISOString(),
        };
      } catch {
        // keep going
      }
    }
  }
  fs.writeFileSync(path.join(stateDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  report.rebuiltIndexEntries = Object.keys(index).length;
}

function archiveLegacyAndLink() {
  ensureDir(archiveRoot);
  if (!fs.existsSync(legacyDir)) return;
  const stat = fs.lstatSync(legacyDir);
  if (stat.isSymbolicLink()) return;
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  fs.renameSync(legacyDir, backupDir);
  report.archivedLegacyDir = backupDir;
  fs.symlinkSync(path.relative(path.dirname(legacyDir), stateDir), legacyDir, 'dir');
  report.createdCompatSymlink = true;
}

function main() {
  if (!fs.existsSync(legacyDir)) {
    console.log(JSON.stringify({ ok: true, message: 'No legacy operational dir found', report }, null, 2));
    return;
  }

  ensureDir(stateDir);

  for (const dir of ['raw', 'candidates', 'patterns', 'archive', 'maintenance-reports']) {
    copyTreeSubset(dir);
  }

  copyIfMissing('maintenance-schedule.json');
  mergeJsonArrayFile('review-log.json');
  mergeJsonArrayFile('promotion-log.json');
  mergeJsonArrayFile('maintenance-run-log.json');
  mergeJsonl('change-breadcrumbs.jsonl');
  mergeSignatures();
  rebuildIndex();
  archiveLegacyAndLink();

  console.log(JSON.stringify({ ok: true, report }, null, 2));
}

main();
