import fs from "node:fs/promises";
import path from "node:path";
import { resolveWorkspacePath } from "./paths.js";

export type IncidentStatus = "open" | "acknowledged" | "mitigating" | "resolved";

export type Incident = {
  id: string;
  type: string;
  createdAt: string;
  status: IncidentStatus;
  evidence: Record<string, unknown>;
  analysis?: Record<string, unknown>;
};

function incidentsPath() {
  return resolveWorkspacePath("skills", "clawlogix", ".state", "incidents.json");
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function loadAll(): Promise<Incident[]> {
  try {
    const raw = await fs.readFile(incidentsPath(), "utf8");
    const parsed = JSON.parse(raw) as Incident[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAll(incidents: Incident[]): Promise<void> {
  const fp = incidentsPath();
  await ensureDir(fp);
  await fs.writeFile(fp, JSON.stringify(incidents, null, 2), "utf8");
}

export async function raiseIncident(
  type: string,
  evidence: Record<string, unknown>,
  analysis?: Record<string, unknown>,
): Promise<Incident> {
  const incident: Incident = {
    id: `inc_${type}_${Date.now()}`,
    type,
    createdAt: new Date().toISOString(),
    status: "open",
    evidence,
    analysis,
  };
  const incidents = await loadAll();
  incidents.push(incident);
  await saveAll(incidents);
  return incident;
}

export async function listIncidents(): Promise<Incident[]> {
  const incidents = await loadAll();
  return incidents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getIncident(id: string): Promise<Incident | undefined> {
  const incidents = await loadAll();
  return incidents.find((i) => i.id === id);
}

export async function setIncidentStatus(id: string, status: IncidentStatus): Promise<Incident> {
  const incidents = await loadAll();
  const idx = incidents.findIndex((i) => i.id === id);
  if (idx < 0) throw new Error(`Unknown incident: ${id}`);
  incidents[idx].status = status;
  await saveAll(incidents);
  return incidents[idx];
}
