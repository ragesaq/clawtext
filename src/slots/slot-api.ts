import {
  getAdvisorByDomain,
  getAdvisorById,
  listCouncilPerspectives,
  loadAdvisorState,
  type AdvisorDefinition,
  type RoutingRule,
} from './advisor.js';
import {
  getRelatedSessions,
  listSessionsByProject,
  resolveSessionRow,
  type SessionMatrixRow,
} from './sessionMatrix.js';

export interface SlotApiContext {
  workspacePath: string;
  sessionKey?: string;
  channelId?: string;
  threadRef?: string;
  channelRef?: string;
}

export interface AdvisorActiveSlotResult {
  active: Array<{
    id: string;
    name: string;
    reason: string;
    domains: string[];
    status: string;
  }>;
}

export interface AdvisorByDomainSlotResult {
  domain: string;
  advisor: {
    id: string;
    name: string;
    status: string;
  } | null;
  resolution: {
    source: 'rule' | 'fallback' | 'none';
    strategy: string | null;
    reason: string;
  };
}

export interface AdvisorByIdSlotResult {
  id: string;
  name: string;
  domains: string[];
  models: string[];
  status: string;
  availability: {
    enabled: boolean;
    reason?: string | null;
  };
}

export interface SessionOwnerSlotResult {
  sessionId: string;
  owner: {
    id: string;
    name: string;
  } | null;
  domain?: string;
  status: string;
}

export interface SessionRelatedSlotResult {
  baseSession: string;
  related: Array<{
    sessionId: string;
    reason: string;
    ownerAdvisorId: string;
    domain?: string;
    status: string;
  }>;
}

export interface SessionMatrixSlotResult {
  project: string;
  sessions: Record<
    string,
    {
      owner: string;
      domain?: string;
      status: string;
    }
  >;
}

export interface CouncilPerspectivesSlotResult {
  perspectives: Array<{
    id: string;
    label: string;
    status: string;
    domains: string[];
    availability: string;
    summary?: string;
  }>;
}

export interface RoutingRuleSlotResult {
  domain: string;
  seedAdvisorId: string | null;
  currentAdvisorId: string | null;
  strategy: string | null;
}

export interface RoutingExplainSlotResult {
  domain: string;
  advisorId: string | null;
  explanation: {
    seedMatched: boolean;
    usageSignals: Record<string, unknown>;
    invalidatedRecently: boolean;
    reason: string;
  };
}

export type SlotApiResult =
  | AdvisorActiveSlotResult
  | AdvisorByDomainSlotResult
  | AdvisorByIdSlotResult
  | SessionOwnerSlotResult
  | SessionRelatedSlotResult
  | SessionMatrixSlotResult
  | CouncilPerspectivesSlotResult
  | RoutingRuleSlotResult
  | RoutingExplainSlotResult
  | null;

function resolveCurrentSession(ctx: SlotApiContext): SessionMatrixRow | null {
  return resolveSessionRow(ctx.workspacePath, {
    sessionKey: ctx.sessionKey,
    channelId: ctx.channelId,
    threadRef: ctx.threadRef,
    channelRef: ctx.channelRef,
  });
}

function resolveAdvisorName(workspacePath: string, advisorId: string): string {
  return getAdvisorById(workspacePath, advisorId)?.name ?? advisorId;
}

function toAdvisorByIdResult(advisor: AdvisorDefinition | null): AdvisorByIdSlotResult | null {
  if (!advisor) return null;
  return {
    id: advisor.id,
    name: advisor.name,
    domains: advisor.domains,
    models: advisor.models ?? [],
    status: advisor.status,
    availability: {
      enabled: advisor.availability?.enabled ?? true,
      reason: advisor.availability?.reason ?? null,
    },
  };
}

function toRoutingRuleResult(domain: string, rule: RoutingRule | null): RoutingRuleSlotResult {
  return {
    domain,
    seedAdvisorId: rule?.seedAdvisorId ?? null,
    currentAdvisorId: rule?.currentAdvisorId ?? null,
    strategy: rule?.strategy ?? null,
  };
}

export function renderAdvisorActive(ctx: SlotApiContext): AdvisorActiveSlotResult {
  const current = resolveCurrentSession(ctx);
  if (!current) return { active: [] };

  const advisor = getAdvisorById(ctx.workspacePath, current.ownerAdvisorId);
  if (!advisor) {
    return {
      active: [
        {
          id: current.ownerAdvisorId,
          name: current.ownerAdvisorId,
          reason: 'primary owner of current session',
          domains: current.domain ? [current.domain] : [],
          status: 'unknown',
        },
      ],
    };
  }

  return {
    active: [
      {
        id: advisor.id,
        name: advisor.name,
        reason: 'primary owner of current session',
        domains: advisor.domains,
        status: advisor.status,
      },
    ],
  };
}

export function renderAdvisorByDomain(ctx: SlotApiContext, domain: string): AdvisorByDomainSlotResult {
  const { advisor, rule } = getAdvisorByDomain(ctx.workspacePath, domain);
  if (!advisor) {
    return {
      domain,
      advisor: null,
      resolution: {
        source: 'none',
        strategy: null,
        reason: 'no advisor matched this domain',
      },
    };
  }

  return {
    domain,
    advisor: {
      id: advisor.id,
      name: advisor.name,
      status: advisor.status,
    },
    resolution: {
      source: rule ? 'rule' : 'fallback',
      strategy: rule?.strategy ?? null,
      reason: rule
        ? `resolved from ${rule.strategy} routing rule`
        : 'resolved from advisor domain coverage fallback',
    },
  };
}

