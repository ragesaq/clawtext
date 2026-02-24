/**
 * Unit Tests for Temporal Decay
 */

import { describe, it, expect } from '../runner';
import {
  calculateDecayedScore,
  calculateRecencyBoost,
  applyTemporalDecay,
  calculateOptimalDecayRate,
  calculateFreshness,
  DEFAULT_DECAY_CONFIG
} from '../../lib/temporal-decay';

describe('Temporal Decay', () => {
  describe('calculateDecayedScore', () => {
    it('should not decay when disabled', () => {
      const score = calculateDecayedScore(1.0, 30, { enabled: false });
      expect(score).toBe(1.0);
    });

    it('should decay old memories', () => {
      const score = calculateDecayedScore(1.0, 30, { enabled: true });
      expect(score).toBeLessThan(1.0);
    });

    it('should respect minimum score', () => {
      const score = calculateDecayedScore(1.0, 365, { 
        enabled: true,
        minScore: 0.1
      });
      expect(score).toBeGreaterThanOrEqual(0.1);
    });

    it('should respect maximum age cap', () => {
      const score = calculateDecayedScore(1.0, 100, {
        enabled: true,
        maxAgeDays: 90,
        minScore: 0.1
      });
      expect(score).toBe(0.1);
    });

    it('should handle zero age', () => {
      const score = calculateDecayedScore(1.0, 0);
      // Should be close to original (small decay for same day)
      expect(score).toBeGreaterThan(0.9);
    });
  });

  describe('calculateRecencyBoost', () => {
    it('should boost today memories', () => {
      const boost = calculateRecencyBoost(0, { recencyBoost: true });
      expect(boost).toBe(1.3);
    });

    it('should boost recent memories', () => {
      const boost = calculateRecencyBoost(5, { recencyBoost: true });
      expect(boost).toBe(1.1);
    });

    it('should not boost old memories', () => {
      const boost = calculateRecencyBoost(30, { recencyBoost: true });
      expect(boost).toBe(1.0);
    });

    it('should not boost when disabled', () => {
      const boost = calculateRecencyBoost(0, { recencyBoost: false });
      expect(boost).toBe(1.0);
    });
  });

  describe('applyTemporalDecay', () => {
    it('should sort results by decayed score', () => {
      const results = [
        { id: '1', score: 0.9, path: 'memory/2026-02-20.md' }, // 3 days old
        { id: '2', score: 0.8, path: 'memory/2026-02-23.md' }, // today
      ];

      const decayed = applyTemporalDecay(results);

      // Recent result should be first after decay
      expect(decayed[0].id).toBe('2');
    });

    it('should include age information', () => {
      const results = [{ id: '1', score: 0.9 }];

      const decayed = applyTemporalDecay(results);

      expect(decayed[0].ageDays).toBeDefined();
      expect(decayed[0].originalScore).toBe(0.9);
    });
  });

  describe('calculateOptimalDecayRate', () => {
    it('should decrease rate for high frequency', () => {
      const rate1 = calculateOptimalDecayRate(10, 0.5);
      const rate2 = calculateOptimalDecayRate(1, 0.5);
      
      expect(rate1).toBeLessThan(rate2);
    });

    it('should decrease rate for high importance', () => {
      const rate1 = calculateOptimalDecayRate(1, 0.9);
      const rate2 = calculateOptimalDecayRate(1, 0.1);
      
      expect(rate1).toBeLessThan(rate2);
    });
  });

  describe('calculateFreshness', () => {
    it('should be high for recent memories', () => {
      const freshness = calculateFreshness(1, 0, 0.5);
      expect(freshness).toBeGreaterThan(0.8);
    });

    it('should be low for old memories', () => {
      const freshness = calculateFreshness(90, 0, 0.1);
      expect(freshness).toBeLessThan(0.5);
    });

    it('should increase with access count', () => {
      const freshness1 = calculateFreshness(30, 0, 0.5);
      const freshness2 = calculateFreshness(30, 10, 0.5);
      
      expect(freshness2).toBeGreaterThan(freshness1);
    });

    it('should be clamped to 0-1', () => {
      const freshness = calculateFreshness(0, 100, 1.0);
      expect(freshness).toBeLessThanOrEqual(1.0);
    });
  });
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { printResults } = await import('../runner');
  printResults();
}