import fs from 'fs';
import path from 'path';
import { getClawTextProdStateRoot } from '../runtime-paths.js';

export type AdvisorStatus = 'active' | 'paused' | 'disabled' | 'retired';
export type AdvisorScope = 'single-session' | 'multi-session' | 'project-wide' | 'global';
export type RoutingStrategy = 'static' | 'hybrid' | 'manual-lock';

export interface AdvisorAvailability {
  enabled: boolean;
  reason?: string | null;
}

export interface AdvisorMetadata {
  description?: string;
  ownerType?: 'advisor';
  version?: number;
  [key: string]: unknown;
}

export interface AdvisorDefinition {
  id: string;
  name: string;
  status: AdvisorStatus;
  scope: AdvisorScope;
  domains: string[];
  keywords?: string[];
  models?: string[];
  projects?: string[];
  availability?: AdvisorAvailability;
  metadata?: AdvisorMetadata;
}

export interface RoutingSignals {
  usageCount?: number;
  positiveFeedback?: number;
  negativeFeedback?: number;
  lastResolvedBy?: string;
}

export interface RoutingWeights {
  seed?: number;
  usage?: number;
  sessionActivity?: number;
  humanFeedback?: number;
}

export interface RoutingRule {
  domain: string;
  seedAdvisorId: string;
  currentAdvisorId: string;
  strategy: RoutingStrategy;
  weights?: RoutingWeights;
  signals?: RoutingSignals;
  updatedAt: string;
}

export interface CouncilPerspective {
  id: string;
  label: string;
  domains: string[];
  status: AdvisorStatus;
  availability: 'ready' | 'paused' | 'disabled';
  summary?: string;
}

export interface AdvisorState {
  version: number;
  updatedAt: string;
  advisors: AdvisorDefinition[];
  routingRules: RoutingRule[];
}

const DEFAULT_ADVISOR_STATE: AdvisorState = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  advisors: [],
  routingRules: [],
};

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function advisorsDir(workspacePath: string): string {
  return path.join(getClawTextProdStateRoot(workspacePath), 'advisors');
}

export function getAdvisorDefinitionsPath(workspacePath: string): string {
  return path.join(advisorsDir(workspacePath), 'advisors.json');
}

export function getAdvisorRoutingRulesPath(workspacePath: string): string {
  return path.join(advisorsDir(workspacePath), 'routing-rules.json');
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function normalizeAdvisorStatus(value: unknown): AdvisorStatus {
  const candidate = String(value ?? '').trim() as AdvisorStatus;
  return ['active', 'paused', 'disabled', 'retired'].includes(candidate) ? candidate : 'active';
}

function normalizeAdvisorScope(value: unknown): AdvisorScope {
  const candidate = String(value ?? '').trim() as AdvisorScope;
  return ['single-session', 'multi-session', 'project-wide', 'global'].includes(candidate)
    ? candidate
    : 'multi-session';
}

function normalizeRoutingStrategy(value: unknown): RoutingStrategy {
  const candidate = String(value ?? '').trim() as RoutingStrategy;
  return ['static', 'hybrid', 'manual-lock'].includes(candidate) ? candidate : 'hybrid';
}

function normalizeAdvisor(input: unknown): AdvisorDefinition | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const id = String(raw.id ?? '').trim();
  const name = String(raw.name ?? '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    status: normalizeAdvisorStatus(raw.status),
    scope: normalizeAdvisorScope(raw.scope),
    domains: normalizeStringArray(raw.domains),
    keywords: normalizeStringArray(raw.keywords),
    models: normalizeStringArray(raw.models),
    projects: normalizeStringArray(raw.projects),
    availability: raw.availability && typeof raw.availability === 'object'
      ? {
          enabled: Boolean((raw.availability as Record<string, unknown>).enabled ?? true),
          reason: typeof (raw.availability as Record<string, unknown>).reason === 'string'
            ? String((raw.availability as Record<string, unknown>).reason)
            : null,
        }
      : { enabled: true, reason: null },
    metadata: raw.metadata && typeof raw.metadata === 'object'
      ? { ...(raw.metadata as Record<string, unknown>) }
      : undefined,
  };
}

