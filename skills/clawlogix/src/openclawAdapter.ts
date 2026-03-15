import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type OpenClawAdapter = {
  listSessions: () => Promise<Array<{ key: string; active?: boolean }>>;
  listSubagents: () => Promise<Array<{ id: string; status?: string }>>;
  getPendingReplies: () => Promise<number>;
  getQueueDepth: () => Promise<number>;
  sendToMain: (text: string) => Promise<void>;
  sendToOrigin?: (text: string) => Promise<void>;
  restartGateway: (opts: { reason: string; note: string }) => Promise<void>;
};

async function runOpenClaw(args: string[]): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  try {
    const { stdout, stderr } = await execFileAsync("openclaw", args, {
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    });
    return { stdout: stdout ?? "", stderr: stderr ?? "", ok: true };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", ok: false };
  }
}

function tryParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function asSessionRows(data: unknown): Array<{ key: string; active?: boolean }> {
  if (!Array.isArray(data)) return [];
  const out: Array<{ key: string; active?: boolean }> = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const key = (row as { sessionKey?: unknown; key?: unknown }).sessionKey ?? (row as { key?: unknown }).key;
    const active = (row as { active?: unknown }).active;
    if (typeof key !== "string") continue;
    out.push({ key, active: typeof active === "boolean" ? active : undefined });
  }
  return out;
}

function asSubagentRows(data: unknown): Array<{ id: string; status?: string }> {
  if (!Array.isArray(data)) return [];
  const out: Array<{ id: string; status?: string }> = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown; sessionId?: unknown }).id ?? (row as { sessionId?: unknown }).sessionId;
    const status = (row as { status?: unknown }).status;
    if (typeof id !== "string") continue;
    out.push({ id, status: typeof status === "string" ? status : undefined });
  }
  return out;
}

async function listSessionsViaCli(): Promise<Array<{ key: string; active?: boolean }>> {
  // Current CLI surface: openclaw sessions --json
  const a = await runOpenClaw(["sessions", "--json"]);
  const parsedA = tryParseJson<unknown>(a.stdout);
  if (parsedA && typeof parsedA === "object" && Array.isArray((parsedA as { sessions?: unknown }).sessions)) {
    return asSessionRows((parsedA as { sessions: unknown[] }).sessions);
  }

  // Legacy fallback variants (best-effort)
  const b = await runOpenClaw(["sessions", "list", "--json"]);
  const parsedB = tryParseJson<unknown>(b.stdout);
  const rowsB = asSessionRows(parsedB);
  if (rowsB.length > 0) return rowsB;

  return [];
}

async function listSubagentsViaCli(): Promise<Array<{ id: string; status?: string }>> {
  // No stable CLI surface for subagents in this OpenClaw version.
  return [];
}

async function sendMessageViaCli(sessionKey: string, text: string): Promise<boolean> {
  const result = await runOpenClaw(["sessions", "send", sessionKey, text]);
  return result.ok;
}

async function restartViaCli(reason: string, note: string): Promise<boolean> {
  // Safety gate: real gateway restart is opt-in during MVP wiring.
  if (process.env.CLAWLOGIX_ENABLE_REAL_RESTART !== "1") {
    console.log(`[restart-dryrun] reason=${reason} note=${note}`);
    return true;
  }

  // Try with note first (newer variants), then plain restart.
  const withNote = await runOpenClaw(["gateway", "restart", "--note", `${note} | reason=${reason}`]);
  if (withNote.ok) return true;
  const plain = await runOpenClaw(["gateway", "restart"]);
  return plain.ok;
}

export function createHybridAdapter(): OpenClawAdapter {
  const mainSessionKey = process.env.CLAWLOGIX_MAIN_SESSION_KEY;
  const originSessionKey = process.env.CLAWLOGIX_ORIGIN_SESSION_KEY;

  return {
    listSessions: async () => listSessionsViaCli(),
    listSubagents: async () => listSubagentsViaCli(),

    // Pending replies + queue depth do not currently have stable CLI read surfaces.
    // Keep zero by default and rely on sessions/subagents for now.
    getPendingReplies: async () => 0,
    getQueueDepth: async () => 0,

    sendToMain: async (text: string) => {
      if (mainSessionKey) {
        const ok = await sendMessageViaCli(mainSessionKey, text);
        if (ok) return;
      }
      console.log(`[main] ${text}`);
    },

    sendToOrigin: async (text: string) => {
      if (originSessionKey) {
        const ok = await sendMessageViaCli(originSessionKey, text);
        if (ok) return;
      }
      console.log(`[origin] ${text}`);
    },

    restartGateway: async ({ reason, note }) => {
      const ok = await restartViaCli(reason, note);
      if (!ok) {
        console.log(`[restart-fallback] reason=${reason} note=${note}`);
        throw new Error("Failed to execute gateway restart via CLI");
      }
    },
  };
}

export function createNoopAdapter(): OpenClawAdapter {
  return {
    listSessions: async () => [],
    listSubagents: async () => [],
    getPendingReplies: async () => 0,
    getQueueDepth: async () => 0,
    sendToMain: async (text: string) => {
      console.log(`[main] ${text}`);
    },
    sendToOrigin: async (text: string) => {
      console.log(`[origin] ${text}`);
    },
    restartGateway: async ({ reason, note }) => {
      console.log(`[restart] reason=${reason} note=${note}`);
    },
  };
}
