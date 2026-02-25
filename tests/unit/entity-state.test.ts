/**
 * Unit Tests for Entity State Tracking
 */

import { describe, it, expect, beforeEach } from '../runner';
import {
  extractEntities,
  mergeEntityState,
  EntityStateManager,
  Entity
} from '../../lib/entity-state';

describe('Entity State Tracking', () => {
  describe('extractEntities', () => {
    it('should extract person entity from "works at" pattern', () => {
      const text = 'Alice works at Anthropic as a Senior Engineer';
      const results = extractEntities(text, 'mem-1');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity.name).toBe('Alice');
      expect(results[0].entity.type).toBe('person');
      expect(results[0].entity.state.employer).toBe('Anthropic');
      expect(results[0].entity.state.role).toBe('Senior Engineer');
    });

    it('should extract person entity from "is a" pattern', () => {
      const text = 'Bob is a Product Manager at Google';
      const results = extractEntities(text, 'mem-2');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity.name).toBe('Bob');
      expect(results[0].entity.state.role).toBe('Product Manager');
      expect(results[0].entity.state.employer).toBe('Google');
    });

    it('should extract technology with version', () => {
      const text = 'We are using React version 18.2';
      const results = extractEntities(text, 'mem-3');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity.name).toBe('React');
      expect(results[0].entity.state.version).toBe('18.2');
    });

    it('should extract technology upgrade', () => {
      const text = 'Migrated to TypeScript from JavaScript';
      const results = extractEntities(text, 'mem-4');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity.name).toBe('TypeScript');
      expect(results[0].entity.state.status).toBe('adopted');
    });

    it('should return empty array for text with no entities', () => {
      const text = 'This is a generic memory with no specific entities';
      const results = extractEntities(text, 'mem-5');
      
      expect(results.length).toBe(0);
    });

    it('should handle multiple entities in one text', () => {
      const text = 'Alice works at Anthropic. Bob works at OpenAI as a Researcher.';
      const results = extractEntities(text, 'mem-6');
      
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('mergeEntityState', () => {
    it('should merge states with merge strategy', () => {
      const existing: Entity = {
        id: 'alice-person',
        name: 'Alice',
        type: 'person',
        state: { employer: 'Anthropic', role: 'Engineer' },
        firstSeen: '2026-01-01',
        lastUpdated: '2026-01-01',
        sourceMemories: ['mem-1'],
        confidence: 0.8
      };
      
      const update: Entity = {
        id: 'alice-person',
        name: 'Alice',
        type: 'person',
        state: { role: 'Senior Engineer', location: 'SF' },
        firstSeen: '2026-01-01',
        lastUpdated: '2026-02-25',
        sourceMemories: ['mem-2'],
        confidence: 0.8
      };
      
      const merged = mergeEntityState(existing, update, 'merge');
      
      expect(merged.state.employer).toBe('Anthropic');
      expect(merged.state.role).toBe('Senior Engineer');
      expect(merged.state.location).toBe('SF');
      expect(merged.confidence).toBeGreaterThan(0.8);
    });

    it('should overwrite with overwrite strategy', () => {
      const existing: Entity = {
        id: 'bob-person',
        name: 'Bob',
        type: 'person',
        state: { employer: 'Google', role: 'PM' },
        firstSeen: '2026-01-01',
        lastUpdated: '2026-01-01',
        sourceMemories: ['mem-1'],
        confidence: 0.8
      };
      
      const update: Entity = {
        id: 'bob-person',
        name: 'Bob',
        type: 'person',
        state: { employer: 'Meta', role: 'Director' },
        firstSeen: '2026-01-01',
        lastUpdated: '2026-02-25',
        sourceMemories: ['mem-2'],
        confidence: 0.8
      };
      
      const merged = mergeEntityState(existing, update, 'overwrite');
      
      expect(merged.state.employer).toBe('Meta');
      expect(merged.state.role).toBe('Director');
      expect(merged.state).not.toContain('Google');
    });
  });

  describe('EntityStateManager', () => {
    let manager: EntityStateManager;
    
    beforeEach(() => {
      manager = new EntityStateManager('/tmp/test-entities.json');
    });

    it('should process memory and extract entity', () => {
      const results = manager.processMemory(
        'mem-1',
        'Alice works at Anthropic as a Senior Engineer'
      );
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].extracted).toBeTruthy();
    });

    it('should get entity by name', () => {
      manager.processMemory('mem-1', 'Alice works at Anthropic');
      
      const entity = manager.get('Alice');
      expect(entity).toBeDefined();
      expect(entity?.name).toBe('Alice');
    });

    it('should get entity state', () => {
      manager.processMemory('mem-1', 'Alice works at Anthropic as Engineer');
      
      const state = manager.getState('Alice');
      expect(state).toBeDefined();
      expect(state?.employer).toBe('Anthropic');
    });

    it('should query entities by type', () => {
      manager.processMemory('mem-1', 'Alice works at Anthropic');
      manager.processMemory('mem-2', 'Bob works at OpenAI');
      
      const people = manager.getByType('person');
      expect(people.length).toBeGreaterThanOrEqual(1);
    });

    it('should query by property value', () => {
      manager.processMemory('mem-1', 'Alice works at Anthropic');
      manager.processMemory('mem-2', 'Bob works at Google');
      
      const anthropicEmployees = manager.query({
        type: 'person',
        propertyValue: { key: 'employer', value: 'Anthropic' }
      });
      
      expect(anthropicEmployees.length).toBeGreaterThan(0);
      expect(anthropicEmployees[0].name).toBe('Alice');
    });

    it('should track entity count', () => {
      manager.processMemory('mem-1', 'Alice works at Anthropic');
      manager.processMemory('mem-2', 'Bob works at OpenAI');
      
      expect(manager.count).toBeGreaterThanOrEqual(2);
    });

    it('should provide statistics', () => {
      manager.processMemory('mem-1', 'Alice works at Anthropic');
      
      const stats = manager.getStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byType.person).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });

    it('should update entity on new information', () => {
      manager.processMemory('mem-1', 'Alice works at Anthropic as Engineer');
      manager.processMemory('mem-2', 'Alice works at Anthropic as Senior Engineer');
      
      const entity = manager.get('Alice');
      expect(entity?.state.role).toBe('Senior Engineer');
    });
  });
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { printResults } = await import('../runner');
  printResults();
}