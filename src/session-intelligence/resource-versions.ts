import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

export type DeltaType = 'new' | 'unchanged' | 'small' | 'large';

export type ResourceVersion = {
  id?: number;
  conversationId: string;
  resourceUri: string;
  parentId?: number;
  contentHash: string;
  refId?: string;
  delta: DeltaType;
  deltaRatio: number;
  turn: number;
  sourceAction: string;
  createdAt: string;
};

const FILE_PATH_EXTENSIONS = ['ts', 'js', 'json', 'md', 'py', 'sh', 'yaml', 'yml', 'toml', 'txt'];
const FILE_EXTENSION_PATTERN = new RegExp(`\\.(${FILE_PATH_EXTENSIONS.join('|')})(?:$|[?#\\s])`, 'i');

function normalizeExtractedPath(value: string): string {
  return value
    .trim()
    .replace(/^['"`]+/, '')
    .replace(/["'`),.;:]+$/, '');
}

function estimateDiffRatio(oldContent: string, newContent: string): number {
  const oldLength = oldContent.length;
  const newLength = newContent.length;
  const maxLength = Math.max(oldLength, newLength);

  if (maxLength === 0) return 0;

  const minLength = Math.min(oldLength, newLength);
  let diffChars = Math.abs(oldLength - newLength);

  for (let index = 0; index < minLength; index += 1) {
    if (oldContent[index] !== newContent[index]) {
      diffChars += 1;
    }
  }

  return Math.min(1, diffChars / maxLength);
}

function maybeReadPayloadContent(db: DatabaseSync, refId?: string): string | undefined {
  if (typeof refId !== 'string' || refId.trim().length === 0) return undefined;

  const row = db
    .prepare('SELECT storage_path FROM payload_refs WHERE ref_id = ? LIMIT 1')
    .get(refId) as { storage_path: string | null } | undefined;

  if (!row || typeof row.storage_path !== 'string' || row.storage_path.trim().length === 0) {
    return undefined;
  }

  const storagePath = row.storage_path.trim();
  if (!path.isAbsolute(storagePath)) {
    return undefined;
  }

  if (!fs.existsSync(storagePath)) {
    return undefined;
  }

  try {
    return fs.readFileSync(storagePath, 'utf8');
  } catch {
    return undefined;
  }
}

function getMessageContentAtTurn(db: DatabaseSync, conversationId: string, turn: number): string | undefined {
  const row = db
    .prepare(
      `SELECT m.content
         FROM messages m
         INNER JOIN conversations c ON c.id = m.conversation_id
        WHERE c.session_key = ?
          AND m.message_index = ?
        LIMIT 1`,
    )
    .get(conversationId, turn) as { content: string | null } | undefined;

  if (!row || typeof row.content !== 'string') {
    return undefined;
  }

  return row.content;
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function toFileUri(filePath: string): string {
  const candidate = filePath.trim();

  if (candidate.startsWith('file://')) {
    return candidate;
  }

  if (!looksLikeFilePath(candidate)) {
    return candidate;
  }

  const resolvedPath = candidate.startsWith('~/')
    ? path.join(homedir(), candidate.slice(2))
    : (path.isAbsolute(candidate) ? candidate : path.resolve(candidate));

  return pathToFileURL(resolvedPath).toString();
}

export function looksLikeFilePath(content: string): boolean {
  const candidate = content.trim();
  if (candidate.length === 0) return false;

  if (candidate.startsWith('file://')) return true;
  if (/^[a-z]+:\/\//i.test(candidate) || candidate.startsWith('//')) return false;
  if (candidate.startsWith('/') || candidate.startsWith('~/') || candidate.startsWith('./') || candidate.startsWith('../')) {
    return true;
  }

  return FILE_EXTENSION_PATTERN.test(candidate);
}

export function extractFilePath(content: string): string | null {
  const sample = content.slice(0, 500);

  const fileUriMatch = sample.match(/file:\/\/[\w./~%-]+/i);
  if (fileUriMatch && fileUriMatch[0]) {
    return normalizeExtractedPath(fileUriMatch[0]);
  }

  const pathLikePattern = /(?:^|\s)(~\/[\w./-]+|\.\.?\/[\w./-]+|\/[\w./-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = pathLikePattern.exec(sample)) !== null) {
    const candidate = normalizeExtractedPath(match[1] ?? '');
    if (looksLikeFilePath(candidate)) {
      return candidate;
    }
  }

  const extensionMatch = sample.match(/[\w./~-]+\.(?:ts|js|json|md|py|sh|yaml|yml|toml|txt)\b/i);
  if (extensionMatch && extensionMatch[0]) {
    const candidate = normalizeExtractedPath(extensionMatch[0]);
    if (looksLikeFilePath(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function insertResourceVersion(db: DatabaseSync, version: ResourceVersion): number {
  const result = db
    .prepare(
      `INSERT INTO resource_versions (
        conversation_id,
        resource_uri,
        parent_id,
        content_hash,
        ref_id,
        delta,
        delta_ratio,
        turn,
        source_action,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      version.conversationId,
      version.resourceUri,
      version.parentId ?? null,
      version.contentHash,
      version.refId ?? null,
      version.delta,
      version.deltaRatio,
      version.turn,
      version.sourceAction,
      version.createdAt,
    );

  const insertedId = result.lastInsertRowid;
  return typeof insertedId === 'bigint' ? Number(insertedId) : insertedId;
}

export function getLatestResourceVersion(
  db: DatabaseSync,
  conversationId: string,
  resourceUri: string,
): (ResourceVersion & { id: number }) | null {
  const row = db
    .prepare(
      `SELECT
        id,
        conversation_id,
        resource_uri,
        parent_id,
        content_hash,
        ref_id,
        delta,
        delta_ratio,
        turn,
        source_action,
        created_at
       FROM resource_versions
       WHERE conversation_id = ?
         AND resource_uri = ?
       ORDER BY id DESC
       LIMIT 1`,
    )
    .get(conversationId, resourceUri) as {
    id: number;
    conversation_id: string;
    resource_uri: string;
    parent_id: number | null;
    content_hash: string;
    ref_id: string | null;
    delta: DeltaType;
    delta_ratio: number;
    turn: number;
    source_action: string | null;
    created_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    resourceUri: row.resource_uri,
    parentId: typeof row.parent_id === 'number' ? row.parent_id : undefined,
    contentHash: row.content_hash,
    refId: row.ref_id ?? undefined,
    delta: row.delta,
    deltaRatio: typeof row.delta_ratio === 'number' ? row.delta_ratio : 0,
    turn: row.turn,
    sourceAction: row.source_action ?? 'read',
    createdAt: row.created_at,
  };
}

export function computeDelta(
  oldHash: string | null,
  newHash: string,
  oldContent?: string,
  newContent?: string,
): { delta: DeltaType; deltaRatio: number } {
  if (oldHash === null) {
    return { delta: 'new', deltaRatio: 0 };
  }

  if (oldHash === newHash) {
    return { delta: 'unchanged', deltaRatio: 0 };
  }

  if (typeof oldContent !== 'string' || typeof newContent !== 'string') {
    return { delta: 'large', deltaRatio: 1 };
  }

  const ratio = estimateDiffRatio(oldContent, newContent);
  const normalizedRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 1;

  return {
    delta: normalizedRatio < 0.15 ? 'small' : 'large',
    deltaRatio: normalizedRatio,
  };
}

export function processFileRead(
  db: DatabaseSync,
  conversationId: string,
  filePath: string,
  content: string,
  turn: number,
  refId?: string,
): ResourceVersion & { id: number } {
  const resourceUri = toFileUri(filePath);
  const previous = getLatestResourceVersion(db, conversationId, resourceUri);
  const contentHash = hashContent(content);

  const previousContent = previous
    ? (getMessageContentAtTurn(db, conversationId, previous.turn) ?? maybeReadPayloadContent(db, previous.refId))
    : undefined;

  const { delta, deltaRatio } = computeDelta(
    previous?.contentHash ?? null,
    contentHash,
    previousContent,
    content,
  );

  const createdAt = new Date().toISOString();
  const version: ResourceVersion = {
    conversationId,
    resourceUri,
    parentId: previous?.id,
    contentHash,
    refId,
    delta,
    deltaRatio,
    turn,
    sourceAction: 'read',
    createdAt,
  };

  const id = insertResourceVersion(db, version);
  return { id, ...version };
}

export function buildResourceToken(
  version: ResourceVersion & { id: number },
  _prevVersion?: (ResourceVersion & { id: number }) | null,
): string {
  if (version.delta === 'unchanged') {
    return `<<RESOURCE_UNCHANGED:${version.resourceUri}:${version.contentHash}:${version.turn}>>`;
  }

  if (version.delta === 'small') {
    const ratio = version.deltaRatio.toFixed(4);
    return `<<RESOURCE_DELTA:${version.resourceUri}:${version.contentHash}:${ratio}:${version.turn}>>`;
  }

  return '';
}
