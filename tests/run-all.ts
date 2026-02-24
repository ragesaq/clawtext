#!/usr/bin/env node
/**
 * Clawtext Test Runner
 * 
 * Runs all test suites
 */

import { describe, it, expect, printResults } from './runner';

console.log('🧪 Clawtext Test Suite');
console.log('='.repeat(50));

// Import all test files
const testFiles = [
  './unit/query-expansion.test.ts',
  './unit/rrf.test.ts',
  './integration/hybrid-search.test.ts'
];

// Load and run tests
for (const file of testFiles) {
  try {
    await import(file);
  } catch (error) {
    console.error(`Failed to load ${file}:`, error);
  }
}

// Print results
printResults();