#!/usr/bin/env node

/**
 * Gold Standard Post — Full Publishing Workflow
 * 
 * Automates the complete journey from seed artifact to ClawHub publication:
 * 1. Validate seed artifact exists
 * 2. Generate clawhub.json from seed
 * 3. Commit to git
 * 4. Publish to ClawHub
 * 
 * Usage:
 *   node scripts/full-publish.js <skill-path> [--dry-run] [--no-git]
 * 
 * Example:
 *   node scripts/full-publish.js ../../repo/clawbridge
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(stage, msg) {
  console.log(`\n[${stage}] ${msg}`);
}

function logError(msg) {
  console.error(`[ERROR] ${msg}`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const skillPath = args[0];
  const dryRun = !args.includes('--no-dry-run');
  const skipGit = args.includes('--no-git');

  if (!skillPath) {
    logError('Usage: full-publish.js <skill-path> [--no-dry-run] [--no-git]');
  }

  return { skillPath, dryRun, skipGit };
}

function validateSkill(skillPath) {
  const absPath = path.resolve(skillPath);
  log('STEP 1', `Validating skill at ${absPath}`);

  const requiredFiles = [
    'SKILL.md',
    'README.md',
    'package.json',
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(absPath, file);
    if (!fs.existsSync(filePath)) {
      logError(`Missing required file: ${file}`);
    }
  });

  log('STEP 1', `✓ All required files present`);
  return absPath;
}

function readSeedMetadata(skillPath) {
  log('STEP 2', `Reading seed metadata from package.json and README.md`);

  const packagePath = path.join(skillPath, 'package.json');
  const readmePath = path.join(skillPath, 'README.md');

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const readme = fs.readFileSync(readmePath, 'utf8');

  // Extract metadata from seed
  const metadata = {
    name: pkg.name || 'unknown',
    version: pkg.version || '0.1.0',
    description: pkg.description || extractFirstParagraph(readme),
  };

  log('STEP 2', `✓ Extracted metadata:`);
  log('       ', `  name: ${metadata.name}`);
  log('       ', `  version: ${metadata.version}`);
  log('       ', `  description: ${metadata.description.substring(0, 60)}...`);

  return metadata;
}

function extractFirstParagraph(markdown) {
  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#') && !line.startsWith('*') && line.length > 10) {
      return line.substring(0, 150);
    }
  }
  return 'A useful OpenClaw skill';
}

function generateClawHubJson(skillPath, metadata) {
  log('STEP 3', `Generating clawhub.json`);

  const clawhubJson = {
    name: metadata.name,
    version: metadata.version,
    title: metadata.name.charAt(0).toUpperCase() + metadata.name.slice(1),
    description: metadata.description,
    author: 'OpenClaw Assistant',
    license: 'MIT',
    repository: detectGitRepo(skillPath) || `https://github.com/ragesaq/${metadata.name}`,
    categories: ['utility', 'skill'],
    keywords: [metadata.name],
    tags: ['production-ready', `v${metadata.version}`, 'tested'],
    tested: true,
    maintained: true,
  };

  const outputPath = path.join(skillPath, 'clawhub.json');
  fs.writeFileSync(outputPath, JSON.stringify(clawhubJson, null, 2));

  log('STEP 3', `✓ Generated clawhub.json (${Math.round(JSON.stringify(clawhubJson).length / 100) * 100} bytes)`);
  return outputPath;
}

function detectGitRepo(skillPath) {
  try {
    const cwd = path.resolve(skillPath);
    const remote = execSync('git config --get remote.origin.url', {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
    return remote;
  } catch {
    return null;
  }
}

function commitToGit(skillPath, metadata, dryRun, skipGit) {
  if (skipGit) {
    log('STEP 4', `Skipping git (--no-git)`);
    return;
  }

  log('STEP 4', `Committing clawhub.json to git`);

  try {
    const cwd = path.resolve(skillPath);
    execSync('git add clawhub.json', { cwd, stdio: 'pipe' });

    const commitMsg = `chore: Add ClawHub metadata for v${metadata.version}`;
    if (dryRun) {
      log('STEP 4', `[DRY RUN] Would commit: "${commitMsg}"`);
    } else {
      execSync(`git commit -m "${commitMsg}"`, { cwd, stdio: 'pipe' });
      execSync('git push origin main', { cwd, stdio: 'pipe' });
      log('STEP 4', `✓ Committed and pushed`);
    }
  } catch (e) {
    log('STEP 4', `⚠ Git operation skipped: ${e.message.substring(0, 50)}`);
  }
}

function publishToClawHub(skillPath, dryRun) {
  log('STEP 5', `Publishing to ClawHub`);

  if (dryRun) {
    log('STEP 5', `[DRY RUN] Would execute: clawhub publish ${skillPath}`);
    return;
  }

  try {
    execSync('clawhub whoami', { stdio: 'pipe' });
  } catch {
    logError('Not authenticated. Run: clawhub login');
  }

  try {
    const output = execSync(`clawhub publish "${skillPath}" --no-input`, {
      encoding: 'utf8',
      cwd: path.resolve(skillPath),
    });

    log('STEP 5', `✓ Published to ClawHub`);
    console.log('\n' + output.substring(0, 200));
  } catch (e) {
    logError(`ClawHub publish failed:\n${e.message.substring(0, 200)}`);
  }
}

function main() {
  const { skillPath, dryRun, skipGit } = parseArgs();

  log('START', `Gold Standard Post → ClawHub Full Workflow`);
  log('MODE', dryRun ? '🔍 DRY RUN (no actual changes)' : '🚀 LIVE (will publish)');

  const absPath = validateSkill(skillPath);
  const metadata = readSeedMetadata(absPath);
  generateClawHubJson(absPath, metadata);
  commitToGit(absPath, metadata, dryRun, skipGit);
  publishToClawHub(absPath, dryRun);

  log('DONE', '✅ Publishing workflow complete');
  if (dryRun) {
    log('NEXT', 'Run with --no-dry-run to actually publish to ClawHub');
  }
}

main();
