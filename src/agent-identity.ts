/**
 * Agent Identity Module
 * 
 * Handles agent identity propagation for multi-agent deployments.
 * Part of Phase 1: Identity Propagation (Gore's Decoherence Hardening Brief)
 * 
 * References:
 * - docs/AGENT_TIER_ARCHITECTURE.md
 * - docs/AGENT_TIER_ARCHITECTURE.md (Gore's brief)
 */

import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

export interface AgentIdentity {
  agentId: string;
  agentRole: 'council' | 'director' | 'worker';
  agentName: string;
  workspacePath: string;
}

export interface ClawTextMultiAgentConfig {
  enabled: boolean;
  defaultVisibility: 'private' | 'shared' | 'council';
  agentIdentity?: AgentIdentity;
}

const DEFAULT_MULTI_AGENT_CONFIG: ClawTextMultiAgentConfig = {
  enabled: false,
  defaultVisibility: 'shared',
};

/**
 * Resolve agent identity from workspace path or config.
 * 
 * Priority:
 * 1. Explicit config (clawtext.multiAgent.agentIdentity)
 * 2. Workspace path derivation (e.g., workspace-council/gore-antagonist → gore-antagonist)
 * 3. Fallback to 'default'
 */
export function resolveAgentIdentity(workspacePath: string, config?: ClawTextMultiAgentConfig): AgentIdentity {
  // Priority 1: Explicit config
  if (config?.agentIdentity) {
    return config.agentIdentity;
  }

  // Priority 2: Derive from workspace path
  // E.g., /home/.../workspace-council/gore-antagonist → gore-antagonist
  const pathParts = workspacePath.split('/');
  const lastPart = pathParts[pathParts.length - 1];

  // Common patterns: workspace-council/{agent}, workspace/{project}
  if (lastPart.includes('council') || lastPart.includes('gore') || lastPart.includes('sentinel')) {
    // It's a council workspace - extract agent name
    const agentName = lastPart.includes('-') 
      ? lastPart.split('-').slice(1).join('-')  // gore-antagonist → antagonist
      : lastPart;
    
    return {
      agentId: lastPart,
      agentRole: 'council',
      agentName: agentName,
      workspacePath,
    };
  }

  // Priority 3: Fallback
  return {
    agentId: 'default',
    agentRole: 'worker',
    agentName: 'default',
    workspacePath,
  };
}

/**
 * Load multi-agent config from openclaw.json
 */
export function loadMultiAgentConfig(workspacePath: string): ClawTextMultiAgentConfig {
  const configPath = join(workspacePath, '..', 'openclaw.json'); // sibling to workspace
  
  if (!existsSync(configPath)) {
    return DEFAULT_MULTI_AGENT_CONFIG;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    const clawtext = config?.clawtext || {};
    const multiAgent = clawtext?.multiAgent;
    
    if (!multiAgent) {
      return DEFAULT_MULTI_AGENT_CONFIG;
    }

    return {
      enabled: multiAgent.enabled ?? DEFAULT_MULTI_AGENT_CONFIG.enabled,
      defaultVisibility: multiAgent.defaultVisibility ?? DEFAULT_MULTI_AGENT_CONFIG.defaultVisibility,
      agentIdentity: multiAgent.agentIdentity,
    };
  } catch {
    return DEFAULT_MULTI_AGENT_CONFIG;
  }
}

/**
 * Get the default visibility for memories in multi-agent mode.
 * In council mode, default is 'private' (per Gore's brief).
 * In single-agent mode, default is 'shared'.
 */
export function getDefaultVisibility(config: ClawTextMultiAgentConfig): 'private' | 'shared' | 'council' {
  if (!config.enabled) {
    return 'shared'; // Single-agent mode
  }
  return config.defaultVisibility;
}

/**
 * Determine if we're running in multi-agent mode
 */
export function isMultiAgentMode(workspacePath: string): boolean {
  const config = loadMultiAgentConfig(workspacePath);
  return config.enabled;
}