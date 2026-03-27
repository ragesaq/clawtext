/**
 * Session Intelligence SQLite schema and migrations.
 *
 * Walk 1a initializes the foundational persistence tables:
 * - schema_version
 * - conversations
 * - messages
 * - message_parts
 */

import type { DatabaseSync } from 'node:sqlite';

const LATEST_SCHEMA_VERSION = 1;

function nowIso(): string {
  return new Date().toISOString();
}

function createBaseSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_key TEXT NOT NULL UNIQUE,
      session_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      metadata TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'active',
      token_count INTEGER,
      message_index INTEGER NOT NULL,
      is_heartbeat INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS message_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id),
      part_type TEXT NOT NULL,
      content TEXT,
      metadata TEXT
    );
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_conversation_index ON messages(conversation_id, message_index);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_message_parts_message_id ON message_parts(message_id);');
}

export function migrate(db: DatabaseSync): void {
  createBaseSchema(db);

  const currentVersionRow = db
    .prepare('SELECT MAX(version) AS version FROM schema_version')
    .get() as { version?: number | null } | undefined;

  const currentVersion = typeof currentVersionRow?.version === 'number' ? currentVersionRow.version : 0;

  if (currentVersion > LATEST_SCHEMA_VERSION) {
    console.warn(
      `[clawtext-session-intelligence] Database schema version (${currentVersion}) is newer than this engine (${LATEST_SCHEMA_VERSION}).`,
    );
    return;
  }

  if (currentVersion < 1) {
    createBaseSchema(db);
    db
      .prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)')
      .run(1, nowIso());
  }
}

export { LATEST_SCHEMA_VERSION };
