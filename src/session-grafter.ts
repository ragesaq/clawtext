/**
 * session-grafter.ts
 *
 * Minimal bridge compaction for cross-provider session continuity.
 *
 * When a session switches providers (e.g., Anthropic → OpenAI), the tool call
 * ID formats are incompatible. Full compaction loses conversation structure.
 * Session grafting preserves the conversation flow by surgically flattening
 * only the tool call artifacts into readable text, leaving everything else intact.
 *
 * The grafted output is provider-agnostic: no tool call IDs, no provider-specific
 * message formats. Any provider can continue the conversation naturally.
 *
 * This is a ClawText innovation — OpenClaw core doesn't handle cross-provider
 * session continuity. We fill the gap at the context management layer.
 *
 * ## Design Principles
 *
 * 1. **Minimal surgery.** Only tool call pairs (call + result) get flattened.
 *    User messages, assistant text, system messages pass through unchanged.
 *
 * 2. **Readable output.** Flattened tool calls read like natural conversation:
 *    "I ran `find /etc -name config` and got: /etc/config.json"
 *    Not: "[function_call id=toolu_abc name=exec args=...]"
 *
 * 3. **Structural preservation.** The conversation turn structure survives.
 *    The model on the new provider can follow the reasoning thread.
 *
 * 4. **Idempotent.** Running the grafter on already-grafted content is a no-op.
 *    Grafted messages have no tool call blocks to flatten.
 *
 * 5. **Transcript-safe.** The grafter produces a new message array. The original
 *    transcript is never mutated. The grafted output can be used for the next
 *    turn while the original transcript remains the durable record.
 */

export interface GraftOptions {
  /** Maximum chars per tool result in the flattened output. Default: 2000 */
  maxResultChars?: number;
  /** Whether to include the tool name in the flattened output. Default: true */
  includeToolName?: boolean;
  /** Whether to include the arguments in the flattened output. Default: true for read/exec, false for write */
  includeArguments?: boolean | ((toolName: string) => boolean);
  /** Prefix for grafted tool output blocks. Default: "📎" */
  graftMarker?: string;
}

interface ContentBlock {
  type: string;
  id?: string;
  name?: string;
  text?: string;
  arguments?: string | Record<string, unknown>;
  [key: string]: unknown;
}

interface ToolResultContent {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface Message {
  role: string;
  content?: string | ContentBlock[];
  toolCallId?: string;
  toolUseId?: string;
  toolName?: string;
  api?: string;
  provider?: string;
  [key: string]: unknown;
}

export interface GraftResult {
  /** The grafted message array — provider-agnostic, ready for any provider */
  messages: Message[];
  /** Whether any grafting was performed */
  grafted: boolean;
  /** Number of tool call pairs flattened */
  flattenedPairs: number;
  /** Number of orphaned tool results removed */
  orphansRemoved: number;
  /** Provider API types detected in the original messages */
  detectedApis: Set<string>;
}

/** Known API types and their tool call ID prefixes */
const API_ID_PATTERNS: Record<string, RegExp> = {
  'anthropic': /^toolu_/,
  'openai-responses': /^call_/,
  'openai-chat': /^call_/,
};

/**
 * Detect the API type from a tool call ID format.
 */
function detectApiFromId(id: string): string | null {
  for (const [api, pattern] of Object.entries(API_ID_PATTERNS)) {
    if (pattern.test(id)) return api;
  }
  return null;
}

/**
 * Detect all API types present in a message array by examining
 * the `api` field on assistant messages and tool call ID formats.
 */
export function detectProviderApis(messages: Message[]): Set<string> {
  const apis = new Set<string>();

  for (const msg of messages) {
    // Check explicit api field
    if (msg.api && typeof msg.api === 'string') {
      apis.add(msg.api);
    }

    // Check tool call ID formats
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'toolCall' && typeof block.id === 'string') {
          const api = detectApiFromId(block.id);
          if (api) apis.add(api);
        }
      }
    }

    if (msg.role === 'toolResult') {
      const id = (msg.toolCallId ?? msg.toolUseId) as string | undefined;
      if (id) {
        const api = detectApiFromId(id);
        if (api) apis.add(api);
      }
    }
  }

  return apis;
}

