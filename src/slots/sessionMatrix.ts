import fs from 'fs';
import path from 'path';
import { getClawTextProdStateRoot } from '../runtime-paths.js';

export type SessionStatus = 'active' | 'idle' | 'archived' | 'superseded' | 'failed';
export type ParticipantRole = 'contributors' | 'observers';

export interface SessionParticipants {
  contributors: string[];
  observers: string[];
}

export interface SessionSurfaceRef {
  provider?: string;
  threadRef?: string;
  channelRef?: string;
}

export interface SessionRelations {
  sameOwner: string[];
  sameProject: string[];
  sameDomain: string[];
  supersedes: string[];
  supersededBy: string[];
  explicitRelated: string[];
}

export interface SessionMatrixRow {
  sessionId: string;
  project: string;
  domain?: string;
  ownerAdvisorId: string;
  participants?: SessionParticipants;
  surface?: SessionSurfaceRef;
  status: SessionStatus;
  relations?: SessionRelations;
  createdAt: string;
  updatedAt: string;
}

export interface SessionOwnershipEvent {
  type:
    | 'session.created'
    | 'session.owner.changed'
    | 'session.archived'
    | 'session.superseded'
    | 'session.participant.added'
    | 'session.participant.removed';
  sessionId: string;
  project?: string;
  previousOwnerAdvisorId?: string;
  newOwnerAdvisorId?: string;
  changedAt: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionMatrixIndexes {
  bySessionId: Record<string, string>;
  byProject: Record<string, string[]>;
  byOwnerAdvisorId: Record<string, string[]>;
  byDomain: Record<string, string[]>;
  activeSessions: string[];
}

export interface SessionMatrixState {
  version: number;
  updatedAt: string;
  sessions: SessionMatrixRow[];
  indexes: SessionMatrixIndexes;
}

const EMPTY_PARTICIPANTS: SessionParticipants = {
  contributors: [],
  observers: [],
};

const EMPTY_RELATIONS: SessionRelations = {
  sameOwner: [],
  sameProject: [],
  sameDomain: [],
  supersedes: [],
  supersededBy: [],
  explicitRelated: [],
};

const EMPTY_INDEXES: SessionMatrixIndexes = {
  bySessionId: {},
  byProject: {},
  byOwnerAdvisorId: {},
  byDomain: {},
  activeSessions: [],
};

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function matrixDir(workspacePath: string): string {
  return path.join(getClawTextProdStateRoot(workspacePath), 'session-matrix');
}

export function getSessionMatrixPath(workspacePath: string): string {
  return path.join(matrixDir(workspacePath), 'sessions.json');
}

export function getSessionMatrixIndexesPath(workspacePath: string): string {
  return path.join(matrixDir(workspacePath), 'indexes.json');
}

export function getSessionOwnershipEventsPath(workspacePath: string): string {
  return path.join(matrixDir(workspacePath), 'ownership-events.jsonl');
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function normalizeStatus(value: unknown): SessionStatus {
  const candidate = String(value ?? '').trim() as SessionStatus;
  return ['active', 'idle', 'archived', 'superseded', 'failed'].includes(candidate)
    ? candidate
    : 'active';
}

function normalizeParticipants(value: unknown): SessionParticipants {
  if (!value || typeof value !== 'object') return { ...EMPTY_PARTICIPANTS };
  const raw = value as Record<string, unknown>;
  return {
    contributors: normalizeStringArray(raw.contributors),
    observers: normalizeStringArray(raw.observers),
  };
}

function normalizeRelations(value: unknown): SessionRelations {
  if (!value || typeof value !== 'object') return { ...EMPTY_RELATIONS };
  const raw = value as Record<string, unknown>;
  return {
    sameOwner: normalizeStringArray(raw.sameOwner),
    sameProject: normalizeStringArray(raw.sameProject),
    sameDomain: normalizeStringArray(raw.sameDomain),
    supersedes: normalizeStringArray(raw.supersedes),
    supersededBy: normalizeStringArray(raw.supersededBy),
    explicitRelated: normalizeStringArray(raw.explicitRelated),
  };
}

function normalizeSurface(value: unknown): SessionSurfaceRef | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const provider = String(raw.provider ?? '').trim();
  const threadRef = String(raw.threadRef ?? '').trim();
  const channelRef = String(raw.channelRef ?? '').trim();
  if (!provider && !threadRef && !channelRef) return undefined;
  return {
    provider: provider || undefined,
    threadRef: threadRef || undefined,
    channelRef: channelRef || undefined,
  };
}

function normalizeRow(input: unknown): SessionMatrixRow | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const sessionId = String(raw.sessionId ?? '').trim();
  const project = String(raw.project ?? '').trim();
  const ownerAdvisorId = String(raw.ownerAdvisorId ?? '').trim();
  if (!sessionId || !project || !ownerAdvisorId) return null;

