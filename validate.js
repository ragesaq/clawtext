#!/usr/bin/env node
/**
 * Quick Validation Script
 * 
 * Validates that Clawtext is working correctly
 * Run this after installation to verify everything is set up
 */

import { existsSync } from 'fs';
import { join } from 'path';

const checks = [];

function check(name, test) {
  try {
    const result = test();
    checks.push({ name, passed: result, error: null });
    return result;
  } catch (error) {
    checks.push({ name, passed: false, error: error.message });
    return false;
  }
}

console.log('🔍 Clawtext Quick Validation\n');

// Check 1: Core files exist
check('Core library files exist', () => {
  const files = [
    'lib/hybrid-search-simple.ts',
    'lib/memory-clusters.ts',
    'lib/session-context.ts',
    'lib/query-expansion.ts',
    'lib/llm-rerank.ts',
    'lib/reciprocal-rank-fusion.ts'
  ];
  return files.every(f => existsSync(f));
});

// Check 2: Configuration exists
check('Configuration files exist', () => {
  return existsSync('config/hybrid-search-config.json');
});

// Check 3: Documentation exists
check('Documentation exists', () => {
  return existsSync('README.md') && 
         existsSync('docs/OPENCLAW_INTEGRATION.md') &&
         existsSync('docs/QUICK_START.md');
});

// Check 4: TypeScript config exists
check('TypeScript configuration exists', () => {
  return existsSync('tsconfig.json');
});

// Check 5: Extension file exists
check('Extension file exists', () => {
  return existsSync('lib/clawtext-extension.ts');
});

// Check 6: Test suite exists
check('Test suite exists', () => {
  return existsSync('tests/runner.ts') &&
         existsSync('tests/unit/query-expansion.test.ts');
});

// Check 7: Package.json is valid
check('Package.json is valid', () => {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    return pkg.name === 'clawtext' && pkg.scripts.test;
  } catch {
    return false;
  }
});

// Print results
console.log('Validation Results:');
console.log('-'.repeat(40));

let passed = 0;
let failed = 0;

for (const check of checks) {
  const icon = check.passed ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
  if (!check.passed && check.error) {
    console.log(`   Error: ${check.error}`);
  }
  
  if (check.passed) passed++;
  else failed++;
}

console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n🎉 Clawtext is properly installed and ready to use!');
  console.log('\nNext steps:');
  console.log('  1. Run tests: npm test');
  console.log('  2. Run benchmark: npm run benchmark-simple');
  console.log('  3. Install extension: ./install.sh');
} else {
  console.log('\n⚠️  Some validation checks failed.');
  console.log('Please ensure you cloned the repository correctly.');
  process.exit(1);
}

// Helper function
function readFileSync(path, encoding) {
  const { readFileSync: read } = await import('fs');
  return read(path, encoding);
}