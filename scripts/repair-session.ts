#!/usr/bin/env npx tsx
/**
 * Repair a poisoned session transcript by normalizing cross-provider tool call IDs.
 *
 * Usage: npx tsx scripts/repair-session.ts <transcript-path>
 *
 * Example:
 *   npx tsx scripts/repair-session.ts ~/.openclaw/agents/pylon/sessions/652825fd-....jsonl
 */

import { repairSessionTranscript } from '../src/tool-call-id-normalizer';

async function main() {
  const transcriptPath = process.argv[2];
  if (!transcriptPath) {
    console.error('Usage: npx tsx scripts/repair-session.ts <transcript-path>');
    process.exit(1);
  }

  console.log(`Repairing: ${transcriptPath}`);

  const result = await repairSessionTranscript(transcriptPath);

  if (result.repaired) {
    console.log(`✅ Repaired ${result.remappedCount} tool call IDs across ${result.lineCount} lines`);
  } else {
    console.log(`ℹ️  No cross-provider IDs found in ${result.lineCount} lines — transcript is clean`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
