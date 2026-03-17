import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ContextSlot, SlotContext, SlotProvider } from '../slot-provider.js';

interface HandoffCandidate {
  filePath: string;
  fileName: string;
  modifiedAtMs: number;
  ageMs: number;
  freshness: number;
}

const RECENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
const HALF_LIFE_MS = 8 * 60 * 60 * 1000;

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function candidateDirectories(): string[] {
  const home = os.homedir();
  return uniqueStrings([
    path.resolve(process.cwd(), 'docs', 'handoffs'),
    path.join(home, '.openclaw', 'workspace', 'repo', 'clawtext', 'docs', 'handoffs'),
    path.join(home, '.openclaw', 'workspace', 'docs', 'handoffs'),
  ]);
}

function freshnessScore(ageMs: number): number {
  return Math.exp(-ageMs / HALF_LIFE_MS);
}

function isFreshHandoff(nowMs: number, modifiedAtMs: number): boolean {
  return nowMs - modifiedAtMs <= RECENCY_WINDOW_MS;
}

function discoverRecentShortHandoffs(): HandoffCandidate[] {
  const nowMs = Date.now();
  const candidates: HandoffCandidate[] = [];

  for (const dir of candidateDirectories()) {
    if (!fs.existsSync(dir)) continue;

    let files: string[] = [];
    try {
      files = fs.readdirSync(dir);
    } catch {
      continue;
    }

    for (const fileName of files) {
      if (!/^CLAWBRIDGE_SHORT_\d{4}-\d{2}-\d{2}_\d{4}\.md$/.test(fileName)) {
        continue;
      }

      const filePath = path.join(dir, fileName);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue;
      }

      if (!stat.isFile()) continue;
      if (!isFreshHandoff(nowMs, stat.mtimeMs)) continue;

      const ageMs = nowMs - stat.mtimeMs;
      candidates.push({
        filePath,
        fileName,
        modifiedAtMs: stat.mtimeMs,
        ageMs,
        freshness: freshnessScore(ageMs),
      });
    }
  }

  candidates.sort((a, b) => b.modifiedAtMs - a.modifiedAtMs);
  return candidates;
}

function trimToBudget(content: string, budgetBytes: number): string {
  if (budgetBytes <= 0) return '';
  if (Buffer.byteLength(content, 'utf8') <= budgetBytes) return content;

  const suffix = '\n\n[truncated: clawbridge handoff exceeds slot budget]';
  const suffixBytes = Buffer.byteLength(suffix, 'utf8');
  const maxBytes = Math.max(0, budgetBytes - suffixBytes);
  const trimmed = Buffer.from(content, 'utf8').subarray(0, maxBytes).toString('utf8');
  return `${trimmed}${suffix}`;
}

function readHandoff(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

export class ClawBridgeProvider implements SlotProvider {
  readonly id = 'clawbridge';

  readonly source = 'clawbridge' as const;

  readonly priority = 70;

  readonly prunable = true;

  available(_ctx: SlotContext): boolean {
    return discoverRecentShortHandoffs().length > 0;
  }

  fill(_ctx: SlotContext, budgetBytes: number): ContextSlot[] {
    if (budgetBytes <= 0) return [];

    const candidates = discoverRecentShortHandoffs();
    if (candidates.length === 0) return [];

    const selected = candidates[0];
    const rawContent = readHandoff(selected.filePath);
    if (!rawContent.trim()) return [];

    const content = trimToBudget(rawContent, budgetBytes);
    const bytes = Buffer.byteLength(content, 'utf8');

    return [
      {
        id: `clawbridge:${selected.fileName}`,
        source: 'clawbridge',
        content,
        score: selected.freshness,
        bytes,
        included: false,
        reason: `handoff:fresh ageHours=${(selected.ageMs / 3600000).toFixed(2)} file=${selected.fileName}`,
      },
    ];
  }

  prune(slots: ContextSlot[], _targetFreeBytes: number, aggressiveness: number): ContextSlot[] {
    if (aggressiveness > 0.7) {
      return [];
    }

    return slots;
  }
}

export const clawBridgeProvider = new ClawBridgeProvider();
