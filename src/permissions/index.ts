/**
 * ClawText Permission Model — Context Access Control (CAC)
 *
 * 4-layer hierarchical permission resolution:
 *   Global Defaults → Role → Vault Override → User Override
 *
 * More specific wins. Spec: docs/PERMISSION_MODEL.md
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type RecallBudget = 'low' | 'medium' | 'high';
export type PermissionSource = 'defaults' | 'role' | 'vault' | 'user';

export interface PermissionRecord {
  recall?: boolean;
  retain?: boolean;
  recallBudget?: RecallBudget;
  recallMaxTokens?: number;
  retainEveryNTurns?: number;
  retainRoles?: string[];
  retainTags?: string[];
  llmModel?: string;
  excludeProviders?: string[];
  crossSessionVisibility?: boolean;
  operationalLearningAccess?: boolean;
}

export interface GlobalDefaults extends Required<PermissionRecord> {
  // same fields, all required
}

export interface RoleDefinition extends PermissionRecord {
  roleId: string;
  displayName: string;
  members: string[];
}

export interface VaultOverride {
  vaultId: string;
  roleOverrides?: Record<string, PermissionRecord>;
  globalOverride?: PermissionRecord;
}

export interface UserOverride extends PermissionRecord {
  userId: string;
  vaultId: string;
}

export interface ResolvedPermissions extends Required<PermissionRecord> {
  source: PermissionSource;
  resolvedAt: string;
}

export interface PermissionContext {
  userId: string;
  vaultId: string;
  operation?: 'recall' | 'retain' | 'both';
}

// ──────────────────────────────────────────────
// Default values
// ──────────────────────────────────────────────

export const DEFAULT_PERMISSIONS: GlobalDefaults = {
  recall: true,
  retain: true,
  recallBudget: 'low',
  recallMaxTokens: 512,
  retainEveryNTurns: 5,
  retainRoles: ['user', 'assistant'],
  retainTags: [],
  llmModel: 'claude-haiku-4.5',
  excludeProviders: [],
  crossSessionVisibility: false,
  operationalLearningAccess: false,
};

// ──────────────────────────────────────────────
// Path helpers
// ──────────────────────────────────────────────

export function getPermissionsRoot(workspacePath?: string): string {
  // Support explicit CLAWTEXT_STATE_ROOT override
  if (process.env.CLAWTEXT_STATE_ROOT) {
    return join(process.env.CLAWTEXT_STATE_ROOT, 'permissions');
  }
  const workspace = workspacePath ||
    process.env.OPENCLAW_WORKSPACE_PATH ||
    join(process.env.HOME || '', '.openclaw', 'workspace');
  return join(workspace, 'state', 'clawtext', 'prod', 'permissions');
}

function getDefaultsPath(root: string): string {
  return join(root, 'defaults.json');
}

function getRolesDir(root: string): string {
  return join(root, 'roles');
}

function getVaultsDir(root: string): string {
  return join(root, 'vaults');
}

function getUsersDir(root: string): string {
  return join(root, 'users');
}

// ──────────────────────────────────────────────
// Loaders
// ──────────────────────────────────────────────

function loadJSON<T>(filePath: string, fallback: T): T {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function loadGlobalDefaults(root: string): GlobalDefaults {
  const loaded = loadJSON<Partial<GlobalDefaults>>(getDefaultsPath(root), {});
  return { ...DEFAULT_PERMISSIONS, ...loaded };
}

export function loadRoles(root: string): RoleDefinition[] {
  const dir = getRolesDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => loadJSON<RoleDefinition | null>(join(dir, f), null))
    .filter((r): r is RoleDefinition => r !== null);
}

export function loadVaultOverride(root: string, vaultId: string): VaultOverride | null {
  return loadJSON<VaultOverride | null>(join(getVaultsDir(root), `${vaultId}.json`), null);
}

export function loadUserOverride(root: string, userId: string, vaultId: string): UserOverride | null {
  return loadJSON<UserOverride | null>(
    join(getUsersDir(root), userId, `${vaultId}.json`),
    null
  );
}

// ──────────────────────────────────────────────
// Resolver
// ──────────────────────────────────────────────

/**
 * Merge permission records — later entries win for defined fields.
 */
function merge(...layers: (Partial<PermissionRecord> | undefined)[]): Partial<PermissionRecord> {
  const result: Partial<PermissionRecord> = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [k, v] of Object.entries(layer)) {
      if (v !== undefined) {
        (result as Record<string, unknown>)[k] = v;
      }
    }
  }
  return result;
}

/**
 * Resolve permissions for a user+vault combination.
 *
 * Resolution order:
 * 1. Global defaults
 * 2. Role (highest-privilege role if member of multiple)
 * 3. Vault override for that role
 * 4. User override for that vault
 */
export function resolvePermissions(
  ctx: PermissionContext,
  workspacePath?: string
): ResolvedPermissions {
  const root = getPermissionsRoot(workspacePath);
  let source: PermissionSource = 'defaults';

  // Layer 1: Global defaults
  const defaults = loadGlobalDefaults(root);
  let resolved: Partial<PermissionRecord> = { ...defaults };

  // Layer 2: Roles
  const roles = loadRoles(root);
  const userRoles = roles.filter((r) => r.members.includes(ctx.userId));

  if (userRoles.length > 0) {
    source = 'role';
    // Apply all matching roles in order (last wins for conflicts — can refine later)
    for (const role of userRoles) {
      const { roleId: _roleId, displayName: _dn, members: _m, ...perms } = role;
      resolved = merge(resolved, perms);
    }

    // Layer 3: Vault override (for each matching role)
    const vaultOverride = loadVaultOverride(root, ctx.vaultId);
    if (vaultOverride) {
      for (const role of userRoles) {
        const roleOverride = vaultOverride.roleOverrides?.[role.roleId];
        if (roleOverride) {
          source = 'vault';
          resolved = merge(resolved, roleOverride);
        }
      }
      // Also apply global vault override if present
      if (vaultOverride.globalOverride) {
        source = 'vault';
        resolved = merge(resolved, vaultOverride.globalOverride);
      }
    }
  }

  // Layer 4: User override
  const userOverride = loadUserOverride(root, ctx.userId, ctx.vaultId);
  if (userOverride) {
    const { userId: _u, vaultId: _v, ...perms } = userOverride;
    source = 'user';
    resolved = merge(resolved, perms);
  }

  // Merge back with defaults to ensure all fields are present
  const final = merge(defaults, resolved) as GlobalDefaults;

  return {
    ...final,
    source,
    resolvedAt: new Date().toISOString(),
  };
}

/**
 * Check if a user can perform an operation.
 */
export function canAccess(
  ctx: PermissionContext,
  workspacePath?: string
): { allowed: boolean; permissions: ResolvedPermissions } {
  const permissions = resolvePermissions(ctx, workspacePath);
  const op = ctx.operation || 'both';

  let allowed = true;
  if (op === 'recall' && !permissions.recall) allowed = false;
  if (op === 'retain' && !permissions.retain) allowed = false;
  if (op === 'both' && (!permissions.recall || !permissions.retain)) allowed = false;

  return { allowed, permissions };
}
