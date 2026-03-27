import type { DatabaseSync } from 'node:sqlite';
import type { CompactionTriggerConfig } from './types';

const ENGINE_ID = 'clawtext-session-intelligence';

export const DEFAULT_TRIGGER_CONFIG: CompactionTriggerConfig = {
  pressureThreshold: 0.75,
  minMessages: 10,
  cooldownMs: 60_000,
};

export function resolveTriggerConfig(partial?: Partial<CompactionTriggerConfig>): CompactionTriggerConfig {
  return {
    pressureThreshold: partial?.pressureThreshold ?? DEFAULT_TRIGGER_CONFIG.pressureThreshold,
    minMessages: partial?.minMessages ?? DEFAULT_TRIGGER_CONFIG.minMessages,
    cooldownMs: partial?.cooldownMs ?? DEFAULT_TRIGGER_CONFIG.cooldownMs,
  };
}

export function getMessageCount(db: DatabaseSync, conversationId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ?')
    .get(conversationId) as { count: number | null };

  return typeof row.count === 'number' ? row.count : 0;
}

export function evaluateTrigger(params: {
  db: DatabaseSync;
  conversationId: number;
  currentTokenCount: number;
  tokenBudget: number;
  triggerConfig: CompactionTriggerConfig;
}): { shouldCompact: boolean; reason: string } {
  const messageCount = getMessageCount(params.db, params.conversationId);
  if (messageCount < params.triggerConfig.minMessages) {
    return { shouldCompact: false, reason: 'too_few_messages' };
  }

  const pressure = params.tokenBudget > 0
    ? params.currentTokenCount / params.tokenBudget
    : 0;

  if (pressure < params.triggerConfig.pressureThreshold) {
    return { shouldCompact: false, reason: 'below_threshold' };
  }

  const lastEvent = params.db
    .prepare(
      `SELECT triggered_at
         FROM compaction_events
        WHERE conversation_id = ?
        ORDER BY triggered_at DESC, id DESC
        LIMIT 1`,
    )
    .get(params.conversationId) as { triggered_at: string } | undefined;

  if (lastEvent?.triggered_at) {
    const lastTriggeredAtMs = Date.parse(lastEvent.triggered_at);
    if (Number.isFinite(lastTriggeredAtMs)) {
      const elapsedMs = Date.now() - lastTriggeredAtMs;
      if (elapsedMs < params.triggerConfig.cooldownMs) {
        return { shouldCompact: false, reason: 'cooldown' };
      }
    }
  }

  return { shouldCompact: true, reason: 'pressure_threshold' };
}

export function recordCompactionEvent(params: {
  db: DatabaseSync;
  conversationId: number;
  triggerReason: string;
  pressureBefore: number;
  pressureAfter?: number;
  messagesBefore: number;
  messagesAfter?: number;
  summaryNodeId?: number;
  outcome: 'success' | 'skipped' | 'failed';
}): void {
  try {
    params.db
      .prepare(
        `INSERT INTO compaction_events
          (conversation_id, triggered_at, trigger_reason, pressure_before, pressure_after, messages_before, messages_after, summary_node_id, outcome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        params.conversationId,
        new Date().toISOString(),
        params.triggerReason,
        params.pressureBefore,
        params.pressureAfter ?? null,
        params.messagesBefore,
        params.messagesAfter ?? null,
        params.summaryNodeId ?? null,
        params.outcome,
      );
  } catch (error) {
    console.warn(
      `[${ENGINE_ID}] Failed to record compaction event: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
