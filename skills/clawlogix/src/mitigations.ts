import type { Classification } from "./classifier.js";

export type MitigationAction =
  | "pause_new_work"
  | "throttle_lane"
  | "block_duplicate_fingerprint"
  | "force_compaction"
  | "reduce_context_cap_temporarily"
  | "cap_subagent_concurrency"
  | "abort_stuck_run"
  | "increase_retry_backoff"
  | "force_restart";

export type MitigationPolicy = {
  autoAllowed: MitigationAction[];
  minConfidenceForAuto: number;
  neverAuto: MitigationAction[];
  autoAbortCooldownMs: number;
  autoAbortStrictA: {
    requiresExactlyOneStuckRun: boolean;
    runAgeMultiplier: number;
    noProgressMultiplier: number;
    maxRunAgeMs: number;
    minNoProgressMs: number;
  };
};

export const defaultMitigationPolicy: MitigationPolicy = {
  autoAllowed: [
    "pause_new_work",
    "throttle_lane",
    "block_duplicate_fingerprint",
    "force_compaction",
    "reduce_context_cap_temporarily",
    "cap_subagent_concurrency",
    "abort_stuck_run",
    "increase_retry_backoff",
  ],
  minConfidenceForAuto: 0.85,
  neverAuto: ["force_restart"],
  autoAbortCooldownMs: 900_000,
  autoAbortStrictA: {
    requiresExactlyOneStuckRun: true,
    runAgeMultiplier: 2,
    noProgressMultiplier: 2,
    maxRunAgeMs: 900_000,
    minNoProgressMs: 180_000,
  },
};

export function recommendMitigations(c: Classification): MitigationAction[] {
  switch (c.likelyCause) {
    case "recursive_loop":
      return ["pause_new_work", "throttle_lane", "block_duplicate_fingerprint"];
    case "context_bloat":
      return ["force_compaction", "reduce_context_cap_temporarily"];
    case "subagent_fanout":
      return ["cap_subagent_concurrency", "pause_new_work"];
    case "stuck_run_no_progress":
      return ["abort_stuck_run", "pause_new_work"];
    case "provider_degradation_retry_churn":
      return ["increase_retry_backoff", "pause_new_work"];
    default:
      return ["pause_new_work"];
  }
}

export type StuckRunEvidence = {
  stuckRunCount: number;
  maxRunAgeMsObserved?: number;
  maxNoProgressMsObserved?: number;
};

export function canAutoAbortStuckRun(
  evidence: StuckRunEvidence,
  policy: MitigationPolicy,
  confidence: number,
  lastAutoAbortAtMs: number | null,
  nowMs = Date.now(),
): boolean {
  if (confidence < policy.minConfidenceForAuto) return false;
  if (lastAutoAbortAtMs && nowMs - lastAutoAbortAtMs < policy.autoAbortCooldownMs) return false;

  if (policy.autoAbortStrictA.requiresExactlyOneStuckRun && evidence.stuckRunCount !== 1) return false;
  const ageOk =
    (evidence.maxRunAgeMsObserved ?? 0) >=
    policy.autoAbortStrictA.maxRunAgeMs * policy.autoAbortStrictA.runAgeMultiplier;
  const progressOk =
    (evidence.maxNoProgressMsObserved ?? 0) >=
    policy.autoAbortStrictA.minNoProgressMs * policy.autoAbortStrictA.noProgressMultiplier;
  return ageOk && progressOk;
}

export function splitAutoVsManual(
  recommended: MitigationAction[],
  c: Classification,
  policy: MitigationPolicy,
  opts?: { stuckEvidence?: StuckRunEvidence; lastAutoAbortAtMs?: number | null },
): { auto: MitigationAction[]; manual: MitigationAction[] } {
  const auto: MitigationAction[] = [];
  const manual: MitigationAction[] = [];

  for (const action of recommended) {
    if (policy.neverAuto.includes(action)) {
      manual.push(action);
      continue;
    }

    if (action === "abort_stuck_run") {
      const ok = canAutoAbortStuckRun(
        opts?.stuckEvidence ?? { stuckRunCount: 0 },
        policy,
        c.confidence,
        opts?.lastAutoAbortAtMs ?? null,
      );
      if (ok) auto.push(action);
      else manual.push(action);
      continue;
    }

    const allowed = policy.autoAllowed.includes(action) && c.confidence >= policy.minConfidenceForAuto;
    if (allowed) auto.push(action);
    else manual.push(action);
  }

  return { auto, manual };
}
