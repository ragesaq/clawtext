/**
 * Unit Tests for Query Expansion
 */

import { describe, it, expect, beforeEach, afterEach } from '../runner';
import {
  ruleBasedExpansion,
  generateAlternativePhrasings,
  expandQueryForSearch,
  testExpansionEffectiveness
} from '../../lib/query-expansion';

describe('Query Expansion', () => {
  describe('ruleBasedExpansion', () => {
    it('should expand "setup" queries', () => {
      const result = ruleBasedExpansion('gateway setup');
      expect(result).toContain('configuration');
      expect(result).toContain('installation');
    });

    it('should expand "error" queries', () => {
      const result = ruleBasedExpansion('memory error');
      expect(result).toContain('issue');
      expect(result).toContain('problem');
    });

    it('should expand "api" queries', () => {
      const result = ruleBasedExpansion('api endpoint');
      expect(result).toContain('interface');
      expect(result).toContain('service');
    });

    it('should always include original query', () => {
      const result = ruleBasedExpansion('custom query');
      expect(result).toContain('custom query');
    });

    it('should remove duplicates', () => {
      const result = ruleBasedExpansion('setup setup');
      // Should deduplicate
      const uniqueCount = new Set(result).size;
      expect(uniqueCount).toBe(result.length);
    });
  });

  describe('generateAlternativePhrasings', () => {
    it('should generate "how to" variations', () => {
      const result = generateAlternativePhrasings('how to configure');
      expect(result.some(r => r.includes('guide to'))).toBeTruthy();
      expect(result.some(r => r.includes('tutorial for'))).toBeTruthy();
    });

    it('should generate "best" variations', () => {
      const result = generateAlternativePhrasings('best practice');
      expect(result.some(r => r.includes('optimal'))).toBeTruthy();
      expect(result.some(r => r.includes('recommended'))).toBeTruthy();
    });

    it('should generate technical synonyms', () => {
      const result = generateAlternativePhrasings('server config');
      expect(result.some(r => r.includes('host'))).toBeTruthy();
    });

    it('should include original query', () => {
      const result = generateAlternativePhrasings('original query');
      expect(result).toContain('original query');
    });
  });

  describe('expandQueryForSearch', () => {
    it('should return array with rule method', async () => {
      const result = await expandQueryForSearch('test query', 'rule');
      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return array with hybrid method', async () => {
      const result = await expandQueryForSearch('test query', 'hybrid');
      expect(Array.isArray(result)).toBeTruthy();
    });

    it('should include original query in results', async () => {
      const query = 'specific test';
      const result = await expandQueryForSearch(query, 'rule');
      expect(result).toContain(query.toLowerCase());
    });
  });
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { printResults } = await import('../runner');
  printResults();
}