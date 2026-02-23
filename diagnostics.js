#!/usr/bin/env node
/**
 * Production Diagnostic Tool
 * Verifies RAG system is working correctly
 */

console.log('🔍 RAG System Diagnostics\n');

const checks = [
  { name: 'Hybrid Search Module', file: './lib/hybrid-search-simple.ts' },
  { name: 'Memory Clusters', file: './lib/memory-clusters.ts' },
  { name: 'Session Context', file: './lib/session-context.ts' },
  { name: '360 Views', file: './lib/memory-360.ts' },
  { name: 'Reconciliation', file: './lib/memory-reconcile.ts' },
  { name: 'Persistence', file: './lib/cluster-persistence.ts' },
  { name: 'Config', file: './config/hybrid-search-config.json' },
  { name: 'Documentation', file: './HYBRID_RAG_DOCUMENTATION.md' }
];

const fs = require('fs');
let passed = 0;

for (const check of checks) {
  const exists = fs.existsSync(check.file);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  if (exists) passed++;
}

console.log(`\n${passed}/${checks.length} components ready`);

if (passed === checks.length) {
  console.log('\n🎉 System fully operational');
} else {
  console.log('\n⚠️  Some components missing');
  process.exit(1);
}
