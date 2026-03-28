import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { migrate, LATEST_SCHEMA_VERSION } from '../dist/session-intelligence/schema.js';
import { externalizePayload, recoverPayload } from '../dist/session-intelligence/large-file.js';
import {
  insertPayloadRef,
  getPayloadRef,
  markPayloadRefExpired,
} from '../dist/session-intelligence/payload-store.js';
import {
  detectCallType,
  insertToolCallMeta,
  getDecayEligibleMessages,
  markConsumed,
  markExternalized,
  DECAY_WINDOWS,
} from '../dist/session-intelligence/tool-tracker.js';
import {
  hashContent,
  computeDelta,
  toFileUri,
  processFileRead,
} from '../dist/session-intelligence/resource-versions.js';
import {
  insertSlotAssociation,
  getSlotAssociations,
  getRecoveryPriority,
} from '../dist/session-intelligence/slot-associations.js';
import { expand } from '../dist/session-intelligence/recall.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function createTestDb() {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  return db;
}

// conversation id counter for unique integer IDs
let _convIdCounter = 1;

function seedConversation(db, label) {
  const id = _convIdCounter++;
  db.prepare(`INSERT INTO conversations (id, session_key, session_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)`)
    .run(id, `sk-${label}`, `si-${label}`, new Date().toISOString(), new Date().toISOString());
  return id;
}

let _tmpDirs = [];

function createTempDir() {
  const dir = path.join('/tmp', `clawtext-si-test-${process.pid}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  _tmpDirs.push(dir);
  return dir;
}

function cleanupTempDirs() {
  for (const dir of _tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  _tmpDirs = [];
}

process.on('exit', cleanupTempDirs);

// ── 1. Schema migration ───────────────────────────────────────────────────────

test('schema: LATEST_SCHEMA_VERSION is 12', () => {
  assert.equal(LATEST_SCHEMA_VERSION, 12);
});

test('schema: migrate() on fresh DB creates all required tables', () => {
  const db = createTestDb();
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all()
    .map((r) => r.name);

  const required = [
    'messages',
    'summaries',
    'state_slots',
    'compaction_events',
    'payload_refs',
    'tool_call_meta',
    'resource_versions',
    'resource_slot_associations',
    'schema_version',
  ];
  for (const t of required) {
    assert.ok(tables.includes(t), `missing table: ${t}`);
  }
});

test('schema: migrate() on existing DB is idempotent', () => {
  const db = createTestDb();
  // Running again should not throw
  migrate(db);
  const version = db
    .prepare(`SELECT MAX(version) as v FROM schema_version`)
    .get().v;
  assert.equal(version, 12);
});

// ── 2. Payload ref lifecycle ──────────────────────────────────────────────────

test('payload: externalizePayload writes file and returns storagePath + contentHash', () => {
  const wp = createTempDir();
  const content = 'x'.repeat(5000);
  const ref = externalizePayload(wp, 'session-1', content);
  assert.ok(ref.storagePath, 'storagePath should be set');
  assert.ok(ref.contentHash, 'contentHash should be set');
  assert.ok(fs.existsSync(ref.storagePath), 'file should exist on disk');
  assert.equal(ref.originalSize, content.length);
});

test('payload: insertPayloadRef + getPayloadRef round-trips correctly', () => {
  const db = createTestDb();
  const wp = createTempDir();
  const convId = seedConversation(db, 'session-2');
  const ref = externalizePayload(wp, String(convId), 'hello world payload');
  insertPayloadRef(db, { ...ref, conversationId: String(convId), status: 'active' });
  const stored = getPayloadRef(db, ref.refId);
  assert.ok(stored, 'should find stored ref');
  assert.equal(stored.refId, ref.refId);
  assert.equal(stored.status, 'active');
});

test('payload: recoverPayload returns original content with hash match', () => {
  const db = createTestDb();
  const wp = createTempDir();
  const convId3 = seedConversation(db, 'session-3');
  const content = 'recover me ' + 'y'.repeat(200);
  const ref = externalizePayload(wp, String(convId3), content);
  insertPayloadRef(db, { ...ref, conversationId: String(convId3), status: 'active' });
  const recovered = recoverPayload(db, ref.refId, wp);
  assert.equal(recovered, content);
});

test('payload: recoverPayload returns null for missing file without throwing', () => {
  const db = createTestDb();
  const wp = createTempDir();
  const convId4 = seedConversation(db, 'session-4');
  const ref = externalizePayload(wp, String(convId4), 'original');
  insertPayloadRef(db, {
    ...ref,
    storagePath: '/tmp/does-not-exist-ever.txt',
    conversationId: String(convId4),
    status: 'active',
  });
  db.prepare(`UPDATE payload_refs SET storage_path = ? WHERE ref_id = ?`)
    .run('/tmp/does-not-exist-ever.txt', ref.refId);
  const result = recoverPayload(db, ref.refId, wp);
  assert.equal(result, null);
});

test('payload: markPayloadRefExpired causes recoverPayload to return null', () => {
  const db = createTestDb();
  const wp = createTempDir();
  const convId5 = seedConversation(db, 'session-5');
  const content = 'expire me';
  const ref = externalizePayload(wp, String(convId5), content);
  insertPayloadRef(db, { ...ref, conversationId: String(convId5), status: 'active' });
  markPayloadRefExpired(db, ref.refId);
  const result = recoverPayload(db, ref.refId, wp);
  assert.equal(result, null);
  const stored = getPayloadRef(db, ref.refId);
  assert.equal(stored?.status, 'expired');
});

// ── 3. Tool-call metadata ─────────────────────────────────────────────────────

test('tool-tracker: detectCallType classifies correctly', () => {
  assert.equal(detectCallType('bash -c ls /tmp', 'tool'), 'exec');
  assert.equal(detectCallType('read_file result: contents here', 'tool'), 'read');
  assert.equal(detectCallType('web_search results: found 10 results', 'tool'), 'search');
  assert.equal(detectCallType('send_message to channel', 'tool'), 'action');
  assert.equal(detectCallType('some random tool output', 'assistant'), 'unknown');
});

test('tool-tracker: DECAY_WINDOWS has correct values', () => {
  assert.equal(DECAY_WINDOWS['exec'], 2);
  assert.equal(DECAY_WINDOWS['action'], 1);
  assert.equal(DECAY_WINDOWS['read'], 5);
  assert.equal(DECAY_WINDOWS['search'], 8);
});

test('tool-tracker: insertToolCallMeta + getDecayEligibleMessages returns eligible rows', () => {
  const db = createTestDb();
  const sessionKey = 'sk-conv-1';
  const cid1 = seedConversation(db, 'conv-1');
  db.prepare(`INSERT INTO messages (conversation_id, role, content, content_type, message_index, token_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(cid1, 'tool', 'exec output here', 'tool_result', 0, 50, new Date().toISOString());
  const msgId = db.prepare('SELECT id FROM messages WHERE conversation_id = ? LIMIT 1').get(cid1).id;

  insertToolCallMeta(db, {
    messageId: String(msgId),
    conversationId: sessionKey,
    callType: 'exec',
    resultTokens: 50,
    turnNumber: 0,
    decayEligibleTurn: 2,
  });

  // At turn 3, exec is eligible (decayEligibleTurn=2 <= 3)
  const eligible = getDecayEligibleMessages(db, sessionKey, 3);
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].callType, 'exec');
});

