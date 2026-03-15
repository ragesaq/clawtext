import {
  approveRestart,
  denyRestart,
  forceRestart,
  requestRestart,
  runRestart,
  status,
} from "./controller.js";
import { createHybridAdapter, createNoopAdapter } from "./openclawAdapter.js";
import type { ForceApprovalMode, Urgency } from "./types.js";
import { isNewWorkPaused, resumeNewWork } from "./safetyState.js";
import { loadPolicy } from "./policy.js";
import { assertOperatorAllowed } from "./authz.js";
import { getIncident, listIncidents, setIncidentStatus } from "./emergency.js";
import fs from "node:fs/promises";
import { analyzeIncident } from "./incidentPipeline.js";
import type { RuntimeSample } from "./detectors.js";
import { loadGuardState } from "./guardState.js";

let forceMode: ForceApprovalMode = "single_operator";
let forceModeInitialized = false;

function readKV(input: string, key: string): string | undefined {
  const q = new RegExp(`${key}="([^"]+)"`).exec(input);
  if (q) return q[1];
  const b = new RegExp(`${key}=([^\\s]+)`).exec(input);
  return b?.[1];
}

function readReqId(input: string): string | undefined {
  return /\b(req_[^\s]+)/.exec(input)?.[1];
}

async function initForceModeFromPolicy() {
  if (forceModeInitialized) return;
  const policy = await loadPolicy();
  if (policy.approval?.forceApprovalMode === "single_operator" || policy.approval?.forceApprovalMode === "two_person") {
    forceMode = policy.approval.forceApprovalMode;
  }
  forceModeInitialized = true;
}

export async function handleCommand(raw: string, actor: string) {
  const cmd = raw.trim();
  const policy = await loadPolicy();
  assertOperatorAllowed(actor, cmd, policy);
  await initForceModeFromPolicy();

  if (cmd.startsWith("request restart")) {
    const reason = readKV(cmd, "reason");
    if (!reason) throw new Error('Missing reason; use reason="..."');
    const urgency = (readKV(cmd, "urgency") ?? "normal") as Urgency;
    return requestRestart({ reason, urgency, requester: actor });
  }

  if (cmd.startsWith("approve restart")) {
    const id = readReqId(cmd);
    if (!id) throw new Error("Missing request id");
    return approveRestart(id, actor);
  }

  if (cmd.startsWith("deny restart")) {
    const id = readReqId(cmd);
    if (!id) throw new Error("Missing request id");
    return denyRestart(id, actor, readKV(cmd, "reason"));
  }

  if (cmd.startsWith("force restart")) {
    const id = readReqId(cmd);
    if (!id) throw new Error("Missing request id");
    return forceRestart(id, actor, readKV(cmd, "confirm") ?? "", forceMode);
  }

  if (cmd.startsWith("run restart")) {
    const id = readReqId(cmd);
    if (!id) throw new Error("Missing request id");
    const adapter = process.env.CLAWLOGIX_ADAPTER === "noop" ? createNoopAdapter() : createHybridAdapter();
    return runRestart(id, adapter);
  }

  if (cmd.startsWith("restart force-mode")) {
    const mode = cmd.split(/\s+/).pop();
    if (mode !== "single_operator" && mode !== "two_person") {
      throw new Error("force mode must be single_operator or two_person");
    }
    forceMode = mode;
    return { ok: true, forceMode };
  }

  if (cmd === "safety status") {
    return { paused: isNewWorkPaused() };
  }

  if (cmd === "safety resume") {
    resumeNewWork();
    return { ok: true, paused: false };
  }

  if (cmd === "incident list") {
    return listIncidents();
  }

  if (cmd.startsWith("incident status") || cmd.startsWith("incident explain")) {
    const id = /\b(inc_[^\s]+)/.exec(cmd)?.[1];
    if (!id) throw new Error("Missing incident id");
    return (await getIncident(id)) ?? null;
  }

  if (cmd.startsWith("incident ack")) {
    const id = /\b(inc_[^\s]+)/.exec(cmd)?.[1];
    if (!id) throw new Error("Missing incident id");
    return setIncidentStatus(id, "acknowledged");
  }

  if (cmd.startsWith("incident resolve")) {
    const id = /\b(inc_[^\s]+)/.exec(cmd)?.[1];
    if (!id) throw new Error("Missing incident id");
    return setIncidentStatus(id, "resolved");
  }

  if (cmd.startsWith("incident analyze")) {
    const file = readKV(cmd, "file");
    if (!file) throw new Error('Missing file; use incident analyze file="/path/to/samples.json"');
    const raw = await fs.readFile(file, "utf8");
    const samples = JSON.parse(raw) as RuntimeSample[];
    const guard = await loadGuardState();
    return analyzeIncident({ samples, lastAutoAbortAtMs: guard.lastAutoAbortAtMs ?? null });
  }

  if (cmd === "restart status" || cmd === "restart list") {
    return status();
  }

  if (cmd.startsWith("restart status")) {
    const id = readReqId(cmd);
    return status(id);
  }

  throw new Error("Unknown command");
}