function normalizeRoutingRule(input: unknown): RoutingRule | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const domain = String(raw.domain ?? '').trim();
  const seedAdvisorId = String(raw.seedAdvisorId ?? '').trim();
  const currentAdvisorId = String(raw.currentAdvisorId ?? seedAdvisorId).trim();
  if (!domain || !seedAdvisorId || !currentAdvisorId) return null;

  return {
    domain,
    seedAdvisorId,
    currentAdvisorId,
    strategy: normalizeRoutingStrategy(raw.strategy),
    weights: raw.weights && typeof raw.weights === 'object'
      ? { ...(raw.weights as Record<string, number>) }
      : undefined,
    signals: raw.signals && typeof raw.signals === 'object'
      ? { ...(raw.signals as Record<string, string | number>) }
      : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export function loadAdvisorState(workspacePath: string): AdvisorState {
  const advisorPath = getAdvisorDefinitionsPath(workspacePath);
  const rulesPath = getAdvisorRoutingRulesPath(workspacePath);

  let advisors: AdvisorDefinition[] = [];
  let routingRules: RoutingRule[] = [];

  try {
    if (fs.existsSync(advisorPath)) {
      const raw = JSON.parse(fs.readFileSync(advisorPath, 'utf8')) as unknown;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { advisors?: unknown[] })?.advisors)
          ? (raw as { advisors: unknown[] }).advisors
          : [];
      advisors = list.map(normalizeAdvisor).filter((value): value is AdvisorDefinition => Boolean(value));
    }
  } catch {
    advisors = [];
  }

  try {
    if (fs.existsSync(rulesPath)) {
      const raw = JSON.parse(fs.readFileSync(rulesPath, 'utf8')) as unknown;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { routingRules?: unknown[] })?.routingRules)
          ? (raw as { routingRules: unknown[] }).routingRules
          : [];
      routingRules = list.map(normalizeRoutingRule).filter((value): value is RoutingRule => Boolean(value));
    }
  } catch {
    routingRules = [];
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    advisors,
    routingRules,
  };
}

export function saveAdvisorState(workspacePath: string, state: AdvisorState): AdvisorState {
  const dir = advisorsDir(workspacePath);
  ensureDir(dir);

  const normalized: AdvisorState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    advisors: (state.advisors ?? [])
      .map(normalizeAdvisor)
      .filter((value): value is AdvisorDefinition => Boolean(value)),
    routingRules: (state.routingRules ?? [])
      .map(normalizeRoutingRule)
      .filter((value): value is RoutingRule => Boolean(value)),
  };

  fs.writeFileSync(getAdvisorDefinitionsPath(workspacePath), `${JSON.stringify(normalized.advisors, null, 2)}\n`, 'utf8');
  fs.writeFileSync(getAdvisorRoutingRulesPath(workspacePath), `${JSON.stringify(normalized.routingRules, null, 2)}\n`, 'utf8');

  return normalized;
}

export function getAdvisorById(workspacePath: string, advisorId: string): AdvisorDefinition | null {
  const target = String(advisorId ?? '').trim();
  if (!target) return null;
  return loadAdvisorState(workspacePath).advisors.find((advisor) => advisor.id === target) ?? null;
}

export function getAdvisorByDomain(workspacePath: string, domain: string): {
  advisor: AdvisorDefinition | null;
  rule: RoutingRule | null;
} {
  const targetDomain = String(domain ?? '').trim();
  if (!targetDomain) return { advisor: null, rule: null };

  const state = loadAdvisorState(workspacePath);
  const rule = state.routingRules.find((item) => item.domain === targetDomain) ?? null;
  if (rule) {
    return {
      advisor: state.advisors.find((advisor) => advisor.id === rule.currentAdvisorId) ?? null,
      rule,
    };
  }

  const fallback = state.advisors.find((advisor) => advisor.domains.includes(targetDomain)) ?? null;
  return { advisor: fallback, rule: null };
}

export function listCouncilPerspectives(workspacePath: string, options?: { includeInactive?: boolean }): CouncilPerspective[] {
  const includeInactive = Boolean(options?.includeInactive);
  return loadAdvisorState(workspacePath).advisors
    .filter((advisor) => includeInactive || advisor.status === 'active')
    .map((advisor) => ({
      id: advisor.id,
      label: advisor.name,
      domains: advisor.domains,
      status: advisor.status,
      availability: advisor.availability?.enabled === false || advisor.status === 'disabled'
        ? 'disabled'
        : advisor.status === 'paused'
          ? 'paused'
          : 'ready',
      summary: typeof advisor.metadata?.description === 'string' ? advisor.metadata.description : undefined,
    }));
}

export function upsertAdvisor(workspacePath: string, advisor: AdvisorDefinition): AdvisorState {
  const state = loadAdvisorState(workspacePath);
  const normalized = normalizeAdvisor(advisor);
  if (!normalized) return state;

  const next = state.advisors.filter((item) => item.id !== normalized.id);
  next.push(normalized);
  return saveAdvisorState(workspacePath, { ...state, advisors: next });
}

export function upsertRoutingRule(workspacePath: string, rule: RoutingRule): AdvisorState {
  const state = loadAdvisorState(workspacePath);
  const normalized = normalizeRoutingRule(rule);
  if (!normalized) return state;

  const next = state.routingRules.filter((item) => item.domain !== normalized.domain);
  next.push(normalized);
  return saveAdvisorState(workspacePath, { ...state, routingRules: next });
}

export { DEFAULT_ADVISOR_STATE };
