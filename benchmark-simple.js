#!/usr/bin/env node
/**
 * Simple Clawtext Benchmark Script
 * 
 * Run this to compare OpenClaw default vs Clawtext-enhanced performance
 * 
 * Usage:
 *   node benchmark-simple.js
 * 
 * Requirements:
 *   - OpenClaw installed and running
 *   - Memory files in ~/.openclaw/workspace/memory/
 *   - Node.js with performance API
 */

import { performance } from 'node:perf_hooks';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Mock implementations - replace with your actual implementations
async function mockDefaultSearch(query, memories) {
  // Simulate OpenClaw's semantic search
  return memories
    .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);
}

async function mockClawtextSearch(query, memories, projectId = null) {
  // Simulate Clawtext's hybrid search
  const keywordResults = memories
    .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
    .map(m => ({ ...m, score: 0.3 }));
  
  const semanticResults = memories
    .filter(m => m.metadata?.project === projectId || !projectId)
    .map(m => ({ ...m, score: 0.7 }));
  
  // Combine and sort by score
  const allResults = [...keywordResults, ...semanticResults];
  const seen = new Set();
  const uniqueResults = allResults.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  
  return uniqueResults
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 10);
}

async function loadTestMemories() {
  const memoryDir = join(process.env.HOME, '.openclaw', 'workspace', 'memory');
  const files = await readdir(memoryDir).catch(() => []);
  
  const memories = [];
  let count = 0;
  
  for (const file of files.slice(0, 100)) { // Limit for demo
    if (file.endsWith('.md')) {
      const content = await readFile(join(memoryDir, file), 'utf8').catch(() => '');
      const projectMatch = content.match(/project:\s*(.+)/);
      
      memories.push({
        id: file,
        content: content.slice(0, 500), // First 500 chars
        metadata: {
          project: projectMatch ? projectMatch[1].trim() : 'default',
          confidence: Math.random(),
        },
      });
      count++;
    }
  }
  
  console.log(`📁 Loaded ${count} memory files`);
  return memories;
}

async function benchmarkSearch(memories) {
  const testQueries = [
    'memory',
    'project',
    'configuration',
    'tool',
    'session',
    'context',
    'plugin',
    'extension',
    'performance',
    'search',
  ];
  
  const results = [];
  
  for (const query of testQueries) {
    console.log(`  Testing query: "${query}"`);
    
    // Default search
    const defaultStart = performance.now();
    const defaultResults = await mockDefaultSearch(query, memories);
    const defaultTime = performance.now() - defaultStart;
    
    // Clawtext search
    const clawtextStart = performance.now();
    const clawtextResults = await mockClawtextSearch(query, memories, 'default');
    const clawtextTime = performance.now() - clawtextStart;
    
    const speedup = defaultTime > 0 ? defaultTime / clawtextTime : 0;
    
    results.push({
      query,
      default: { time: defaultTime, results: defaultResults.length },
      clawtext: { time: clawtextTime, results: clawtextResults.length },
      speedup: Math.max(speedup, 0.1).toFixed(2),
    });
  }
  
  return results;
}

async function benchmarkSessionStart(memories) {
  console.log('\n⏱️  Benchmarking Session Start...');
  
  // Default: Linear search through all memories
  const defaultStart = performance.now();
  const defaultContext = memories.filter(m => m.metadata.project === 'default');
  const defaultTime = performance.now() - defaultStart;
  
  // Clawtext: Pre-filtered cluster
  const clawtextStart = performance.now();
  const clawtextContext = memories.filter(m => 
    m.metadata.project === 'default' && 
    m.metadata.confidence >= 0.7
  );
  const clawtextTime = performance.now() - clawtextStart;
  
  const speedup = defaultTime > 0 ? defaultTime / clawtextTime : 0;
  
  return {
    default: { time: defaultTime, memories: defaultContext.length },
    clawtext: { time: clawtextTime, memories: clawtextContext.length },
    speedup: Math.max(speedup, 0.1).toFixed(2),
    tokenCount: {
      default: defaultContext.reduce((sum, m) => sum + m.content.length / 4, 0),
      clawtext: clawtextContext.reduce((sum, m) => sum + m.content.length / 4, 0),
    }
  };
}

