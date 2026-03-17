#!/usr/bin/env node

import { ClawTextLibraryIndex } from '../dist/library-index.js';

async function main() {
  const indexer = new ClawTextLibraryIndex();
  const result = indexer.build();
  console.log(`Library index built: ${result.output}`);
  console.log(`Total records: ${result.total}`);
  console.log(`Collection docs: ${result.collections}`);
  console.log(`Entries: ${result.entries}`);
  console.log(`Overlays: ${result.overlays}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
