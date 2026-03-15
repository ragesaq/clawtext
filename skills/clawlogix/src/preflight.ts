import type { OpenClawAdapter } from "./openclawAdapter.js";
import type { InflightSnapshot } from "./types.js";

export async function snapshotInflight(adapter: OpenClawAdapter): Promise<InflightSnapshot> {
  const [sessions, subagents, pendingReplies, queueDepth] = await Promise.all([
    adapter.listSessions(),
    adapter.listSubagents(),
    adapter.getPendingReplies(),
    adapter.getQueueDepth(),
  ]);

  const activeSessions = sessions.filter((s) => s.active !== false).length;
  const activeSubagents = subagents.filter((s) => s.status !== "completed").length;

  return {
    activeSessions,
    activeSubagents,
    pendingReplies,
    queueDepth,
    total: activeSessions + activeSubagents + pendingReplies + queueDepth,
    observedAt: new Date().toISOString(),
  };
}