export function renderAdvisorById(ctx: SlotApiContext, advisorId: string): AdvisorByIdSlotResult | null {
  return toAdvisorByIdResult(getAdvisorById(ctx.workspacePath, advisorId));
}

export function renderSessionOwner(
  ctx: SlotApiContext,
  target: 'current' | string = 'current',
): SessionOwnerSlotResult | null {
  const session = target === 'current'
    ? resolveCurrentSession(ctx)
    : resolveSessionRow(ctx.workspacePath, { sessionKey: target, channelId: target, threadRef: target, channelRef: target });
  if (!session) return null;

  return {
    sessionId: session.sessionId,
    owner: {
      id: session.ownerAdvisorId,
      name: resolveAdvisorName(ctx.workspacePath, session.ownerAdvisorId),
    },
    domain: session.domain,
    status: session.status,
  };
}

export function renderSessionRelated(
  ctx: SlotApiContext,
  target: 'current' | string = 'current',
): SessionRelatedSlotResult | null {
  const session = target === 'current'
    ? resolveCurrentSession(ctx)
    : resolveSessionRow(ctx.workspacePath, { sessionKey: target, channelId: target, threadRef: target, channelRef: target });
  if (!session) return null;

  const related = getRelatedSessions(ctx.workspacePath, session.sessionId).map((row) => ({
    sessionId: row.sessionId,
    reason: row.reason,
    ownerAdvisorId: row.ownerAdvisorId,
    domain: row.domain,
    status: row.status,
  }));

  return {
    baseSession: session.sessionId,
    related,
  };
}

export function renderSessionMatrix(
  ctx: SlotApiContext,
  target: 'current' | 'current-project' | string = 'current-project',
): SessionMatrixSlotResult | null {
  let project = String(target ?? '').trim();

  if (target === 'current' || target === 'current-project') {
    const current = resolveCurrentSession(ctx);
    if (!current) return null;
    project = current.project;
  }

  if (!project) return null;

  const sessions = listSessionsByProject(ctx.workspacePath, project);
  return {
    project,
    sessions: Object.fromEntries(
      sessions.map((row) => [
        row.sessionId,
        {
          owner: row.ownerAdvisorId,
          domain: row.domain,
          status: row.status,
        },
      ]),
    ),
  };
}

export function renderCouncilPerspectives(ctx: SlotApiContext): CouncilPerspectivesSlotResult {
  return {
    perspectives: listCouncilPerspectives(ctx.workspacePath).map((entry) => ({
      id: entry.id,
      label: entry.label,
      status: entry.status,
      domains: entry.domains,
      availability: entry.availability,
      summary: entry.summary,
    })),
  };
}

export function renderRoutingRule(ctx: SlotApiContext, domain: string): RoutingRuleSlotResult {
  const state = loadAdvisorState(ctx.workspacePath);
  const rule = state.routingRules.find((item) => item.domain === domain) ?? null;
  return toRoutingRuleResult(domain, rule);
}

export function renderRoutingExplain(ctx: SlotApiContext, domain: string): RoutingExplainSlotResult {
  const state = loadAdvisorState(ctx.workspacePath);
  const rule = state.routingRules.find((item) => item.domain === domain) ?? null;

  if (!rule) {
    return {
      domain,
      advisorId: null,
      explanation: {
        seedMatched: false,
        usageSignals: {},
        invalidatedRecently: false,
        reason: 'no routing rule exists for this domain',
      },
    };
  }

  return {
    domain,
    advisorId: rule.currentAdvisorId,
    explanation: {
      seedMatched: rule.seedAdvisorId === rule.currentAdvisorId,
      usageSignals: {
        usageCount: rule.signals?.usageCount ?? 0,
        positiveFeedback: rule.signals?.positiveFeedback ?? 0,
        negativeFeedback: rule.signals?.negativeFeedback ?? 0,
        lastResolvedBy: rule.signals?.lastResolvedBy ?? null,
      },
      invalidatedRecently: false,
      reason:
        rule.seedAdvisorId === rule.currentAdvisorId
          ? 'seed advisor retained; observed signals do not require override'
          : 'current advisor differs from seed due to stored hybrid routing signals',
    },
  };
}

export function resolveSlotTemplate(
  ctx: SlotApiContext,
  selector: string,
): SlotApiResult {
  const raw = String(selector ?? '').trim();
  if (!raw) return null;

  if (raw === 'advisor.active') return renderAdvisorActive(ctx);
  if (raw.startsWith('advisor.byDomain:')) return renderAdvisorByDomain(ctx, raw.slice('advisor.byDomain:'.length));
  if (raw.startsWith('advisor.byId:')) return renderAdvisorById(ctx, raw.slice('advisor.byId:'.length));
  if (raw === 'council.perspectives') return renderCouncilPerspectives(ctx);
  if (raw.startsWith('session.owner:')) return renderSessionOwner(ctx, raw.slice('session.owner:'.length) || 'current');
  if (raw.startsWith('session.related:')) return renderSessionRelated(ctx, raw.slice('session.related:'.length) || 'current');
  if (raw.startsWith('session.matrix:')) return renderSessionMatrix(ctx, raw.slice('session.matrix:'.length) || 'current-project');
  if (raw.startsWith('routing.rule:')) return renderRoutingRule(ctx, raw.slice('routing.rule:'.length));
  if (raw.startsWith('routing.explain:')) return renderRoutingExplain(ctx, raw.slice('routing.explain:'.length));

  return null;
}
