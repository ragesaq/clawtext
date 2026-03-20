import path from 'path';
import type { ContextSlot, SlotContext, SlotProvider } from '../slot-provider.js';
import { getRelatedSessions, resolveSessionRow } from '../slots/sessionMatrix.js';

function formatSessionMatrixBlock(lines: string[]): string {
  return ['## Session Matrix Context', ...lines].join('\n');
}

export class SessionMatrixProvider implements SlotProvider {
  readonly id = 'session-matrix';
  readonly source = 'session-matrix' as const;
  readonly priority = 29;
  readonly prunable = true;

  private readonly workspacePath: string;

  constructor(options?: { workspacePath?: string }) {
    this.workspacePath = options?.workspacePath ?? path.join(process.env.HOME || '', '.openclaw', 'workspace');
  }

  available(ctx: SlotContext): boolean {
    const current = resolveSessionRow(this.workspacePath, {
      sessionKey: ctx.sessionKey,
      channelId: ctx.channelId,
      threadRef: `discord:thread:${ctx.channelId}`,
      channelRef: `discord:channel:${ctx.channelId}`,
    });
    if (!current) return false;
    return true;
  }

  fill(ctx: SlotContext, budgetBytes: number): ContextSlot[] {
    if (budgetBytes <= 0) return [];

    const current = resolveSessionRow(this.workspacePath, {
      sessionKey: ctx.sessionKey,
      channelId: ctx.channelId,
      threadRef: `discord:thread:${ctx.channelId}`,
      channelRef: `discord:channel:${ctx.channelId}`,
    });
    if (!current) return [];

    const related = getRelatedSessions(this.workspacePath, current.sessionId).slice(0, 4);
    const lines: string[] = [
      `- Current session: ${current.sessionId}`,
      `- Project: ${current.project}`,
      `- Owner: ${current.ownerAdvisorId}`,
    ];

    if (current.domain) lines.push(`- Domain: ${current.domain}`);
    if (current.status) lines.push(`- Status: ${current.status}`);

    if (related.length > 0) {
      lines.push('- Related sessions:');
      for (const row of related) {
        lines.push(`  - ${row.sessionId} (${row.reason}; owner=${row.ownerAdvisorId}${row.domain ? `; domain=${row.domain}` : ''}; status=${row.status})`);
      }
    }

    const content = formatSessionMatrixBlock(lines);
    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes > budgetBytes) return [];

    return [
      {
        id: `${this.id}:${current.sessionId}`,
        source: this.source,
        content,
        score: related.length > 0 ? 0.95 : 0.88,
        bytes,
        included: true,
        reason: related.length > 0 ? `related-sessions:${related.length}` : 'current-session-only',
      },
    ];
  }

  prune(slots: ContextSlot[], _targetFreeBytes: number, aggressiveness: number): ContextSlot[] {
    if (aggressiveness >= 0.85) return [];
    return slots;
  }
}