  return {
    sessionId,
    project,
    domain: String(raw.domain ?? '').trim() || undefined,
    ownerAdvisorId,
    participants: normalizeParticipants(raw.participants),
    surface: normalizeSurface(raw.surface),
    status: normalizeStatus(raw.status),
    relations: normalizeRelations(raw.relations),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

function buildIndexes(rows: SessionMatrixRow[]): SessionMatrixIndexes {
  const indexes: SessionMatrixIndexes = {
    bySessionId: {},
    byProject: {},
    byOwnerAdvisorId: {},
    byDomain: {},
    activeSessions: [],
  };

  for (const row of rows) {
    indexes.bySessionId[row.sessionId] = row.sessionId;
    indexes.byProject[row.project] ??= [];
    indexes.byProject[row.project].push(row.sessionId);
    indexes.byOwnerAdvisorId[row.ownerAdvisorId] ??= [];
    indexes.byOwnerAdvisorId[row.ownerAdvisorId].push(row.sessionId);

    if (row.domain) {
      indexes.byDomain[row.domain] ??= [];
      indexes.byDomain[row.domain].push(row.sessionId);
    }

    if (row.status === 'active' || row.status === 'idle') {
      indexes.activeSessions.push(row.sessionId);
    }
  }

  return indexes;
}

export function loadSessionMatrixState(workspacePath: string): SessionMatrixState {
  const matrixPath = getSessionMatrixPath(workspacePath);
  let sessions: SessionMatrixRow[] = [];

  try {
    if (fs.existsSync(matrixPath)) {
      const raw = JSON.parse(fs.readFileSync(matrixPath, 'utf8')) as unknown;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { sessions?: unknown[] })?.sessions)
          ? (raw as { sessions: unknown[] }).sessions
          : [];
      sessions = list.map(normalizeRow).filter((value): value is SessionMatrixRow => Boolean(value));
    }
  } catch {
    sessions = [];
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    sessions,
    indexes: buildIndexes(sessions),
  };
}

export function saveSessionMatrixState(workspacePath: string, state: SessionMatrixState): SessionMatrixState {
  const dir = matrixDir(workspacePath);
  ensureDir(dir);

  const sessions = (state.sessions ?? [])
    .map(normalizeRow)
    .filter((value): value is SessionMatrixRow => Boolean(value));

  const normalized: SessionMatrixState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    sessions,
    indexes: buildIndexes(sessions),
  };

  fs.writeFileSync(getSessionMatrixPath(workspacePath), `${JSON.stringify(normalized.sessions, null, 2)}\n`, 'utf8');
  fs.writeFileSync(getSessionMatrixIndexesPath(workspacePath), `${JSON.stringify(normalized.indexes, null, 2)}\n`, 'utf8');

  return normalized;
}

export function appendSessionOwnershipEvent(workspacePath: string, event: SessionOwnershipEvent): void {
  const dir = matrixDir(workspacePath);
  ensureDir(dir);
  const payload: SessionOwnershipEvent = {
    ...event,
    changedAt: event.changedAt || new Date().toISOString(),
  };
  fs.appendFileSync(getSessionOwnershipEventsPath(workspacePath), `${JSON.stringify(payload)}\n`, 'utf8');
}

