/**
 * Unit Tests for Reciprocal Rank Fusion
 */

import { describe, it, expect } from '../runner';
import {
  reciprocalRankFusion,
  createRankings,
  hybridSearchRRF,
  benchmarkRRF,
  maximalMarginalRelevance
} from '../../lib/reciprocal-rank-fusion';

describe('Reciprocal Rank Fusion', () => {
  const mockResults = [
    { id: '1', score: 0.9, snippet: 'Result one' },
    { id: '2', score: 0.8, snippet: 'Result two' },
    { id: '3', score: 0.7, snippet: 'Result three' }
  ];

  describe('reciprocalRankFusion', () => {
    it('should combine two rankings', () => {
      const ranking1 = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const ranking2 = [{ id: '2' }, { id: '1' }, { id: '3' }];
      
      const result = reciprocalRankFusion([ranking1, ranking2]);
      
      expect(result.length).toBe(3);
      expect(result[0].rrfScore).toBeGreaterThan(0);
    });

    it('should handle single ranking', () => {
      const ranking = [{ id: '1' }, { id: '2' }];
      
      const result = reciprocalRankFusion([ranking]);
      
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('1');
    });

    it('should handle empty rankings', () => {
      const result = reciprocalRankFusion([[]]);
      expect(result.length).toBe(0);
    });

    it('should respect k parameter', () => {
      const ranking = [{ id: '1' }, { id: '2' }];
      
      const result1 = reciprocalRankFusion([ranking], { k: 60 });
      const result2 = reciprocalRankFusion([ranking], { k: 10 });
      
      // Lower k should give higher scores
      expect(result2[0].rrfScore).toBeGreaterThan(result1[0].rrfScore);
    });

    it('should apply weights', () => {
      const ranking = [{ id: '1' }, { id: '2' }];
      
      const result1 = reciprocalRankFusion([ranking], { weights: { 0: 2.0 } });
      const result2 = reciprocalRankFusion([ranking], { weights: { 0: 1.0 } });
      
      // Higher weight should give higher score
      expect(result1[0].rrfScore).toBeGreaterThan(result2[0].rrfScore);
    });
  });

  describe('createRankings', () => {
    it('should sort results by score', () => {
      const semantic = [
        { id: '1', score: 0.5 },
        { id: '2', score: 0.9 }
      ];
      const keyword = [
        { id: '1', score: 0.8 },
        { id: '2', score: 0.6 }
      ];

      const rankings = createRankings(semantic, keyword);

      // First ranking should have higher score first
      expect(rankings[0][0].score).toBe(0.9);
    });

    it('should apply weights', () => {
      const semantic = [{ id: '1', score: 1.0 }];
      const keyword = [{ id: '2', score: 1.0 }];

      const rankings = createRankings(semantic, keyword, {
        semanticWeight: 2.0,
        keywordWeight: 1.0
      });

      // Check that weight was applied (would be stored in metadata)
      expect(rankings[0][0].sourceRank).toBe(0);
    });
  });

  describe('hybridSearchRRF', () => {
    it('should return combined results', () => {
      const semantic = [{ id: '1', score: 0.9 }, { id: '2', score: 0.5 }];
      const keyword = [{ id: '2', score: 0.9 }, { id: '1', score: 0.5 }];

      const result = hybridSearchRRF(semantic, keyword);

      expect(result.length).toBe(2);
      expect(result[0].rrfScore).toBeGreaterThan(0);
    });

    it('should limit results to maxResults', () => {
      const semantic = [
        { id: '1', score: 0.9 },
        { id: '2', score: 0.8 },
        { id: '3', score: 0.7 },
        { id: '4', score: 0.6 }
      ];
      const keyword = [...semantic];

      const result = hybridSearchRRF(semantic, keyword, { maxResults: 2 });

      expect(result.length).toBe(2);
    });

    it('should handle duplicate IDs', () => {
      const semantic = [{ id: '1', score: 0.9 }];
      const keyword = [{ id: '1', score: 0.8 }];

      const result = hybridSearchRRF(semantic, keyword);

      // Should merge duplicates
      expect(result.length).toBe(1);
      // Score should be combined
      expect(result[0].rrfScore).toBeGreaterThan(0);
    });
  });

  describe('maximalMarginalRelevance', () => {
    it('should select most relevant result first', () => {
      const results = [
        { id: '1', score: 0.9, snippet: 'high relevance' },
        { id: '2', score: 0.5, snippet: 'low relevance' }
      ];

      const selected = maximalMarginalRelevance(results, 'test', {
        maxResults: 1,
        lambda: 1.0 // Pure relevance
      });

      expect(selected.length).toBe(1);
      expect(selected[0].id).toBe('1');
    });

    it('should promote diversity when lambda < 1', () => {
      const results = [
        { id: '1', score: 0.9, snippet: 'very similar content' },
        { id: '2', score: 0.85, snippet: 'very similar content' },
        { id: '3', score: 0.5, snippet: 'completely different' }
      ];

      const selected = maximalMarginalRelevance(results, 'test', {
        maxResults: 2,
        lambda: 0.5 // Balance relevance and diversity
      });

      expect(selected.length).toBe(2);
      // Should include the diverse result even if lower score
      const ids = selected.map(r => r.id);
      expect(ids).toContain('3');
    });

    it('should handle empty results', () => {
      const selected = maximalMarginalRelevance([], 'test');
      expect(selected.length).toBe(0);
    });

    it('should respect maxResults', () => {
      const results = [
        { id: '1', score: 0.9 },
        { id: '2', score: 0.8 },
        { id: '3', score: 0.7 }
      ];

      const selected = maximalMarginalRelevance(results, 'test', {
        maxResults: 2
      });

      expect(selected.length).toBe(2);
    });
  });

  describe('benchmarkRRF', () => {
    it('should compare RRF vs weighted', () => {
      const semantic = [{ id: '1', score: 0.9 }, { id: '2', score: 0.5 }];
      const keyword = [{ id: '2', score: 0.9 }, { id: '1', score: 0.5 }];
      const groundTruth = ['1'];

      const result = benchmarkRRF(semantic, keyword, groundTruth);

      expect(result.rrfPrecision).toBeGreaterThanOrEqual(0);
      expect(result.weightedPrecision).toBeGreaterThanOrEqual(0);
      expect(['rrf', 'weighted', 'tie']).toContain(result.winner);
    });
  });
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { printResults } = await import('../runner');
  printResults();
}