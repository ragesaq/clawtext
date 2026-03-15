import fs from "node:fs/promises";
import path from "node:path";
import type { RestartRequest } from "./types.js";
import { resolveWorkspacePath } from "./paths.js";

function resolveStorePath(): string {
  if (process.env.CLAWLOGIX_REQUEST_STORE) return process.env.CLAWLOGIX_REQUEST_STORE;
  return resolveWorkspacePath("skills", "clawlogix", ".state", "requests.json");
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function loadRequests(): Promise<RestartRequest[]> {
  const filePath = resolveStorePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw) as RestartRequest[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveRequests(requests: RestartRequest[]): Promise<void> {
  const filePath = resolveStorePath();
  await ensureDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(requests, null, 2), "utf8");
}

export async function upsertRequest(req: RestartRequest): Promise<void> {
  const requests = await loadRequests();
  const idx = requests.findIndex((r) => r.id === req.id);
  if (idx >= 0) requests[idx] = req;
  else requests.push(req);
  await saveRequests(requests);
}

export async function getRequestById(id: string): Promise<RestartRequest | undefined> {
  const requests = await loadRequests();
  return requests.find((r) => r.id === id);
}
