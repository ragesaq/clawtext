import os from 'os';
import path from 'path';
import { DecisionTreeManager, type DecisionTreeEntry } from '../decision-tree.js';
import type { ContextSlot, SlotContext, SlotProvider } from '../slot-provider.js';

function defaultStorePath(): string {
  return path.join(os.homedir(), '.openclaw', 'workspace', 'state', 'clawtext', 'prod', 'decision-trees.json');
}

function formatGuidance(entry: DecisionTreeEntry): string {
  const lines = entry.steps.map((step, index) => `${index + 1}. ${step}`);
  return [
    '<!-- Decision Tree Guidance -->',
    `## Operational: ${entry.category}`,
    `Trigger: ${entry.trigger}`,
    'Steps:',
    ...lines,
    `Confidence: ${entry.confidence.toFixed(2)} | Last used: ${entry.lastUsed}`,
    '<!-- End Decision Tree -->',
  ].join('\n');
}

export class DecisionTreeProvider implements SlotProvider {
  readonly id = 'decision-tree';
  readonly source = 'decision-tree' as const;
  readonly priority = 50;
  readonly prunable = true;

  private readonly manager: DecisionTreeManager;
  private readonly topN: number;

  constructor(options?: { storePath?: string; manager?: DecisionTreeManager; topN?: number }) {
    this.manager = options?.manager ?? new DecisionTreeManager(options?.storePath ?? defaultStorePath());
    this.topN = Math.max(1, options?.topN ?? 4);
  }

  available(_ctx: SlotContext): boolean {
    return this.manager.load().entries.length > 0;
  }

  fill(ctx: SlotContext, budgetBytes: number): ContextSlot[] {
    const contextText = (ctx.recentTopics ?? []).join(' ').trim();
    if (!contextText) return [];

    const matches = this.manager.match(contextText, this.topN);
    if (matches.length === 0) return [];

    const slots: ContextSlot[] = [];
    let usedBytes = 0;

    for (const entry of matches) {
      const content = formatGuidance(entry);
      const bytes = Buffer.byteLength(content, 'utf8');
      if (budgetBytes > 0 && usedBytes + bytes > budgetBytes) {
        continue;
      }

      usedBytes += bytes;
      slots.push({
        id: `decision-tree:${entry.id}`,
        source: this.source,
        content,
        score: entry.confidence,
        bytes,
        included: true,
        reason: `matched:${entry.triggerKeywords.slice(0, 4).join(',')}`,
      });
    }

    return slots;
  }

  prune(slots: ContextSlot[], targetFreeBytes: number, _aggressiveness: number): ContextSlot[] {
    if (targetFreeBytes <= 0 || slots.length === 0) return slots;

    const sorted = [...slots].sort((a, b) => a.score - b.score || b.bytes - a.bytes);
    let freed = 0;
    const removeIds = new Set<string>();

    for (const slot of sorted) {
      if (freed >= targetFreeBytes) break;
      removeIds.add(slot.id);
      freed += slot.bytes;
    }

    return slots.filter((slot) => !removeIds.has(slot.id));
  }
}