test('tool-tracker: markConsumed removes row from decay-eligible', () => {
  const db = createTestDb();
  const cid2 = seedConversation(db, 'conv-2');
  db.prepare(`INSERT INTO messages (conversation_id, role, content, content_type, message_index, token_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(cid2, 'tool', 'output', 'tool_result', 0, 10, new Date().toISOString());
  const msgId = db.prepare('SELECT id FROM messages WHERE conversation_id = ? LIMIT 1').get(cid2).id;

  insertToolCallMeta(db, {
    messageId: String(msgId),
    conversationId: String(cid2),
    callType: 'exec',
    resultTokens: 10,
    turnNumber: 0,
    decayEligibleTurn: 2,
  });

  markConsumed(db, String(msgId), 1);
  const eligible = getDecayEligibleMessages(db, String(cid2), 5);
  assert.equal(eligible.length, 0);
});

test('tool-tracker: markExternalized removes row from decay-eligible', () => {
  const db = createTestDb();
  const cid3 = seedConversation(db, 'conv-3');
  db.prepare(`INSERT INTO messages (conversation_id, role, content, content_type, message_index, token_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(cid3, 'tool', 'output', 'tool_result', 0, 10, new Date().toISOString());
  const msgId = db.prepare('SELECT id FROM messages WHERE conversation_id = ? LIMIT 1').get(cid3).id;

  insertToolCallMeta(db, {
    messageId: String(msgId),
    conversationId: String(cid3),
    callType: 'exec',
    resultTokens: 10,
    turnNumber: 0,
    decayEligibleTurn: 2,
  });

  markExternalized(db, String(msgId));
  const eligible = getDecayEligibleMessages(db, String(cid3), 5);
  assert.equal(eligible.length, 0);
});

// ── 4. Resource versioning ────────────────────────────────────────────────────

test('resource-versions: hashContent is stable', () => {
  const h1 = hashContent('hello world');
  const h2 = hashContent('hello world');
  assert.equal(h1, h2);
  assert.notEqual(h1, hashContent('different'));
});

test('resource-versions: computeDelta null → new', () => {
  const { delta, deltaRatio } = computeDelta(null, hashContent('content'));
  assert.equal(delta, 'new');
  assert.equal(deltaRatio, 0);
});

test('resource-versions: computeDelta same hash → unchanged', () => {
  const h = hashContent('same content');
  const { delta } = computeDelta(h, h);
  assert.equal(delta, 'unchanged');
});

test('resource-versions: computeDelta large change → large', () => {
  const { delta } = computeDelta(
    hashContent('hello world'),
    hashContent('completely different content with lots of new words'),
    'hello world',
    'completely different content with lots of new words',
  );
  assert.equal(delta, 'large');
});

test('resource-versions: toFileUri normalizes absolute paths', () => {
  const uri = toFileUri('/home/lumadmin/foo.ts');
  assert.equal(uri, 'file:///home/lumadmin/foo.ts');
});

test('resource-versions: processFileRead first read → new version', () => {
  const db = createTestDb();
  const wp = createTempDir();
  const version = processFileRead(db, 'conv-rv-1', '/tmp/test.ts', 'file content here', 0);
  assert.equal(version.delta, 'new');
  assert.ok(version.id > 0);
  assert.equal(version.parentId, undefined);
});

test('resource-versions: processFileRead second read same content → unchanged with parentId', () => {
  const db = createTestDb();
  const wp = createTempDir();
  const content = 'file content unchanged';
  processFileRead(db, 'conv-rv-2', '/tmp/unchanged.ts', content, 0);
  const v2 = processFileRead(db, 'conv-rv-2', '/tmp/unchanged.ts', content, 1);
  assert.equal(v2.delta, 'unchanged');
  assert.ok(typeof v2.parentId === 'number', 'parentId should be set on second read');
});

test('resource-versions: processFileRead changed content → large version', () => {
  const db = createTestDb();
  processFileRead(db, 'conv-rv-3', '/tmp/changed.ts', 'original content', 0);
  const v2 = processFileRead(db, 'conv-rv-3', '/tmp/changed.ts', 'x'.repeat(500), 1);
  assert.ok(v2.delta === 'large' || v2.delta === 'small', `expected large or small, got ${v2.delta}`);
});

// ── 5. Slot associations ──────────────────────────────────────────────────────

test('slot-associations: insertSlotAssociation + getSlotAssociations round-trips', () => {
  const db = createTestDb();
  insertSlotAssociation(db, {
    resourceVersionId: 1,
    conversationId: 'conv-sa-1',
    slotId: 'active_problem',
    slotType: 'active_problem',
    recoveryPriority: 'high',
    turn: 5,
    createdAt: new Date().toISOString(),
  });
  const assocs = getSlotAssociations(db, 1);
  assert.equal(assocs.length, 1);
  assert.equal(assocs[0].slotId, 'active_problem');
  assert.equal(assocs[0].recoveryPriority, 'high');
});

test('slot-associations: getRecoveryPriority returns high when any association is high', () => {
  const db = createTestDb();
  insertSlotAssociation(db, {
    resourceVersionId: 10,
    conversationId: 'c',
    slotId: 'active_problem',
    slotType: 'active_problem',
    recoveryPriority: 'high',
    turn: 1,
    createdAt: new Date().toISOString(),
  });
  assert.equal(getRecoveryPriority(db, 10), 'high');
});

test('slot-associations: getRecoveryPriority returns low when no associations', () => {
  const db = createTestDb();
  assert.equal(getRecoveryPriority(db, 999), 'low');
});

test('slot-associations: getRecoveryPriority returns normal when only normal associations', () => {
  const db = createTestDb();
  insertSlotAssociation(db, {
    resourceVersionId: 20,
    conversationId: 'c',
    slotId: 'decisions_made',
    slotType: 'decision',
    recoveryPriority: 'normal',
    turn: 1,
    createdAt: new Date().toISOString(),
  });
  assert.equal(getRecoveryPriority(db, 20), 'normal');
});

// ── 6. expand() dispatch ──────────────────────────────────────────────────────

test('expand: payload refId returns { type: payload, content, recoveryPriority }', () => {
  const db = createTestDb();
  const wp = createTempDir();
  const expConvId1 = seedConversation(db, 'conv-exp-1');
  const content = 'expandable content ' + 'z'.repeat(100);
  const ref = externalizePayload(wp, String(expConvId1), content);
  insertPayloadRef(db, { ...ref, conversationId: String(expConvId1), status: 'active' });

  const result = expand({ db, targetId: ref.refId, workspacePath: wp, sessionId: String(expConvId1) });
  assert.ok(result, 'expand should return a result');
  assert.equal(result.type, 'payload');
  assert.equal(result.content, content);
  assert.ok(['high', 'normal', 'low'].includes(result.recoveryPriority), 'recoveryPriority should be valid');
});

test('expand: unknown refId returns { type: missing }', () => {
  const db = createTestDb();
  const wp = createTempDir();
  const result = expand({ db, targetId: 'nonexistent-ref-id', workspacePath: wp, sessionId: 'conv-exp-2' });
  if (result !== null) {
    assert.equal(result.type, 'missing');
  }
});

test('expand: expired refId returns { type: expired }', () => {
  const db = createTestDb();
  const wp = createTempDir();
  const expConvId3 = seedConversation(db, 'conv-exp-3');
  const ref = externalizePayload(wp, String(expConvId3), 'expire this');
  insertPayloadRef(db, { ...ref, conversationId: String(expConvId3), status: 'active' });
  markPayloadRefExpired(db, ref.refId);

  const result = expand({ db, targetId: ref.refId, workspacePath: wp, sessionId: String(expConvId3) });
  assert.ok(result, 'should return a result');
  assert.equal(result.type, 'expired');
});
