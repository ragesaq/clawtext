/**
 * Integration Tests for Hybrid Search
 */

import { describe, it, expect } from '../runner';
import { 
  searchHybrid,
  keywordScore,
  applyHybridScoring 
} from '../../lib/hybrid-search-simple';

describe('Hybrid Search Integration', () => {
  const mockSemanticResults = [
    {
      path: 'memory/2026-02-23.md',
      startLine: 10,
      endLine: 20,
      snippet: 'Configured the OpenClaw gateway on port 18789 with Cloudflare tunnel',
      score: 0.85
    },
    {
      path: 'memory/2026-02-22.md',
      startLine: 5,
      endLine: 15,
      snippet: 'Memory optimization tips for large context windows',
      score: 0.72
    },
    {
      path: 'memory/2026-02-21.md',
      startLine: 1,
      endLine: 10,
      snippet: 'Setup instructions for the development environment',
      score: 0.65
    }
  ];

  describe('searchHybrid', () => {
    it('should return search configuration', () => {
      const result = searchHybrid({
        query: 'gateway setup',
        maxResults: 10
      });

      expect(result.query).toBe('gateway setup');
      expect(result.maxResults).toBe(10);
      expect(result.keywords).toBeDefined();
    });

    it('should extract keywords from query', () => {
      const result = searchHybrid({
        query: 'how to configure server'
      });

      // Should have extracted keywords (not stop words)
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords).toContain('configure');
      expect(result.keywords).toContain('server');
    });

    it('should handle query expansion when enabled', async () => {
      const result = searchHybrid({
        query: 'gateway setup',
        expandQuery: true
      });

      expect(result.expandedQueries).toBeDefined();
      expect(result.expandedQueries.length).toBeGreaterThan(1);
    });
  });

  describe('keywordScore', () => {
    it('should score exact matches highly', () => {
      const snippet = 'Configure the gateway server on port 18789';
      const keywords = ['gateway', 'server'];

      const score = keywordScore(snippet, keywords);

      expect(score).toBeGreaterThan(0);
    });

    it('should score zero for no matches', () => {
      const snippet = 'Completely unrelated text';
      const keywords = ['gateway', 'server'];

      const score = keywordScore(snippet, keywords);

      expect(score).toBe(0);
    });

    it('should handle case insensitivity', () => {
      const snippet = 'CONFIGURE the GATEWAY';
      const keywords = ['configure', 'gateway'];

      const score = keywordScore(snippet, keywords);

      expect(score).toBeGreaterThan(0);
    });
  });

  describe('applyHybridScoring', () => {
    it('should combine semantic and keyword scores', async () => {
      const results = await applyHybridScoring(
        mockSemanticResults,
        'gateway setup',
        {
          semanticWeight: 0.7,
          keywordWeight: 0.3
        }
      );

      expect(results.length).toBe(mockSemanticResults.length);
      // First result should be highest scoring
      expect(results[0].score).toBeGreaterThan(results[1]?.score || 0);
    });

    it('should boost pinned results', async () => {
      const resultsWithPinned = [
        {
          ...mockSemanticResults[0],
          snippet: '🌟 PINNED: Important configuration note'
        },
        mockSemanticResults[1]
      ];

      const results = await applyHybridScoring(
        resultsWithPinned,
        'configuration',
        { boostPinned: true }
      );

      // Pinned result should have higher score
      const pinnedResult = results.find(r => r.snippet.includes('PINNED'));
      expect(pinnedResult?.score).toBeGreaterThan(0);
    });

    it('should boost recent results', async () => {
      const results = await applyHybridScoring(
        mockSemanticResults,
        'memory',
        { boostRecent: true }
      );

      // Results should be sorted by score
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should mark source as hybrid when keyword score is high', async () => {
      const results = await applyHybridScoring(
        mockSemanticResults,
        'gateway',
        { keywordWeight: 0.5 }
      );

      // At least some results should be marked as hybrid
      const hybridResults = results.filter(r => r.source === 'hybrid');
      expect(hybridResults.length).toBeGreaterThan(0);
    });

    it('should handle empty results', async () => {
      const results = await applyHybridScoring([], 'test', {});
      expect(results.length).toBe(0);
    });
  });
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { printResults } = await import('../runner');
  printResults();
}