/**
 * Check whether a message array needs grafting.
 * Returns true if multiple incompatible API types are detected,
 * or if the target provider API differs from the history's API.
 */
export function needsGrafting(messages: Message[], targetApi?: string): boolean {
  const apis = detectProviderApis(messages);

  // Multiple API types in history = definitely needs grafting
  if (apis.size > 1) return true;

  // Single API type but different from target = needs grafting
  if (targetApi && apis.size === 1 && !apis.has(targetApi)) return true;

  return false;
}

/**
 * Format tool arguments for human-readable output.
 */
function formatArguments(args: string | Record<string, unknown> | undefined): string {
  if (!args) return '';
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args);
      return formatArguments(parsed);
    } catch {
      return args;
    }
  }

  // For exec/read commands, show the command/path directly
  if ('command' in args && typeof args.command === 'string') {
    return `\`${args.command}\``;
  }
  if ('file' in args && typeof args.file === 'string') {
    return `\`${args.file}\``;
  }
  if ('path' in args && typeof args.path === 'string') {
    return `\`${args.path}\``;
  }
  if ('query' in args && typeof args.query === 'string') {
    return `"${args.query}"`;
  }

  // For everything else, compact JSON
  const json = JSON.stringify(args);
  if (json.length > 200) return json.slice(0, 197) + '...';
  return json;
}

/**
 * Extract text from tool result content.
 */
function extractResultText(content: string | ToolResultContent[] | undefined): string {
  if (!content) return '(no output)';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text!)
      .join('\n');
  }
  return '(no output)';
}

/**
 * Truncate text to a maximum length, preserving meaningful endings.
 */
function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 20) + '\n…[truncated]';
}

/**
 * Default argument inclusion heuristic.
 * Show arguments for read-type tools (exec, read, web_search, etc.)
 * Hide arguments for write-type tools (write, edit) since the result
 * confirms what was written.
 */
function defaultIncludeArgs(toolName: string): boolean {
  const writeTools = new Set(['write', 'edit', 'memory_set']);
  return !writeTools.has(toolName);
}

/**
 * Graft a session's message history for cross-provider continuity.
 *
 * Walks the message array and flattens tool call pairs (assistant toolCall block +
 * matching toolResult message) into human-readable text blocks within the
 * assistant message.
 *
 * The output is provider-agnostic and can be replayed through any provider's API.
 */
export function graftSession(messages: Message[], options: GraftOptions = {}): GraftResult {
  const {
    maxResultChars = 2000,
    includeToolName = true,
    includeArguments = defaultIncludeArgs,
    graftMarker = '📎',
  } = options;

  const shouldIncludeArgs = typeof includeArguments === 'function'
    ? includeArguments
    : () => includeArguments;

  const detectedApis = detectProviderApis(messages);
  const output: Message[] = [];
  let flattenedPairs = 0;
  let orphansRemoved = 0;
  let grafted = false;

  // Build a map of tool call ID → tool result message for quick lookup
  const toolResultMap = new Map<string, Message>();
  for (const msg of messages) {
    if (msg.role === 'toolResult') {
      const id = (msg.toolCallId ?? msg.toolUseId) as string | undefined;
      if (id) toolResultMap.set(id, msg);
    }
  }

  // Track which tool result IDs we've consumed (grafted into assistant messages)
  const consumedResultIds = new Set<string>();

  for (const msg of messages) {
    // Skip tool results — they'll be grafted into their parent assistant message
    if (msg.role === 'toolResult') {
      const id = (msg.toolCallId ?? msg.toolUseId) as string | undefined;
      if (id && consumedResultIds.has(id)) {
        continue; // Already grafted
      }
      // Orphaned tool result (no matching tool call) — drop it
      orphansRemoved++;
      grafted = true;
      continue;
    }

    // Non-assistant messages pass through unchanged
    if (msg.role !== 'assistant') {
      output.push(msg);
      continue;
    }

    // Assistant messages: check for tool call blocks
    const content = msg.content;
    if (!Array.isArray(content)) {
      output.push(msg);
      continue;
    }

    const hasToolCalls = content.some((block) => block.type === 'toolCall');
    if (!hasToolCalls) {
      output.push(msg);
      continue;
    }

    // Flatten tool calls into text blocks
    const newContent: ContentBlock[] = [];

    for (const block of content) {
      if (block.type !== 'toolCall') {
        // Non-tool-call blocks (text, thinking, etc.) pass through
        newContent.push(block);
        continue;
      }

      // This is a tool call block — flatten it
      grafted = true;
      const toolName = block.name ?? 'unknown';
      const toolId = block.id as string;
      const result = toolResultMap.get(toolId);

      if (result) {
        consumedResultIds.add(toolId);
        flattenedPairs++;
      }

      // Build the flattened text
      const parts: string[] = [];

      if (includeToolName) {
        parts.push(`${graftMarker} **${toolName}**`);
      }

      if (shouldIncludeArgs(toolName)) {
        const argsText = formatArguments(block.arguments as string | Record<string, unknown>);
        if (argsText) parts.push(argsText);
      }

      if (result) {
        const resultText = extractResultText(result.content as string | ToolResultContent[]);
        const truncated = truncate(resultText, maxResultChars);
        if (truncated && truncated !== '(no output)') {
          parts.push(`→ ${truncated}`);
        } else {
          parts.push('→ (no output)');
        }
      } else {
        parts.push('→ (no result recorded)');
      }

      newContent.push({
        type: 'text',
        text: '\n' + parts.join('\n') + '\n',
      });
    }

    // Rebuild the assistant message without tool-call-specific fields
    const { api: _api, provider: _provider, ...cleanMsg } = msg;
    output.push({
      ...cleanMsg,
      content: newContent,
      // Mark as grafted so we can detect idempotency
      _grafted: true,
    } as Message);
  }

  // Second pass: catch any unconsumed tool results (shouldn't happen if
  // the tool call block existed, but defensive)
  // These are already handled above via the orphan path

  return {
    messages: output,
    grafted,
    flattenedPairs,
    orphansRemoved,
    detectedApis,
  };
}

