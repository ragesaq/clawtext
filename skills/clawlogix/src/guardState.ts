import fs from "node:fs/promises";
import path from "node:path";
import { resolveWorkspacePath } from "./paths.js";

type GuardState = {
  lastAutoAbortAtMs?: number;
};

function statePath() {
  return resolveWorkspacePath("skills", "clawlogix", ".state", "guard-state.json");
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function loadGuardState(): Promise<GuardState> {
  try {
    const raw = await fs.readFile(statePath(), "utf8");
    return JSON.parse(raw) as GuardState;
  } catch {
    return {};
  }
}

export async function saveGuardState(state: GuardState): Promise<void> {
  const fp = statePath();
  await ensureDir(fp);
  await fs.writeFile(fp, JSON.stringify(state, null, 2), "utf8");
}

export async function markAutoAbort(nowMs = Date.now()): Promise<void> {
  const st = await loadGuardState();
  st.lastAutoAbortAtMs = nowMs;
  await saveGuardState(st);
}
