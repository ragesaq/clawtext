import fs from "node:fs/promises";
import { resolveWorkspacePath } from "./paths.js";

export type ClawLogixPolicy = {
  approval?: {
    forceApprovalMode?: "single_operator" | "two_person";
    operators?: string[];
  };
};

export async function loadPolicy(filePath?: string): Promise<ClawLogixPolicy> {
  const resolved = filePath ?? resolveWorkspacePath("skills", "clawlogix", "policy", "clawlogix.v1.json");
  const raw = await fs.readFile(resolved, "utf8");
  return JSON.parse(raw) as ClawLogixPolicy;
}
