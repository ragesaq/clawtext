import { classify } from "./classifier.js";
import { runDetectors, type DetectorConfig, type RuntimeSample } from "./detectors.js";
import {
  defaultMitigationPolicy,
  recommendMitigations,
  splitAutoVsManual,
  type MitigationPolicy,
} from "./mitigations.js";

export function analyzeIncident(params: {
  samples: RuntimeSample[];
  detectorConfig?: DetectorConfig;
  mitigationPolicy?: MitigationPolicy;
  lastAutoAbortAtMs?: number | null;
}) {
  const detectors = runDetectors(params.samples, params.detectorConfig);
  const classification = classify(detectors);
  const recommended = recommendMitigations(classification);
  const stuckEvidence =
    (detectors.find((d) => d.id === "stuck_inflight")?.evidence as
      | { stuckRunCount: number; maxRunAgeMsObserved?: number; maxNoProgressMsObserved?: number }
      | undefined) ?? { stuckRunCount: 0 };

  const split = splitAutoVsManual(
    recommended,
    classification,
    params.mitigationPolicy ?? defaultMitigationPolicy,
    { stuckEvidence, lastAutoAbortAtMs: params.lastAutoAbortAtMs ?? null },
  );

  return {
    detectors,
    classification,
    recommendedMitigations: recommended,
    autoMitigations: split.auto,
    manualMitigations: split.manual,
  };
}