function printResults(searchResults, sessionResults) {
  console.log('\n📊 BENCHMARK RESULTS');
  console.log('='.repeat(50));
  
  console.log('\n🔍 SEARCH PERFORMANCE');
  console.log('-' .repeat(50));
  searchResults.forEach(r => {
    console.log(`  "${r.query}"`);
    console.log(`    Default: ${r.default.time.toFixed(1)}ms (${r.default.results} results)`);
    console.log(`    Clawtext: ${r.clawtext.time.toFixed(1)}ms (${r.clawtext.results} results)`);
    console.log(`    Speedup: ${r.speedup}x`);
  });
  
  const avgSpeedup = searchResults.reduce((sum, r) => sum + parseFloat(r.speedup), 0) / searchResults.length;
  console.log(`\n  Average search speedup: ${avgSpeedup.toFixed(2)}x`);
  
  console.log('\n🚀 SESSION START PERFORMANCE');
  console.log('-' .repeat(50));
  console.log(`  Default: ${sessionResults.default.time.toFixed(1)}ms (${sessionResults.default.memories} memories)`);
  console.log(`  Clawtext: ${sessionResults.clawtext.time.toFixed(1)}ms (${sessionResults.clawtext.memories} memories)`);
  console.log(`  Speedup: ${sessionResults.speedup}x`);
  
  console.log('\n💰 TOKEN EFFICIENCY');
  console.log('-' .repeat(50));
  console.log(`  Default context: ${sessionResults.tokenCount.default.toFixed(0)} tokens`);
  console.log(`  Clawtext context: ${sessionResults.tokenCount.clawtext.toFixed(0)} tokens`);
  console.log(`  Token reduction: ${(100 - (sessionResults.tokenCount.clawtext / sessionResults.tokenCount.default * 100)).toFixed(1)}%`);
  
  console.log('\n🎯 KEY PERFORMANCE INDICATORS');
  console.log('-' .repeat(50));
  console.log(`  Target Session Start: <100ms → ${sessionResults.clawtext.time < 100 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Target Search Speedup: >5x → ${avgSpeedup > 5 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Target Token Reduction: >10% → ${(100 - (sessionResults.tokenCount.clawtext / sessionResults.tokenCount.default * 100)) > 10 ? '✅ PASS' : '❌ FAIL'}`);
}

async function main() {
  console.log('🚀 Clawtext Simple Benchmark');
  console.log('='.repeat(50));
  console.log('\n⚠️  NOTE: This uses MOCK implementations');
  console.log('   For accurate results, replace mock functions with your actual implementations\n');
  
  // Load test data
  const memories = await loadTestMemories();
  if (memories.length === 0) {
    console.log('❌ No memory files found. Please ensure you have memory files in ~/.openclaw/workspace/memory/');
    console.log('   Create some test memories or run with actual implementations.');
    return;
  }
  
  // Run benchmarks
  console.log(`\n📈 Benchmarking with ${memories.length} memories...`);
  
  const searchResults = await benchmarkSearch(memories);
  const sessionResults = await benchmarkSessionStart(memories);
  
  // Print results
  printResults(searchResults, sessionResults);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-' .repeat(50));
  
  if (sessionResults.speedup < 2) {
    console.log('  1. Add project IDs to memory files for better clustering');
    console.log('     Format: project: your-project-name');
  }
  
  if (parseFloat(sessionResults.speedup) > 10) {
    console.log('  1. ✅ Excellent performance! Clawtext is working well for your setup.');
  }
  
  console.log('\n📝 NEXT STEPS');
  console.log('-' .repeat(50));
  console.log('  1. Replace mock functions with your actual implementations');
  console.log('  2. Run with your real workload (not just test queries)');
  console.log('  3. Monitor production performance over time');
  console.log('  4. Adjust confidence threshold if context quality is low');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('❌ Benchmark failed:', err);
    process.exit(1);
  });
}

export {
  mockDefaultSearch,
  mockClawtextSearch,
  loadTestMemories,
  benchmarkSearch,
  benchmarkSessionStart,
  printResults,
};