function candidateSessionKeys(value: string): string[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [];

  const candidates = new Set<string>([raw]);

  if (/^\d{17,20}$/.test(raw)) {
    candidates.add(`discord-thread:${raw}`);
    candidates.add(`discord:thread:${raw}`);
    candidates.add(`discord-channel:${raw}`);
    candidates.add(`discord:channel:${raw}`);
  }

  const threadMatch = raw.match(/discord(?::|-)?thread:(\d{17,20})$/i);
  if (threadMatch?.[1]) {
    candidates.add(threadMatch[1]);
    candidates.add(`discord-thread:${threadMatch[1]}`);
    candidates.add(`discord:thread:${threadMatch[1]}`);
  }

  const channelMatch = raw.match(/discord(?::|-)?channel:(\d{17,20})$/i);
  if (channelMatch?.[1]) {
    candidates.add(channelMatch[1]);
    candidates.add(`discord-channel:${channelMatch[1]}`);
    candidates.add(`discord:channel:${channelMatch[1]}`);
  }

  return [...candidates];
}

function rowMatchesCandidate(row: SessionMatrixRow, candidate: string): boolean {
  if (!candidate) return false;
  if (row.sessionId === candidate) return true;
  if (row.surface?.threadRef === candidate) return true;
  if (row.surface?.channelRef === candidate) return true;

  const candidates = candidateSessionKeys(candidate);
  return candidates.some((value) => value === row.sessionId || value === row.surface?.threadRef || value === row.surface?.channelRef);
}

export function getSessionById(workspacePath: string, sessionId: string): SessionMatrixRow | null {
  const target = String(sessionId ?? '').trim();
  if (!target) return null;
  return loadSessionMatrixState(workspacePath).sessions.find((row) => rowMatchesCandidate(row, target)) ?? null;
}

export function resolveSessionRow(
  workspacePath: string,
  context: { sessionKey?: string; channelId?: string; threadRef?: string; channelRef?: string },
): SessionMatrixRow | null {
  const state = loadSessionMatrixState(workspacePath);
  const candidates = [
    ...candidateSessionKeys(String(context.sessionKey ?? '').trim()),
    ...candidateSessionKeys(String(context.channelId ?? '').trim()),
    ...candidateSessionKeys(String(context.threadRef ?? '').trim()),
    ...candidateSessionKeys(String(context.channelRef ?? '').trim()),
  ];

  for (const candidate of candidates) {
    const match = state.sessions.find((row) => rowMatchesCandidate(row, candidate));
    if (match) return match;
  }

  return null;
}

export function listSessionsByOwner(workspacePath: string, ownerAdvisorId: string): SessionMatrixRow[] {
  const target = String(ownerAdvisorId ?? '').trim();
  if (!target) return [];
  return loadSessionMatrixState(workspacePath).sessions.filter((row) => row.ownerAdvisorId === target);
}

export function listSessionsByProject(workspacePath: string, project: string): SessionMatrixRow[] {
  const target = String(project ?? '').trim();
  if (!target) return [];
  return loadSessionMatrixState(workspacePath).sessions.filter((row) => row.project === target);
}

export function listSessionsByDomain(workspacePath: string, domain: string): SessionMatrixRow[] {
  const target = String(domain ?? '').trim();
  if (!target) return [];
  return loadSessionMatrixState(workspacePath).sessions.filter((row) => row.domain === target);
}

