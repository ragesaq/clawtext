import type { OpenClawAdapter } from "./openclawAdapter.js";
import { raiseIncident } from "./emergency.js";
import { pauseNewWork } from "./safetyState.js";

export async function triggerEmergency(
  adapter: OpenClawAdapter,
  type: string,
  evidence: Record<string, unknown>,
  analysis?: Record<string, unknown>,
) {
  const incident = await raiseIncident(type, evidence, analysis);
  pauseNewWork();
  const msg = `🚨 ClawLogix incident ${incident.id} (${type}) detected. New work paused.`;
  await adapter.sendToMain(msg);
  if (adapter.sendToOrigin) await adapter.sendToOrigin(msg);
  return incident;
}
