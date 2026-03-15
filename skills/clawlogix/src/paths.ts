import fs from "node:fs";
import path from "node:path";

function findWorkspaceRoot(start: string): string {
  let cur = start;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(cur, "MEMORY.md")) || fs.existsSync(path.join(cur, ".git"))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return start;
}

export function resolveWorkspaceRoot(): string {
  if (process.env.CLAWLOGIX_WORKSPACE_ROOT) return process.env.CLAWLOGIX_WORKSPACE_ROOT;
  return findWorkspaceRoot(process.cwd());
}

export function resolveWorkspacePath(...segments: string[]): string {
  return path.join(resolveWorkspaceRoot(), ...segments);
}
