export type RuntimeSample = {
  ts: number;
  requestFingerprint?: string;
  promptTokens?: number;
  completionTokens?: number;
  subagentSpawns?: number;
  queueDepth?: number;
  inFlightRuns?: Array<{ id: string; ageMs: number; noProgressMs: number }>;
  restartCountWindow?: number;
};

export type DetectorId =
  | "retry_loop"
  | "prompt_amplification"
  | "spawn_storm"
  | "stuck_inflight"
  | "token_burn_slope"
  | "queue_explosion"
  | "restart_loop";

export type DetectorResult = {
  id: DetectorId;
  fired: boolean;
  score: number; // 0..1
  evidence: Record<string, unknown>;
};

export type DetectorConfig = {
  retryLoop: { enabled: boolean; windowMs: number; maxNearDuplicateRequests: number };
  promptAmplification: {
    enabled: boolean;
    windowTurns: number;
    maxGrowthRatio: number;
    minPromptTokens: number;
  };
  spawnStorm: {
    enabled: boolean;
    windowMs: number;
    maxSubagentSpawns: number;
    maxConcurrentSubagents: number;
  };
  stuckInflight: { enabled: boolean; maxRunAgeMs: number; minNoProgressMs: number; maxStuckRuns: number };
  tokenBurnSlope: { enabled: boolean; windowMs: number; maxTokensPerMinute: number; maxRequestsPerMinute: number };
  queueExplosion: { enabled: boolean; queueDepthThreshold: number };
  restartLoop: { enabled: boolean; maxRestarts: number };
};

export const defaultDetectorConfig: DetectorConfig = {
  retryLoop: { enabled: true, windowMs: 120_000, maxNearDuplicateRequests: 6 },
  promptAmplification: { enabled: true, windowTurns: 6, maxGrowthRatio: 2.2, minPromptTokens: 1200 },
  spawnStorm: { enabled: true, windowMs: 120_000, maxSubagentSpawns: 10, maxConcurrentSubagents: 8 },
  stuckInflight: { enabled: true, maxRunAgeMs: 900_000, minNoProgressMs: 180_000, maxStuckRuns: 2 },
  tokenBurnSlope: { enabled: true, windowMs: 120_000, maxTokensPerMinute: 120_000, maxRequestsPerMinute: 25 },
  queueExplosion: { enabled: true, queueDepthThreshold: 100 },
  restartLoop: { enabled: true, maxRestarts: 3 },
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function runDetectors(samples: RuntimeSample[], cfg: DetectorConfig = defaultDetectorConfig): DetectorResult[] {
  const now = Date.now();
  const last = samples[samples.length - 1];

  const retryWindow = samples.filter((s) => now - s.ts <= cfg.retryLoop.windowMs);
  const fpCounts = new Map<string, number>();
  for (const s of retryWindow) {
    if (!s.requestFingerprint) continue;
    fpCounts.set(s.requestFingerprint, (fpCounts.get(s.requestFingerprint) ?? 0) + 1);
  }
  const maxDup = Math.max(0, ...Array.from(fpCounts.values()));
  const retryScore = cfg.retryLoop.enabled ? clamp01(maxDup / cfg.retryLoop.maxNearDuplicateRequests) : 0;

  const promptWindow = samples.slice(-cfg.promptAmplification.windowTurns);
  const firstPrompt = promptWindow[0]?.promptTokens ?? 0;
  const lastPrompt = promptWindow[promptWindow.length - 1]?.promptTokens ?? 0;
  const growthRatio = firstPrompt > 0 ? lastPrompt / firstPrompt : 1;
  const ampScore =
    cfg.promptAmplification.enabled && lastPrompt >= cfg.promptAmplification.minPromptTokens
      ? clamp01(growthRatio / cfg.promptAmplification.maxGrowthRatio)
      : 0;

  const spawnWindow = samples.filter((s) => now - s.ts <= cfg.spawnStorm.windowMs);
  const spawnTotal = spawnWindow.reduce((n, s) => n + (s.subagentSpawns ?? 0), 0);
  const maxConcurrentSubagents = Math.max(0, ...spawnWindow.map((s) => s.inFlightRuns?.length ?? 0));
  const spawnScore = cfg.spawnStorm.enabled
    ? clamp01(
        Math.max(
          spawnTotal / cfg.spawnStorm.maxSubagentSpawns,
          maxConcurrentSubagents / cfg.spawnStorm.maxConcurrentSubagents,
        ),
      )
    : 0;

  const stuckRuns = (last?.inFlightRuns ?? []).filter(
    (r) => r.ageMs >= cfg.stuckInflight.maxRunAgeMs && r.noProgressMs >= cfg.stuckInflight.minNoProgressMs,
  );
  const maxRunAgeMsObserved = Math.max(0, ...stuckRuns.map((r) => r.ageMs));
  const maxNoProgressMsObserved = Math.max(0, ...stuckRuns.map((r) => r.noProgressMs));
  const stuckScore = cfg.stuckInflight.enabled ? clamp01(stuckRuns.length / cfg.stuckInflight.maxStuckRuns) : 0;

  const burnWindow = samples.filter((s) => now - s.ts <= cfg.tokenBurnSlope.windowMs);
  const totalTokens = burnWindow.reduce((n, s) => n + (s.promptTokens ?? 0) + (s.completionTokens ?? 0), 0);
  const mins = Math.max(cfg.tokenBurnSlope.windowMs / 60_000, 0.1);
  const tokensPerMin = totalTokens / mins;
  const reqPerMin = burnWindow.length / mins;
  const burnScore = cfg.tokenBurnSlope.enabled
    ? clamp01(
        Math.max(
          tokensPerMin / cfg.tokenBurnSlope.maxTokensPerMinute,
          reqPerMin / cfg.tokenBurnSlope.maxRequestsPerMinute,
        ),
      )
    : 0;

  const queueDepth = last?.queueDepth ?? 0;
  const queueScore = cfg.queueExplosion.enabled ? clamp01(queueDepth / cfg.queueExplosion.queueDepthThreshold) : 0;

  const restartCountWindow = last?.restartCountWindow ?? 0;
  const restartScore = cfg.restartLoop.enabled ? clamp01(restartCountWindow / cfg.restartLoop.maxRestarts) : 0;

  return [
    { id: "retry_loop", fired: retryScore >= 1, score: retryScore, evidence: { maxDup, windowSize: retryWindow.length } },
    {
      id: "prompt_amplification",
      fired: ampScore >= 1,
      score: ampScore,
      evidence: { firstPrompt, lastPrompt, growthRatio },
    },
    {
      id: "spawn_storm",
      fired: spawnScore >= 1,
      score: spawnScore,
      evidence: { spawnTotal, maxConcurrentSubagents },
    },
    {
      id: "stuck_inflight",
      fired: stuckScore >= 1,
      score: stuckScore,
      evidence: {
        stuckRunCount: stuckRuns.length,
        stuckRunIds: stuckRuns.map((r) => r.id),
        maxRunAgeMsObserved,
        maxNoProgressMsObserved,
      },
    },
    {
      id: "token_burn_slope",
      fired: burnScore >= 1,
      score: burnScore,
      evidence: { tokensPerMin, reqPerMin, totalTokens },
    },
    { id: "queue_explosion", fired: queueScore >= 1, score: queueScore, evidence: { queueDepth } },
    {
      id: "restart_loop",
      fired: restartScore >= 1,
      score: restartScore,
      evidence: { restartCountWindow },
    },
  ];
}
