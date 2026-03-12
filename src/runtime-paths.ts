import path from 'path';

export type ClawTextStateEnv = 'dev' | 'prod';

export function getClawTextStateRoot(workspacePath: string, env?: ClawTextStateEnv): string {
  const explicit = process.env.CLAWTEXT_STATE_ROOT;
  if (explicit && explicit.trim()) return explicit;
  const stateEnv = env || (process.env.CLAWTEXT_STATE_ENV as ClawTextStateEnv) || 'prod';
  return path.join(workspacePath, 'state', 'clawtext', stateEnv);
}

export function getClawTextProdStateRoot(workspacePath: string): string {
  return getClawTextStateRoot(workspacePath, 'prod');
}

export function getClawTextDevStateRoot(workspacePath: string): string {
  return getClawTextStateRoot(workspacePath, 'dev');
}

export function getClawTextCacheDir(workspacePath: string): string {
  return path.join(getClawTextProdStateRoot(workspacePath), 'cache');
}

export function getClawTextOperationalDir(workspacePath: string): string {
  return path.join(getClawTextProdStateRoot(workspacePath), 'operational');
}

export function getClawTextIngestStateDir(workspacePath: string): string {
  return path.join(getClawTextProdStateRoot(workspacePath), 'ingest');
}

export function getClawTextEvalDevDir(workspacePath: string): string {
  return path.join(getClawTextDevStateRoot(workspacePath), 'evals');
}
