#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../..');
const MEM_DIR = path.join(WORKSPACE, 'memory');

const generic = ['enabled','target','right','debug','device','events','applying','applied','success','button','timestamp','accepted','isaccepted'];
const domain = ['setdeviceoffset','driveroffsets','smoothing','openvr','gamedetector'];
const signals = ['priority','suggested action','suggested fix','pattern-key','recurrence-count','see also'];

function scanFile(p){
  const text = fs.readFileSync(p,'utf8');
  const lines = text.split(/\r?\n/);
  const results = [];
  for (let i=0;i<lines.length;i++){
    const L = lines[i];
    const lower = L.toLowerCase();
    for (const g of generic){
      if (lower.includes(g)){
        // check co-occurrence in nearby lines (window -2..+2)
        const window = [];
        for (let j=Math.max(0,i-2); j<=Math.min(lines.length-1,i+2); j++) window.push(lines[j]);
        const windowText = window.join(' ');
        const hasDomain = domain.filter(d=>windowText.toLowerCase().includes(d));
        const hasSignal = signals.filter(s=>windowText.toLowerCase().includes(s));
        results.push({file: path.basename(p), lineNum: i+1, token: g, line: L.trim(), context: windowText.trim(), domain: hasDomain, signals: hasSignal});
      }
    }
  }
  return results;
}

function scanAll(){
  const files = fs.readdirSync(MEM_DIR).filter(f=>f.endsWith('.md'));
  const all = [];
  for (const f of files){
    try{ const p = path.join(MEM_DIR,f); const res = scanFile(p); if (res.length>0) all.push(...res);}catch(e){}
  }
  return all;
}

function summarize(all){
  const byToken = {};
  for (const r of all){
    byToken[r.token] = byToken[r.token]||{count:0,withDomain:0,withSignal:0,examples:[]};
    byToken[r.token].count++;
    if (r.domain.length>0) byToken[r.token].withDomain++;
    if (r.signals.length>0) byToken[r.token].withSignal++;
    if (byToken[r.token].examples.length<5) byToken[r.token].examples.push({file:r.file,line:r.lineNum,line:r.line,domain:r.domain,signals:r.signals});
  }
  return byToken;
}

function main(){
  const all = scanAll();
  const summary = summarize(all);
  console.log('Association summary (generic tokens -> occurrences, co-occurring domain hits, co-occurring signals):\n');
  for (const k of Object.keys(summary).sort((a,b)=>summary[b].count-summary[a].count)){
    const v = summary[k];
    console.log(`${k}: ${v.count} occurrences, withDomain=${v.withDomain}, withSignal=${v.withSignal}`);
    v.examples.forEach((e,idx)=>{
      console.log(`  example ${idx+1} (${e.file}:${e.line}): ${e.line}`);
      if (e.domain.length) console.log(`    domain hits: ${e.domain.join(', ')}`);
      if (e.signals.length) console.log(`    signals: ${e.signals.join(', ')}`);
    });
    console.log('');
  }
  if (all.length===0) console.log('No occurrences found.');
}

main();
