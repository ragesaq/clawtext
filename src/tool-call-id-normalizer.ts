/**
 * tool-call-id-normalizer.ts
 *
 * Normalizes tool call IDs in session transcripts to prevent cross-provider
 * session corruption. When a session switches providers (e.g., Anthropic → OpenAI),
 * the tool call ID formats are incompatible:
 *   - Anthropic: toolu_XXXX
 *   - OpenAI: call_XXXX
 *   - Copilot/generic: various formats
 *
 * OpenAI's Responses API rejects conversations containing tool call IDs it didn't
 * issue, causing permanent session failures with:
 *   "No tool call found for function call output with call_id toolu_..."
 *
 * This module provides:
 * 1. Detection of cross-provider ID mismatches in a message array
 * 2. Normalization of tool call IDs to a provider-neutral format
 * 3. Session transcript repair for poisoned .jsonl files
 *
 * The normalization strategy uses a stable hash-based ID format that works
 * across all providers: "oc_" + first 24 chars of a deterministic hash.
 * Both the toolCall.id and toolResult.toolCallId are rewritten in lockstep
 * to maintain pairing integrity.
 */

import { createHash } from 'crypto';

/** Provider ID format detection */
type ProviderIdFormat = 'anthropic' | 'openai' | 'openclaw' | 'unknown';

function detectIdFormat(id: string): ProviderIdFormat {
  if (id.startsWith('toolu_')) return 'anthropic';
  if (id.startsWith('call_')) return 'openai';
  if (id.startsWith('oc_')) return 'openclaw';
  return 'unknown';
}

/**
 * Generate a stable, provider-neutral tool call ID.
 * Uses the original ID as input to a hash so the mapping is deterministic —
 * running the normalizer multiple times produces the same output.
 */
function normalizeToolCallId(originalId: string): string {
  // Already normalized
  if (originalId.startsWith('oc_')) return originalId;

  const hash = createHash('sha256').update(originalId).digest('hex').slice(0, 24);
  return `oc_${hash}`;
}

interface ToolCallBlock {
  type: 'toolCall';
  id: string;
  name?: string;
  arguments?: unknown;
}

interface ToolResultMessage {
  role: 'toolResult';
  toolCallId?: string;
  toolUseId?: string;
  [key: string]: unknown;
}

interface AssistantMessage {
  role: 'assistant';
  content: Array<{ type: string; id?: string; [key: string]: unknown }>;
  api?: string;
  provider?: string;
  [key: string]: unknown;
}

type Message = AssistantMessage | ToolResultMessage | { role: string; [key: string]: unknown };

export interface NormalizationResult {
  messages: Message[];
  changed: boolean;
  remappedCount: number;
  /** Map of original ID → normalized ID for audit logging */
  idMap: Map<string, string>;
}

/**
 * Detect whether a message array contains cross-provider tool call IDs.
 * Returns the set of provider formats found.
 */
export function detectCrossProviderIds(messages: Message[]): Set<ProviderIdFormat> {
  const formats = new Set<ProviderIdFormat>();

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const assistant = msg as AssistantMessage;
      if (Array.isArray(assistant.content)) {
        for (const block of assistant.content) {
          if (block.type === 'toolCall' && typeof block.id === 'string') {
            formats.add(detectIdFormat(block.id));
          }
        }
      }
    }
    if (msg.role === 'toolResult') {
      const result = msg as ToolResultMessage;
      const id = result.toolCallId ?? result.toolUseId;
      if (typeof id === 'string') {
        formats.add(detectIdFormat(id));
      }
    }
  }

  return formats;
}

/**
 * Normalize all tool call IDs in a message array to provider-neutral format.
 * Returns a new array (does not mutate input) with all IDs rewritten.
 *
 * Only rewrites IDs that are in a provider-specific format (toolu_*, call_*).
 * IDs already in oc_* format or unknown format are left alone.
 */
export function normalizeToolCallIds(messages: Message[]): NormalizationResult {
  const idMap = new Map<string, string>();
  let changed = false;
  let remappedCount = 0;

  const getOrCreateMapping = (originalId: string): string => {
    const format = detectIdFormat(originalId);
    // Only remap provider-specific formats
    if (format !== 'anthropic' && format !== 'openai') return originalId;

    if (idMap.has(originalId)) return idMap.get(originalId)!;

    const normalized = normalizeToolCallId(originalId);
    idMap.set(originalId, normalized);
    remappedCount++;
    return normalized;
  };

  const normalized = messages.map((msg) => {
    if (msg.role === 'assistant') {
      const assistant = msg as AssistantMessage;
      if (!Array.isArray(assistant.content)) return msg;

      let contentChanged = false;
      const newContent = assistant.content.map((block) => {
        if (block.type === 'toolCall' && typeof block.id === 'string') {
          const newId = getOrCreateMapping(block.id);
          if (newId !== block.id) {
            contentChanged = true;
            return { ...block, id: newId };
          }
        }
        return block;
      });

      if (contentChanged) {
        changed = true;
        return { ...assistant, content: newContent };
      }
      return msg;
    }

    if (msg.role === 'toolResult') {
      const result = msg as ToolResultMessage;
      let resultChanged = false;
      const updates: Partial<ToolResultMessage> = {};

      if (typeof result.toolCallId === 'string') {
        const newId = getOrCreateMapping(result.toolCallId);
        if (newId !== result.toolCallId) {
          updates.toolCallId = newId;
          resultChanged = true;
        }
      }
      if (typeof result.toolUseId === 'string') {
        const newId = getOrCreateMapping(result.toolUseId);
        if (newId !== result.toolUseId) {
          updates.toolUseId = newId;
          resultChanged = true;
        }
      }

      if (resultChanged) {
        changed = true;
        return { ...result, ...updates };
      }
      return msg;
    }

    return msg;
  });

  return { messages: normalized, changed, remappedCount, idMap };
}

/**
 * Repair a session transcript (.jsonl file) in place.
 * Reads the file, normalizes all tool call IDs, and writes back.
 *
 * Returns stats about the repair.
 */
export async function repairSessionTranscript(
  transcriptPath: string,
): Promise<{ repaired: boolean; remappedCount: number; lineCount: number }> {
  const { readFileSync, writeFileSync } = await import('fs');

  const content = readFileSync(transcriptPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  let totalRemapped = 0;
  let anyChanged = false;

  const repairedLines = lines.map((line) => {
    try {
      const entry = JSON.parse(line);
      if (!entry.message) return line;

      const msg = entry.message as Message;
      const { messages: [normalized], changed, remappedCount } = normalizeToolCallIds([msg]);

      if (changed) {
        anyChanged = true;
        totalRemapped += remappedCount;
        return JSON.stringify({ ...entry, message: normalized });
      }
      return line;
    } catch {
      return line; // Skip malformed lines
    }
  });

  if (anyChanged) {
    writeFileSync(transcriptPath, repairedLines.join('\n') + '\n');
  }

  return {
    repaired: anyChanged,
    remappedCount: totalRemapped,
    lineCount: lines.length,
  };
}