/**
 * Graft a session transcript file (.jsonl) and write the grafted version.
 * The original file is preserved; the grafted version is written to a new path.
 *
 * This is the file-level counterpart to graftSession() which operates on
 * in-memory message arrays.
 */
export async function graftTranscript(
  inputPath: string,
  outputPath: string,
  options: GraftOptions = {},
): Promise<{ grafted: boolean; flattenedPairs: number; orphansRemoved: number }> {
  const { readFileSync, writeFileSync } = await import('fs');

  const content = readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  // Extract messages from JSONL entries
  const entries: Array<{ entry: Record<string, unknown>; message: Message }> = [];
  const nonMessageLines: string[] = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.message && entry.message.role) {
        entries.push({ entry, message: entry.message });
      } else {
        nonMessageLines.push(line);
      }
    } catch {
      nonMessageLines.push(line);
    }
  }

  const messages = entries.map((e) => e.message);
  const result = graftSession(messages, options);

  if (!result.grafted) {
    // No grafting needed — copy as-is
    writeFileSync(outputPath, content);
    return { grafted: false, flattenedPairs: 0, orphansRemoved: 0 };
  }

  // Rebuild JSONL with grafted messages
  // We need to map grafted messages back to their original entries
  const outputLines: string[] = [];
  let graftedMsgIndex = 0;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.message && entry.message.role) {
        if (graftedMsgIndex < result.messages.length) {
          const graftedMsg = result.messages[graftedMsgIndex];
          // Check if this message was dropped (tool result consumed by grafting)
          if (entry.message.role === 'toolResult') {
            const id = entry.message.toolCallId ?? entry.message.toolUseId;
            // If this tool result was grafted into its parent, skip it
            // We detect this by checking if the result message appears in the output
            const inOutput = result.messages.some(
              (m) => m.role === 'toolResult' && ((m.toolCallId ?? m.toolUseId) === id),
            );
            if (!inOutput) {
              continue; // Skip — grafted or orphaned
            }
          }
          outputLines.push(JSON.stringify({ ...entry, message: graftedMsg }));
          graftedMsgIndex++;
        }
      } else {
        outputLines.push(line);
      }
    } catch {
      outputLines.push(line);
    }
  }

  writeFileSync(outputPath, outputLines.join('\n') + '\n');

  return {
    grafted: true,
    flattenedPairs: result.flattenedPairs,
    orphansRemoved: result.orphansRemoved,
  };
}
