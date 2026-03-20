import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  resolveSlotTemplate,
  expandSlotTemplates,
  renderClawDashPanel,
} from '../dist/index.js';

function seedWorkspace(workspacePath) {
  const advisorsDir = path.join(workspacePath, 'state', 'clawtext', 'prod', 'advisors');
  const matrixDir = path.join(workspacePath, 'state', 'clawtext', 'prod', 'session-matrix');
  fs.mkdirSync(advisorsDir, { recursive: true });
  fs.mkdirSync(matrixDir, { recursive: true });

  fs.writeFileSync(path.join(advisorsDir, 'advisors.json'), JSON.stringify([
    {
      id: 'clawtext-lead',
      name: 'ClawText Lead',
      status: 'active',
      scope: 'project-wide',
      domains: ['memory', 'continuity'],
      models: ['heavy'],
      availability: { enabled: true, reason: null },
      metadata: { description: 'Primary ClawText advisor' }
    },
    {
      id: 'security-advisor',
      name: 'Security Advisor',
      status: 'active',
      scope: 'global',
      domains: ['security'],
      models: ['cp-opus'],
      availability: { enabled: true, reason: null },
      metadata: { description: 'Security reviewer' }
    }
  ], null, 2) + '\n');

  fs.writeFileSync(path.join(advisorsDir, 'routing-rules.json'), JSON.stringify([
    {
      domain: 'memory',
      seedAdvisorId: 'clawtext-lead',
      currentAdvisorId: 'clawtext-lead',
      strategy: 'hybrid',
      signals: { usageCount: 3, positiveFeedback: 1, negativeFeedback: 0, lastResolvedBy: 'clawtext-lead' },
      updatedAt: '2026-03-19T00:00:00Z'
    }
  ], null, 2) + '\n');

  fs.writeFileSync(path.join(matrixDir, 'sessions.json'), JSON.stringify([
    {
      sessionId: 'discord-thread:123456789012345678',
      project: 'clawtext',
      domain: 'memory',
      ownerAdvisorId: 'clawtext-lead',
      participants: { contributors: [], observers: ['security-advisor'] },
      surface: {
        provider: 'discord',
        threadRef: 'discord:thread:123456789012345678',
        channelRef: 'discord:channel:123456789012345678'
      },
      status: 'active',
      relations: {
        sameOwner: ['discord-thread:223456789012345678'],
        sameProject: ['discord-thread:223456789012345678'],
        sameDomain: [],
        supersedes: [],
        supersededBy: [],
        explicitRelated: []
      },
      createdAt: '2026-03-19T00:00:00Z',
      updatedAt: '2026-03-19T00:00:00Z'
    },
    {
      sessionId: 'discord-thread:223456789012345678',
      project: 'clawtext',
      domain: 'continuity',
      ownerAdvisorId: 'clawtext-lead',
      participants: { contributors: [], observers: [] },
      surface: {
        provider: 'discord',
        threadRef: 'discord:thread:223456789012345678',
        channelRef: 'discord:channel:223456789012345678'
      },
      status: 'idle',
      relations: {
        sameOwner: ['discord-thread:123456789012345678'],
        sameProject: ['discord-thread:123456789012345678'],
        sameDomain: [],
        supersedes: [],
        supersededBy: [],
        explicitRelated: ['discord-thread:123456789012345678']
      },
      createdAt: '2026-03-19T00:00:00Z',
      updatedAt: '2026-03-19T00:00:00Z'
    }
  ], null, 2) + '\n');
}

function makeCtx(workspacePath) {
  return {
    workspacePath,
    sessionKey: 'channel:123456789012345678',
    channelId: '123456789012345678',
    threadRef: 'discord:thread:123456789012345678',
    channelRef: 'discord:channel:123456789012345678',
  };
}

test('slot API resolves session-aware selectors against seeded workspace', () => {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'clawtext-int-'));
  seedWorkspace(workspacePath);
  const ctx = makeCtx(workspacePath);

  const advisor = resolveSlotTemplate(ctx, 'advisor.active');
  assert.equal(advisor.active[0].id, 'clawtext-lead');

  const owner = resolveSlotTemplate(ctx, 'session.owner:current');
  assert.equal(owner.owner.id, 'clawtext-lead');

  const related = resolveSlotTemplate(ctx, 'session.related:current');
  assert.equal(related.related.length, 1);
  assert.equal(related.related[0].sessionId, 'discord-thread:223456789012345678');
});

test('template expansion replaces known selectors and audits replacements', () => {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'clawtext-int-'));
  seedWorkspace(workspacePath);
  const ctx = makeCtx(workspacePath);

  const expanded = expandSlotTemplates('A={{advisor.active}}\nB={{routing.rule:memory}}', ctx);
  assert.match(expanded.output, /clawtext-lead/);
  assert.equal(expanded.replacements.length, 2);
  assert.equal(expanded.replacements.every((item) => item.resolved), true);
});

test('integration adapters return structured bundles and optional rendered text', async () => {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'clawtext-int-'));
  seedWorkspace(workspacePath);

  // Seed minimal permissions/fleet state for renderCouncilContext
  const statePerms = path.join(workspacePath, 'state', 'clawtext', 'prod', 'permissions');
  fs.mkdirSync(statePerms, { recursive: true });

  // renderCouncilContext (new async API)
  const { renderCouncilContext } = await import('../dist/integrations/clawcouncil.js');
  const council = await renderCouncilContext({
    sessionId: 'discord-thread:123456789012345678',
    workspacePath,
    enableReflect: false,
    memories: [],
  });
  assert.ok(council.advisorContext !== undefined);
  assert.ok(council.sessionContext !== undefined);
  assert.ok(council.meta.sessionId === 'discord-thread:123456789012345678');

  // renderClawDashPanel (existing sync API unchanged)
  const ctx = makeCtx(workspacePath);
  const dash = renderClawDashPanel(ctx, {
    template: 'Matrix: {{session.matrix:current-project}}',
  });
  assert.ok(dash.data['session.matrix:current-project']);
  assert.match(dash.rendered, /discord-thread:123456789012345678/);
  assert.equal(dash.replacements.length, 1);
});
