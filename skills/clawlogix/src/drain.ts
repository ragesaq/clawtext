import type { OpenClawAdapter } from "./openclawAdapter.js";
import { snapshotInflight } from "./preflight.js";

export async function waitUntilIdle(opts: {
  adapter: OpenClawAdapter;
  pollEveryMs: number;
  maxWaitMs: number;
  onProgress?: (msg: string) => Promise<void> | void;
  onTimeoutDecisionRequired?: (msg: string) => Promise<void> | void;
}): Promise<"idle" | "timeout"> {
  const started = Date.now();
  while (true) {
    const snap = await snapshotInflight(opts.adapter);
    if (snap.total === 0) return "idle";

    await opts.onProgress?.(
      `Draining: sessions=${snap.activeSessions}, subagents=${snap.activeSubagents}, pendingReplies=${snap.pendingReplies}, queue=${snap.queueDepth}`,
    );

    if (Date.now() - started >= opts.maxWaitMs) {
      await opts.onTimeoutDecisionRequired?.(
        `Drain timeout with ${snap.total} in-flight. Decision required: WAIT_MORE / ABORT_STUCK / FORCE`,
      );
      return "timeout";
    }
    await new Promise((r) => setTimeout(r, opts.pollEveryMs));
  }
}
