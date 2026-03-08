#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = __dirname;
const WORKSPACE = process.env.HOME ? path.join(process.env.HOME, '.openclaw/workspace') : path.join(PACKAGE_ROOT, '../..');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

console.log('ClawText Installer');
console.log('==================\n');

console.log(`Package root: ${PACKAGE_ROOT}`);
console.log(`Workspace:   ${WORKSPACE}`);

// 1. Ensure npm install done
console.log('\n[1/4] Installing dependencies...');
try {
  execSync('npm install', { cwd: PACKAGE_ROOT, stdio: 'inherit' });
  console.log('Dependencies installed.');
} catch (e) {
  console.error('npm install failed:', e.message);
  process.exit(1);
}

// 2. Build TypeScript
console.log('\n[2/4] Building TypeScript...');
try {
  execSync('npm run build', { cwd: PACKAGE_ROOT, stdio: 'inherit' });
  console.log('Build complete.');
} catch (e) {
  console.error('Build failed:', e.message);
  process.exit(1);
}

// 3. Ensure memory directories exist
console.log('\n[3/4] Ensuring memory directories...');
const memDirs = ['clusters', 'staging', 'review', 'review-actions', 'cache', 'log-archive', 'summarizer-queue'];
for (const d of memDirs) {
  ensureDir(path.join(WORKSPACE, 'memory', d));
}
console.log('Memory directories ready.');

// 4. Generate config snippet
console.log('\n[4/4] Generating OpenClaw config snippet...');
const configSnippet = {
  plugins: {
    allow: ['clawtext'],
    entries: {
      clawtext: { enabled: true }
    }
  },
  skills: {
    entries: {
      'clawtext-rag': { enabled: true }
    }
  }
};

const openclawJsonPath = path.join(WORKSPACE, 'openclaw.json');
let openclawJson = {};
if (fs.existsSync(openclawJsonPath)) {
  try {
    openclawJson = JSON.parse(fs.readFileSync(openclawJsonPath, 'utf8'));
  } catch (e) { /* ignore */ }
}

const merged = {
  ...openclawJson,
  ...configSnippet,
  plugins: { ...openclawJson.plugins, ...configSnippet.plugins },
  skills: { ...openclawJson.skills, ...configSnippet.skills }
};

fs.writeFileSync(openclawJsonPath, rJSON(merged) + '\n');
console.log(`Config written to: ${openclawJsonPath}`);

console.log('\n✅ ClawText installed successfully!');
console.log('\nNext steps:');
console.log('  - Run "npm run health" to check system status');
console.log('  - Run "npm run cache:stats" to inspect hot cache');
console.log('  - Restart OpenClaw gateway to activate the plugin');
console.log('  - Add a cron for "npm run health" to get regular status reports');
console.log('\nRecommended cron (daily health check):');
console.log('  0 9 * * * cd /path/to/clawtext && npm run health >> ~/.openclaw/workspace/memory/health-reports.log 2>&1');