import { Ledger } from "./ledger.js";
import {
  createRequest,
  approveRequest,
  denyRequest,
  forceApproveWithMode,
  getRequest,
  listRequests,
  setRequestStatus,
} from "./approvals.js";
import { snapshotInflight } from "./preflight.js";
import { waitUntilIdle } from "./drain.js";
import { announceBackOnline, announcePreRestart } from "./announce.js";
import { executeRestart } from "./execute.js";
import { isNewWorkPaused } from "./safetyState.js";
import type { ForceApprovalMode, Urgency } from "./types.js";
import type { OpenClawAdapter } from "./openclawAdapter.js";
import { resolveWorkspacePath } from "./paths.js";
import { emitOperationalEvent } from "./events.js";

const ledger = new Ledger(resolveWorkspacePath("memory", "operational", "restart-ledger.jsonl"));

export async function requestRestart(input: {
  reason: string;
  urgency?: Urgency;
  requester: string;
}) {
  if (isNewWorkPaused()) {
    throw new Error("New work is paused due to active emergency incident.");
  }
  const req = await createRequest(input);
  await ledger.append({
    ts: new Date().toISOString(),
    type: "request.created",
    requestId: req.id,
    data: req as unknown as Record<string, unknown>,
  });
  await emitOperationalEvent({
    type: "policy.restart.requested",
    source: { system: "clawlogix", component: "controller" },
    severity: "info",
    status: "new",
    correlationId: req.id,
    subject: { kind: "task", id: req.id },
    labels: { urgency: req.urgency },
    payload: { reason: req.reason, requester: req.requester },
    retention: { class: "audit" },
  });
  return req;
}

export async function approveRestart(requestId: string, approver: string) {
  const req = await approveRequest(requestId, approver);
  await ledger.append({
    ts: new Date().toISOString(),
    type: "request.approved",
    requestId,
    data: { approver },
  });
  await emitOperationalEvent({
    type: "policy.restart.approved",
    source: { system: "clawlogix", component: "controller" },
    severity: "info",
    status: "resolved",
    correlationId: requestId,
    subject: { kind: "task", id: requestId },
    payload: { approver },
    retention: { class: "audit" },
  });
  return req;
}

export async function denyRestart(requestId: string, approver: string, reason?: string) {
  const req = await denyRequest(requestId, approver);
  await ledger.append({
    ts: new Date().toISOString(),
    type: "request.denied",
    requestId,
    data: { approver, reason },
  });
  await emitOperationalEvent({
    type: "policy.restart.denied",
    source: { system: "clawlogix", component: "controller" },
    severity: "medium",
    status: "resolved",
    correlationId: requestId,
    subject: { kind: "task", id: requestId },
    payload: { approver, reason: reason ?? null },
    retention: { class: "audit" },
  });
  return req;
}

export async function forceRestart(
  requestId: string,
  approver: string,
  confirm: string,
  mode: ForceApprovalMode,
) {
  const outcome = await forceApproveWithMode(requestId, approver, confirm, mode);
  await ledger.append({
    ts: new Date().toISOString(),
    type: "request.force_approval",
    requestId,
    data: { approver, mode, complete: outcome.complete },
  });
  if (outcome.complete) {
    await emitOperationalEvent({
      type: "policy.restart.approved",
      source: { system: "clawlogix", component: "controller" },
      severity: "critical",
      status: "resolved",
      correlationId: requestId,
      subject: { kind: "task", id: requestId },
      labels: { force: true, mode },
      payload: { approver, forceUsed: true },
      retention: { class: "audit" },
    });
  }
  return outcome;
}

export async function runRestart(requestId: string, adapter: OpenClawAdapter) {
  const req = await getRequest(requestId);
  if (!req) throw new Error(`Unknown request: ${requestId}`);
  if (req.status !== "approved") throw new Error(`Request ${requestId} is not approved`);

  const pre = await snapshotInflight(adapter);
  await setRequestStatus(requestId, "draining");
  await ledger.append({
    ts: new Date().toISOString(),
    type: "preflight.snapshot",
    requestId,
    data: pre as unknown as Record<string, unknown>,
  });
  await emitOperationalEvent({
    type: "policy.restart.drain.started",
    source: { system: "clawlogix", component: "drain-manager" },
    severity: "info",
    status: "processing",
    correlationId: requestId,
    subject: { kind: "task", id: requestId },
    payload: pre as unknown as Record<string, unknown>,
    retention: { class: "audit" },
  });

  const drained = await waitUntilIdle({
    adapter,
    pollEveryMs: 2000,
    maxWaitMs: 15 * 60 * 1000,
    onProgress: async (msg) =>
      ledger.append({ ts: new Date().toISOString(), type: "drain.progress", requestId, data: { msg } }),
    onTimeoutDecisionRequired: async (msg) =>
      ledger.append({
        ts: new Date().toISOString(),
        type: "drain.timeout_decision_required",
        requestId,
        data: { msg },
      }),
  });

  if (drained === "timeout") {
    await setRequestStatus(requestId, "timeout_waiting_decision");
    await ledger.append({
      ts: new Date().toISOString(),
      type: "request.timeout_waiting_decision",
      requestId,
    });
    await emitOperationalEvent({
      type: "policy.restart.drain.timeout",
      source: { system: "clawlogix", component: "drain-manager" },
      severity: "high",
      status: "queued",
      correlationId: requestId,
      subject: { kind: "task", id: requestId },
      payload: { decisionRequired: true },
      retention: { class: "audit" },
    });
    throw new Error("Drain timed out; operator decision required.");
  }

  await setRequestStatus(requestId, "restarting");
  const t0 = Date.now();
  await announcePreRestart(adapter, req.reason, requestId);
  await executeRestart(adapter, req.reason, requestId, req.forceUsed);
  await emitOperationalEvent({
    type: "policy.restart.executed",
    source: { system: "clawlogix", component: "executor" },
    severity: req.forceUsed ? "critical" : "high",
    status: "resolved",
    correlationId: requestId,
    subject: { kind: "task", id: requestId },
    payload: { reason: req.reason, forceUsed: Boolean(req.forceUsed) },
    retention: { class: "audit" },
  });

  const durationMs = Date.now() - t0;
  await announceBackOnline(adapter, requestId, durationMs);
  await emitOperationalEvent({
    type: "infra.gateway.back_online",
    source: { system: "openclaw-gateway", component: "gateway" },
    severity: "info",
    status: "resolved",
    correlationId: requestId,
    subject: { kind: "server", id: "gateway" },
    payload: { durationMs },
    retention: { class: "audit" },
  });

  await setRequestStatus(requestId, "completed");
  await ledger.append({ ts: new Date().toISOString(), type: "request.completed", requestId });
  return { ok: true, requestId };
}

export async function status(requestId?: string) {
  if (requestId) return (await getRequest(requestId)) ?? null;
  return listRequests();
}
