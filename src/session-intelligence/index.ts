/**
 * Session Intelligence module entrypoint.
 *
 * Exports the context-engine factory and registration helper used by
 * ClawText's main plugin registration path.
 */

import path from 'node:path';
import { createSessionIntelligenceEngine } from './engine';
import type { SessionIntelligenceConfig } from './types';

const ENGINE_ID = 'clawtext-session-intelligence';

// Module-level registry so tool factories can access recall methods after engine creation
type SIEngineWithRecall = ReturnType<typeof createSessionIntelligenceEngine>;
const _siEngineRegistry = new Map<string, SIEngineWithRecall>();

type ContextEngineRegistrationApi = {
  registerContextEngine: (id: string, factory: () => unknown) => void;
};

export function getRegisteredSIEngine(): SIEngineWithRecall | undefined {
  return _siEngineRegistry.get(ENGINE_ID);
}

export function registerSessionIntelligenceEngine(
  api: ContextEngineRegistrationApi,
  config: SessionIntelligenceConfig,
): void {
  const libraryEntriesDir = config.workspacePath
    ? path.join(config.workspacePath, 'state', 'clawtext', 'prod', 'library', 'entries')
    : undefined;

  api.registerContextEngine(
    ENGINE_ID,
    () => {
      const engine = createSessionIntelligenceEngine({ ...config, libraryEntriesDir });
      _siEngineRegistry.set(ENGINE_ID, engine);
      return engine;
    },
  );
}

export { createSessionIntelligenceEngine };
export { loadAcaFiles, buildKernelContent, buildOverlayContent } from './aca';
export { upsertStateSlot, getStateSlot, getAllStateSlots, kernelSlotsPresent } from './state-slots';
export {
  classifyMessage,
  extractDecisionText,
  extractProblemText,
  CONTENT_TYPE_PRIORITY,
  CONTENT_TYPE_COMPACTION_ORDER,
} from './content-type';
export { extractStateFromMessage } from './state-extraction';
export { evaluateTrigger, recordCompactionEvent, resolveTriggerConfig, shouldRunProactivePass } from './trigger';
export { computePressureSignals, buildPressureReading, classifyPressureBand, PRESSURE_THRESHOLDS } from './pressure';
export { runNoiseSweep, runToolDecay } from './proactive-pass';
export { search, describe, expand } from './recall';
export { shouldExternalize, externalizePayload, recoverPayload } from './large-file';
export { insertPayloadRef, getPayloadRef, listPayloadRefs, markPayloadRefExpired } from './payload-store';
export {
  detectCallType,
  insertToolCallMeta,
  markConsumed,
  getDecayEligibleMessages,
  markExternalized,
  detectConsumption,
  DECAY_WINDOWS,
} from './tool-tracker';
export {
  hashContent,
  toFileUri,
  looksLikeFilePath,
  extractFilePath,
  insertResourceVersion,
  getLatestResourceVersion,
  computeDelta,
  processFileRead,
  buildResourceToken,
} from './resource-versions.js';
export type { DeltaType } from './resource-versions.js';
export {
  insertSlotAssociation,
  getSlotAssociations,
  getRecoveryPriority,
  associateResourceWithSlots,
} from './slot-associations.js';
export type { RecoveryPriority, ResourceSlotAssociation } from './slot-associations.js';
export type { SessionIntelligenceConfig };
