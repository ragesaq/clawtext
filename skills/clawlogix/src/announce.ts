import type { OpenClawAdapter } from "./openclawAdapter.js";

export async function announcePreRestart(
  adapter: OpenClawAdapter,
  reason: string,
  requestId: string,
): Promise<void> {
  const msg = `🔁 ClawLogix: restart approved (${requestId}). Entering drain mode. Reason: ${reason}`;
  await adapter.sendToMain(msg);
  if (adapter.sendToOrigin) await adapter.sendToOrigin(msg);
}

export async function announceBackOnline(
  adapter: OpenClawAdapter,
  requestId: string,
  durationMs: number,
): Promise<void> {
  const msg = `✅ ClawLogix: gateway back online (${requestId}). Duration: ${durationMs}ms.`;
  await adapter.sendToMain(msg);
  if (adapter.sendToOrigin) await adapter.sendToOrigin(msg);
}
