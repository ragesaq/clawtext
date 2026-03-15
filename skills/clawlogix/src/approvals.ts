import type { ForceApprovalMode, RequestStatus, RestartRequest, Urgency } from "./types.js";
import { getRequestById, loadRequests, upsertRequest } from "./requestStore.js";

function makeId() {
  return `req_${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

export async function createRequest(input: {
  reason: string;
  urgency?: Urgency;
  requester: string;
}): Promise<RestartRequest> {
  const req: RestartRequest = {
    id: makeId(),
    reason: input.reason,
    urgency: input.urgency ?? "normal",
    requester: input.requester,
    createdAt: new Date().toISOString(),
    status: "approval_pending",
    pendingForceApprovers: [],
  };
  await upsertRequest(req);
  return req;
}

export async function approveRequest(id: string, approver: string): Promise<RestartRequest> {
  const req = await getRequestById(id);
  if (!req) throw new Error(`Unknown request: ${id}`);
  req.status = "approved";
  req.approver = approver;
  await upsertRequest(req);
  return req;
}

export async function denyRequest(id: string, approver: string): Promise<RestartRequest> {
  const req = await getRequestById(id);
  if (!req) throw new Error(`Unknown request: ${id}`);
  req.status = "denied";
  req.approver = approver;
  await upsertRequest(req);
  return req;
}

export async function forceApproveWithMode(
  id: string,
  approver: string,
  confirm: string,
  mode: ForceApprovalMode,
): Promise<{ req: RestartRequest; complete: boolean; approvals: string[] }> {
  const req = await getRequestById(id);
  if (!req) throw new Error(`Unknown request: ${id}`);
  if (req.urgency !== "emergency") throw new Error("Force only allowed for emergency requests");
  if (confirm !== "FORCE") throw new Error("Missing force confirmation phrase");

  const currentApprovers = new Set(req.pendingForceApprovers ?? []);

  if (mode === "single_operator") {
    req.status = "approved";
    req.approver = approver;
    req.forceUsed = true;
    req.pendingForceApprovers = [approver];
    await upsertRequest(req);
    return { req, complete: true, approvals: [approver] };
  }

  currentApprovers.add(approver);
  req.pendingForceApprovers = Array.from(currentApprovers);

  if (currentApprovers.size >= 2) {
    req.status = "approved";
    req.approver = req.pendingForceApprovers.join(",");
    req.forceUsed = true;
    await upsertRequest(req);
    return { req, complete: true, approvals: req.pendingForceApprovers };
  }

  await upsertRequest(req);
  return { req, complete: false, approvals: req.pendingForceApprovers };
}

export async function setRequestStatus(
  id: string,
  status: RequestStatus,
  patch?: Partial<RestartRequest>,
): Promise<RestartRequest> {
  const req = await getRequestById(id);
  if (!req) throw new Error(`Unknown request: ${id}`);
  req.status = status;
  Object.assign(req, patch ?? {});
  await upsertRequest(req);
  return req;
}

export async function getRequest(id: string): Promise<RestartRequest | undefined> {
  return getRequestById(id);
}

export async function listRequests(): Promise<RestartRequest[]> {
  const requests = await loadRequests();
  return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
