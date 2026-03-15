import type { DetectorResult } from "./detectors.js";

export type LikelyCause =
  | "recursive_loop"
  | "context_bloat"
  | "subagent_fanout"
  | "provider_degradation_retry_churn"
  | "stuck_run_no_progress"
  | "unknown";

export type Classification = {
  likelyCause: LikelyCause;
  confidence: number;
  notes?: string;
};

function score(results: DetectorResult[], id: DetectorResult["id"]): number {
  return results.find((r) => r.id === id)?.score ?? 0;
}

export function classify(detectors: DetectorResult[]): Classification {
  const retry = score(detectors, "retry_loop");
  const amp = score(detectors, "prompt_amplification");
  const spawn = score(detectors, "spawn_storm");
  const stuck = score(detectors, "stuck_inflight");
  const burn = score(detectors, "token_burn_slope");
  const queue = score(detectors, "queue_explosion");

  const confidence = Math.max(
    0,
    Math.min(1, 0.28 * retry + 0.18 * amp + 0.16 * spawn + 0.18 * stuck + 0.12 * burn + 0.08 * queue),
  );

  if (retry > 0.8 && burn > 0.7) {
    return { likelyCause: "recursive_loop", confidence, notes: "High retry and burn slope" };
  }
  if (amp > 0.85) {
    return { likelyCause: "context_bloat", confidence, notes: "Prompt growth dominates" };
  }
  if (spawn > 0.85) {
    return { likelyCause: "subagent_fanout", confidence, notes: "Subagent spawn storm" };
  }
  if (stuck > 0.85) {
    return { likelyCause: "stuck_run_no_progress", confidence, notes: "Long no-progress runs" };
  }
  if (retry > 0.7 && queue > 0.7) {
    return {
      likelyCause: "provider_degradation_retry_churn",
      confidence,
      notes: "Retry + queue pattern resembles provider churn",
    };
  }

  return { likelyCause: "unknown", confidence, notes: "No dominant signal" };
}