export function getRelatedSessions(workspacePath: string, sessionId: string): Array<SessionMatrixRow & { reason: string }> {
  const state = loadSessionMatrixState(workspacePath);
  const base = state.sessions.find((row) => row.sessionId === sessionId);
  if (!base) return [];

  const related = new Map<string, SessionMatrixRow & { reason: string }>();

  for (const row of state.sessions) {
    if (row.sessionId === base.sessionId) continue;

    const reasons: string[] = [];
    if (row.ownerAdvisorId === base.ownerAdvisorId) reasons.push('same owner');
    if (row.project === base.project) reasons.push('same project');
    if (row.domain && base.domain && row.domain === base.domain) reasons.push('same domain');
    if (base.relations?.explicitRelated.includes(row.sessionId)) reasons.push('explicitly related');
    if (base.relations?.supersedes.includes(row.sessionId) || base.relations?.supersededBy.includes(row.sessionId)) {
      reasons.push('lifecycle relation');
    }

    if (reasons.length > 0) {
      related.set(row.sessionId, { ...row, reason: reasons.join(', ') });
    }
  }

  return [...related.values()];
}

export function upsertSessionRow(
  workspacePath: string,
  row: SessionMatrixRow,
  options?: { reason?: string; logEvent?: boolean },
): SessionMatrixState {
  const currentState = loadSessionMatrixState(workspacePath);
  const normalized = normalizeRow(row);
  if (!normalized) return currentState;

  const existing = currentState.sessions.find((item) => item.sessionId === normalized.sessionId) ?? null;
  const nextRows = currentState.sessions.filter((item) => item.sessionId !== normalized.sessionId);
  nextRows.push({
    ...normalized,
    createdAt: existing?.createdAt ?? normalized.createdAt,
    updatedAt: new Date().toISOString(),
  });

  const saved = saveSessionMatrixState(workspacePath, {
    ...currentState,
    sessions: nextRows,
  });

  if (options?.logEvent !== false) {
    if (!existing) {
      appendSessionOwnershipEvent(workspacePath, {
        type: 'session.created',
        sessionId: normalized.sessionId,
        project: normalized.project,
        newOwnerAdvisorId: normalized.ownerAdvisorId,
        changedAt: new Date().toISOString(),
        reason: options?.reason ?? 'session upsert created row',
      });
    } else if (existing.ownerAdvisorId !== normalized.ownerAdvisorId) {
      appendSessionOwnershipEvent(workspacePath, {
        type: 'session.owner.changed',
        sessionId: normalized.sessionId,
        project: normalized.project,
        previousOwnerAdvisorId: existing.ownerAdvisorId,
        newOwnerAdvisorId: normalized.ownerAdvisorId,
        changedAt: new Date().toISOString(),
        reason: options?.reason ?? 'session upsert changed owner',
      });
    }
  }

  return saved;
}

export function setSessionOwner(
  workspacePath: string,
  sessionId: string,
  ownerAdvisorId: string,
  options?: { reason?: string },
): SessionMatrixState {
  const existing = getSessionById(workspacePath, sessionId);
  if (!existing) return loadSessionMatrixState(workspacePath);

  return upsertSessionRow(
    workspacePath,
    {
      ...existing,
      ownerAdvisorId: String(ownerAdvisorId ?? '').trim() || existing.ownerAdvisorId,
      updatedAt: new Date().toISOString(),
    },
    { reason: options?.reason ?? 'setSessionOwner', logEvent: true },
  );
}

export function setSessionStatus(
  workspacePath: string,
  sessionId: string,
  status: SessionStatus,
  options?: { reason?: string },
): SessionMatrixState {
  const existing = getSessionById(workspacePath, sessionId);
  if (!existing) return loadSessionMatrixState(workspacePath);

  const next = upsertSessionRow(
    workspacePath,
    {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    },
    { reason: options?.reason ?? `setSessionStatus:${status}`, logEvent: false },
  );

  if (status === 'archived') {
    appendSessionOwnershipEvent(workspacePath, {
      type: 'session.archived',
      sessionId: existing.sessionId,
      project: existing.project,
      changedAt: new Date().toISOString(),
      reason: options?.reason ?? 'session archived',
    });
  }

  return next;
}

export { EMPTY_INDEXES, EMPTY_PARTICIPANTS, EMPTY_RELATIONS };
