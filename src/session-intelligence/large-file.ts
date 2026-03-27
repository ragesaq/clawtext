import fs from 'node:fs';
import path from 'node:path';

export type PayloadRef = {
  refId: string;
  originalSize: number;
  storedAt: string;
  storagePath?: string;
  contentHash: string;
  createdAt: string;
};

// Backward-compatible alias.
export type LargePayloadRef = PayloadRef;

/**
 * Check if content should be externalized (>4000 chars).
 */
export function shouldExternalize(content: string): boolean {
  return content.length > 4000;
}

/**
 * Externalize large content to workspace storage.
 */
export function externalizePayload(
  workspacePath: string,
  sessionId: string,
  content: string,
  _hint?: string,
): PayloadRef {
  const hash = content.slice(0, 16).replace(/\s/g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
  const refId = `payload-${Date.now()}-${hash}`;
  const createdAt = new Date().toISOString();

  const metadataOnlyRef: PayloadRef = {
    refId,
    originalSize: content.length,
    storedAt: `.clawtext/payloads/${refId}.txt`,
    contentHash: hash,
    createdAt,
  };

  try {
    const sessionDir = path.join(workspacePath, 'large-file-payloads', sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const trimmed = content.trimStart();
    const ext = trimmed.startsWith('{') || trimmed.startsWith('[') ? 'json' : 'txt';
    const filePath = path.join(sessionDir, `${refId}.${ext}`);

    fs.writeFileSync(filePath, content, 'utf8');

    return {
      ...metadataOnlyRef,
      storedAt: filePath,
      storagePath: filePath,
    };
  } catch (error) {
    console.warn(
      `[clawtext-session-intelligence] Failed to externalize payload: ${error instanceof Error ? error.message : String(error)}`,
    );
    return metadataOnlyRef;
  }
}
