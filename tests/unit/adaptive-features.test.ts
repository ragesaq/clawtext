/**
 * Unit Tests for Adaptive Feature Selection
 */

import { describe, it, expect } from '../runner';
import {
  analyzeQuery,
  selectFeatures,
  DEFAULT_ADAPTIVE_CONFIG,
  AdaptiveLearning
} from '../../lib/adaptive-features';

describe('Adaptive Feature Selection', () => {
  describe('analyzeQuery', () => {
    it('should identify simple queries', () => {
      const result = analyzeQuery('gateway setup');
      expect(result.complexity).toBe('simple');
    });

    it('should identify complex queries', () => {
      const result = analyzeQuery('how do I configure the OpenClaw gateway with Cloudflare tunnel for external access');
      expect(result.complexity).toBe('complex');
    });

    it('should detect technical terms', () => {
      const result = analyzeQuery('api endpoint configuration');
      expect(result.domainSpecificity).toBeGreaterThan(0.5);
    });

    it('should detect ambiguity', () => {
      const result = analyzeQuery('how to do that thing with the stuff');
      expect(result.ambiguity).toBeGreaterThan(0.3);
    });

    it('should calculate specificity', () => {
      const result = analyzeQuery('server configuration port 8080');
      expect(result.specificity).toBeGreaterThan(0.5);
    });
  });

  describe('selectFeatures', () => {
    it('should disable features for good results', () => {
      const results = [
        { score: 0.9 }, { score: 0.85 }, { score: 0.8 },
        { score: 0.75 }, { score: 0.7 }
      ];
      
      const decision = selectFeatures('gateway setup', results, {
        enableQueryExpansion: 'auto',
        enableLLMReranking: 'auto'
      });
      
      expect(decision.useQueryExpansion).toBeFalsy();
      expect(decision.useLLMReranking).toBeFalsy();
    });

    it('should enable expansion for few results', () => {
      const results = [{ score: 0.5 }];
      
      const decision = selectFeatures('test query', results, {
        enableQueryExpansion: 'auto',
        minResultsForEscalation: 3
      });
      
      expect(decision.useQueryExpansion).toBeTruthy();
    });

    it('should enable expansion for high-recall queries', () => {
      const results = [
        { score: 0.7 }, { score: 0.6 }, { score: 0.5 }
      ];
      
      const decision = selectFeatures('how do I do something with that thing', results, {
        enableQueryExpansion: 'auto'
      });
      
      // Ambiguous queries should trigger expansion
      expect(decision.reasoning.some(r => r.includes('expansion'))).toBeTruthy();
    });

    it('should force features when set to always', () => {
      const results = [{ score: 0.9 }];
      
      const decision = selectFeatures('test', results, {
        enableQueryExpansion: 'always'
      });
      
      expect(decision.useQueryExpansion).toBeTruthy();
    });

    it('should disable features when set to never', () => {
      const results = [];
      
      const decision = selectFeatures('test', results, {
        enableQueryExpansion: 'never'
      });
      
      expect(decision.useQueryExpansion).toBeFalsy();
    });

    it('should provide reasoning', () => {
      const results = [{ score: 0.5 }];
      
      const decision = selectFeatures('test', results, {
        enableQueryExpansion: 'auto'
      });
      
      expect(decision.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('AdaptiveLearning', () => {
    it('should record query results', () => {
      const learner = new AdaptiveLearning();
      
      learner.recordQuery('gateway config', true, 0.9);
      learner.recordQuery('gateway config', true, 0.85);
      learner.recordQuery('gateway config', false, 0.7);
      
      const stats = learner.getStats();
      expect(stats.totalPatterns).toBe(1);
    });

    it('should recommend expansion when helpful', () => {
      const learner = new AdaptiveLearning();
      
      // Record 3 uses with expansion being better
      learner.recordQuery('test pattern', true, 0.9);
      learner.recordQuery('test pattern', true, 0.85);
      learner.recordQuery('test pattern', false, 0.6);
      
      const shouldUse = learner.shouldUseExpansion('test pattern');
      expect(shouldUse).toBeTruthy();
    });

    it('should not recommend when data is insufficient', () => {
      const learner = new AdaptiveLearning();
      
      learner.recordQuery('new pattern', true, 0.9);
      
      const shouldUse = learner.shouldUseExpansion('new pattern');
      expect(shouldUse).toBeNull();
    });

    it('should track statistics', () => {
      const learner = new AdaptiveLearning();
      
      learner.recordQuery('pattern1', true, 0.9);
      learner.recordQuery('pattern1', true, 0.8);
      learner.recordQuery('pattern1', false, 0.7);
      
      const stats = learner.getStats();
      expect(stats.patternsWithData).toBe(1);
    });
  });
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { printResults } = await import('../runner');
  printResults();
}