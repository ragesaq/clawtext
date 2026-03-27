/**
 * Session Intelligence SQLite connection and transaction helpers.
 *
 * Opens a per-workspace database at:
 *   {workspacePath}/.clawtext/session-intelligence.db
 * and enforces path scoping to prevent escape outside workspace.
 */

import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from './schema';

const DB_DIR = '.clawtext';
const DB_FILE = 'session-intelligence.db';

function assertPathWithinWorkspace(workspacePath: string, targetPath: string): void {
  const workspaceResolved = path.resolve(workspacePath);
  const targetResolved = path.resolve(targetPath);
  const workspacePrefix = workspaceResolved.endsWith(path.sep) ? workspaceResolved : `${workspaceResolved}${path.sep}`;

  if (targetResolved !== workspaceResolved && !targetResolved.startsWith(workspacePrefix)) {
    throw new Error(
      `[clawtext-session-intelligence] Refusing DB path outside workspace: ${targetResolved} (workspace: ${workspaceResolved})`,
    );
  }
}

export function openDatabase(workspacePath: string): DatabaseSync {
  const workspaceResolved = path.resolve(workspacePath);
  const dbDir = path.resolve(workspaceResolved, DB_DIR);
  const dbPath = path.resolve(dbDir, DB_FILE);

  assertPathWithinWorkspace(workspaceResolved, dbPath);

  fs.mkdirSync(dbDir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  migrate(db);
  return db;
}

export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // rollback best effort
    }
    throw error;
  }
}
