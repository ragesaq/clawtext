#!/usr/bin/env node

import { ClawTextRAG } from '../dist/index.js';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const query = process.argv.slice(2).join(' ') || 'how does proxmox handle zfs';
const rag = new ClawTextRAG(process.env.HOME + '/.openclaw/workspace');
const results = rag.findRelevantMemories(query, ['proxmox']);

if (!results.length) {
  fail('no retrieval results returned');
}

const top = results[0];
console.log(JSON.stringify({
  query,
  topType: top.type,
  topProvenanceKind: top.provenanceKind,
  topProvenanceLabel: top.provenanceLabel,
  topSource: top.source,
  sample: top.content.slice(0, 220),
}, null, 2));

if (top.provenanceKind !== 'collection-doc' && top.provenanceKind !== 'library-entry' && top.provenanceKind !== 'library-overlay') {
  fail('top result is not from Library Lane');
}

console.log('PASS: Library Lane retrieval preferred for reference-style query');
