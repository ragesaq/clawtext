import fs from "node:fs/promises";
import path from "node:path";
import { resolveWorkspacePath } from "./paths.js";

export type EventSeverity = "debug" | "info" | "low" | "medium" | "high" | "critical";
export type EventStatus = "new" | "classified" | "queued" | "processing" | "resolved" | "suppressed" | "archived";

export type EventEnvelope = {
  id: string;
  type: string;
  ts: string;
  schemaVersion: "0.1.0";
  source: { system: string; component: string; instance?: string };
  severity: EventSeverity;
  status: EventStatus;
  correlationId?: string;
  dedupeKey?: string;
  subject?: { kind: string; id: string };
  labels?: Record<string, string | number | boolean>;
  payload: Record<string, unknown>;
  context?: Record<string, unknown>;
  actions?: Array<Record<string, unknown>>;
  links?: Array<{ kind: string; ref: string }>;
  retention?: { class: "ephemeral" | "standard" | "important" | "audit" };
};

const TYPE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/;
const EVENTS_PATH = resolveWorkspacePath("memory", "operational", "events.jsonl");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid event envelope: ${message}`);
}

export function validateEventEnvelope(evt: EventEnvelope): void {
  assert(typeof evt.id === "string" && evt.id.length >= 3, "id");
  assert(typeof evt.type === "string" && TYPE_PATTERN.test(evt.type), "type");
  assert(typeof evt.ts === "string" && !Number.isNaN(Date.parse(evt.ts)), "ts");
  assert(evt.schemaVersion === "0.1.0", "schemaVersion");
  assert(typeof evt.source?.system === "string" && evt.source.system.length > 0, "source.system");
  assert(typeof evt.source?.component === "string" && evt.source.component.length > 0, "source.component");
  assert(typeof evt.payload === "object" && evt.payload !== null, "payload");
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function mkEventId(prefix = "evt") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function emitOperationalEvent(input: Omit<EventEnvelope, "id" | "ts" | "schemaVersion"> & { id?: string; ts?: string }): Promise<EventEnvelope> {
  const evt: EventEnvelope = {
    schemaVersion: "0.1.0",
    id: input.id ?? mkEventId(),
    ts: input.ts ?? new Date().toISOString(),
    ...input,
  };

  validateEventEnvelope(evt);
  await ensureDir(EVENTS_PATH);
  await fs.appendFile(EVENTS_PATH, JSON.stringify(evt) + "\n", "utf8");
  return evt;
}
