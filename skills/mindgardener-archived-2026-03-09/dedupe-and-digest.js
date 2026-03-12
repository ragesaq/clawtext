#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../..');
const IN_DIR = path.join(WORKSPACE, 'memory', 'review-inspect');
const OUT_DIR = path.join(WORKSPACE, 'memory', 'review-inspect-dedup');
const DIGEST_PATH = path.join(WORKSPACE, 'memory', 'review-inspect-digest.json');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function normalize(s){
  // Remove timestamps and numbers, collapse whitespace, lower-case
  return s
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g,'')
    .replace(/\d{4}-\d{2}-\d{2}/g,'')
    .replace(/\d{2}:\d{2}:\d{2}/g,'')
    .replace(/\b\d+\b/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toLowerCase()
    .slice(0,1500); // cap length
}

function hash(s){ return crypto.createHash('sha1').update(s).digest('hex').slice(0,12); }

function readFiles(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f=>f.endsWith('.md')).map(f=>({name:f,path:path.join(dir,f)}));
}

function extractMetaAndContext(text){
  // very simple frontmatter parse for our generated files
  const meta = {};
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  let body = text;
  if(fm){
    const lines = fm[1].split(/\r?\n/);
    for(const L of lines){
      const m = L.match(/^([^:]+):\s*(.*)$/);
      if(m) meta[m[1].trim()] = m[2].trim();
    }
    body = text.slice(fm[0].length).trim();
  }
  // get context section
  const ctxMatch = body.match(/### Context \(±3 lines\)\n([\s\S]*)/i);
  const context = ctxMatch ? ctxMatch[1].trim() : body.slice(0,800);
  return {meta, context};
}

async function main(){
  ensureDir(OUT_DIR);
  const files = readFiles(IN_DIR);
  if(files.length===0){ console.log('No review-inspect files found.'); return; }

  const groups = new Map();

  for(const f of files){
    try{
      const txt = fs.readFileSync(f.path,'utf8');
      const {meta, context} = extractMetaAndContext(txt);
      const norm = normalize(context);
      const key = hash(norm + '|' + (meta.matchedPhrases||''));
      if(!groups.has(key)) groups.set(key, {key, norm, examples:[],count:0,files:new Set(),matchedPhrases:meta.matchedPhrases||''});
      const g = groups.get(key);
      g.count += 1;
      g.examples.push({file:meta.file||f.name,line:meta.line||'',generic:meta.generic||'',matchedPhrases: meta.matchedPhrases||'', snippet: context.slice(0,800)});
      g.files.add(meta.file||f.name);
    }catch(e){ /* ignore */ }
  }

  // Convert sets
  const arr = Array.from(groups.values()).map(g=>({
    key: g.key,
    count: g.count,
    files: Array.from(g.files).slice(0,10),
    matchedPhrases: g.matchedPhrases,
    snippet: g.norm.slice(0,800),
    examples: g.examples.slice(0,3)
  }));

  arr.sort((a,b)=>b.count - a.count);

  // write top 100 digest
  const top = arr.slice(0,100);
  fs.writeFileSync(DIGEST_PATH, JSON.stringify({generated:new Date().toISOString(),totalGroups:arr.length,top:top}, null, 2),'utf8');

  // write dedup files: one file per group
  for(const g of arr){
    const outName = `${g.key}.md`;
    const outPath = path.join(OUT_DIR,outName);
    if(!fs.existsSync(outPath)){
      const md = `---\nkey: ${g.key}\ncount: ${g.count}\nfiles: ${g.files.join(', ')}\nmatchedPhrases: ${g.matchedPhrases}\nts: ${new Date().toISOString()}\n---\n\n# Candidate (count=${g.count})\n\n${g.snippet}\n\n## Examples\n\n${g.examples.map(e=>`- ${e.file}:${e.line} ${e.generic} matched:${e.matchedPhrases}\n  \n  ${e.snippet.slice(0,400)}`).join('\n\n')}\n`;
      fs.writeFileSync(outPath, md, 'utf8');
    }
  }

  console.log(`Dedup complete. Groups=${arr.length}. Top 100 written to ${DIGEST_PATH}. Dedup files in ${OUT_DIR}.`);
}

main().catch(e=>{ console.error('fatal', e); process.exit(1); });
