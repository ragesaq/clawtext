#!/usr/bin/env node

/**
 * Gold Standard Post — ClawHub Publisher
 * 
 * Automates publishing skills to ClawHub from a seed artifact + clawhub.json
 * 
 * Usage:
 *   node scripts/publish-to-clawhub.js <skill-path> [--dry-run] [--no-auth]
 * 
 * Example:
 *   node scripts/publish-to-clawhub.js ../../repo/clawbridge --no-dry-run
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(label, msg) {
  console.log(`[${label}] ${msg}`);
}

function logError(msg) {
  console.error(`[ERROR] ${msg}`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const skillPath = args[0];
  const dryRun = !args.includes('--no-dry-run');
  const skipAuth = args.includes('--no-auth');

  if (!skillPath) {
    logError('Usage: publish-to-clawhub.js <skill-path> [--dry-run] [--no-auth]');
  }

  return { skillPath, dryRun, skipAuth };
}

function checkFile(filePath, name) {
  if (!fs.existsSync(filePath)) {
    logError(`Missing: ${name} at ${filePath}`);
  }
  return true;
}

function validateSkill(skillPath) {
  const absPath = path.resolve(skillPath);
  log('VALIDATE', `Checking skill at ${absPath}`);

  checkFile(path.join(absPath, 'clawhub.json'), 'clawhub.json');
  checkFile(path.join(absPath, 'README.md'), 'README.md');
  checkFile(path.join(absPath, 'package.json'), 'package.json');

  // Read clawhub.json to validate structure
  const clawhubData = JSON.parse(
    fs.readFileSync(path.join(absPath, 'clawhub.json'), 'utf8')
  );

  if (!clawhubData.name) logError('clawhub.json: missing "name" field');
  if (!clawhubData.version) logError('clawhub.json: missing "version" field');
  if (!clawhubData.title) logError('clawhub.json: missing "title" field');
  if (!clawhubData.description) logError('clawhub.json: missing "description" field');

  log('VALIDATE', `✓ Skill metadata valid (${clawhubData.name} v${clayhub.version})`);
  return absPath;
}

function checkAuth(skipAuth) {
  if (skipAuth) {
    log('AUTH', 'Skipping authentication check (--no-auth)');
    return;
  }

  try {
    execSync('clawhub whoami', { stdio: 'pipe' });
    log('AUTH', '✓ Authenticated');
  } catch (e) {
    logError('Not authenticated. Run: clayhub login');
  }
}

function publishSkill(skillPath, dryRun) {
  if (dryRun) {
    log('PUBLISH', '[DRY RUN] Would execute: clawhub publish ' + skillPath);
    return;
  }

  log('PUBLISH', `Publishing to ClawHub: ${skillPath}`);

  try {
    const output = execSync(`clawhub publish "${skillPath}" --no-input`, {
      encoding: 'utf8',
    });

    log('PUBLISH', '✓ Published successfully');
    console.log('\n' + output);
  } catch (e) {
    logError(`ClawHub publish failed:\n${e.message}`);
  }
}

function main() {
  const { skillPath, dryRun, skipAuth } = parseArgs();

  log('START', `Gold Standard Post → ClawHub Publisher`);
  log('MODE', dryRun ? 'DRY RUN (no changes)' : 'LIVE PUBLISH');

  const absPath = validateSkill(skillPath);
  checkAuth(skipAuth);
  publishSkill(absPath, dryRun);

  log('DONE', 'Publish workflow complete');
  if (dryRun) {
    log('NEXT', 'Run with --no-dry-run to actually publish');
  }
}

main();
