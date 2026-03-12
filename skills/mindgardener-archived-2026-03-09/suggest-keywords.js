#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../..');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');

const STOPWORDS = new Set(['the','and','for','that','this','with','from','have','has','was','were','are','but','not','you','your','they','their','project','file','files','also','can','use','using','useful','will','which','what','when','how','where','why','all','any','one','two','three','our','we']);

function tokenize(s){
  return s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(t=>t.length>3 && !STOPWORDS.has(t));
}

function scan(){
  const counts = new Map();
  const files = fs.readdirSync(MEMORY_DIR).filter(f=>f.endsWith('.md'));
  for (const f of files){
    try{
      const p = path.join(MEMORY_DIR, f);
      const t = fs.readFileSync(p,'utf8');
      const tokens = tokenize(t);
      for (const tok of tokens){
        counts.set(tok, (counts.get(tok)||0)+1);
      }
    } catch(e){ /* ignore */ }
  }
  const arr = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
  return arr.slice(0,50).map(x=>({term:x[0],count:x[1]}));
}

function suggest(){
  const top = scan();
  // prefer longer, specific tokens
  const candidates = top.filter(t=>t.count>=2 && t.term.length>4).slice(0,30);
  const keywords = candidates.map(c=>c.term).slice(0,20);
  console.log('\nSuggested keywords (top 20):\n');
  keywords.forEach((k,i)=>console.log(`${i+1}. ${k}`));
}

suggest();
