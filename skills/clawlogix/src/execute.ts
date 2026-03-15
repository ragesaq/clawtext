import type { OpenClawAdapter } from "./openclawAdapter.js";

export async function executeRestart(
  adapter: OpenClawAdapter,
  reason: string,
  requestId: string,
): Promise<void> {
  await adapter.restartGateway({
    reason,
    note: `ClawLogix restart ${requestId}: gateway is back online.`,
  });
}
