#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../..');
const ARCHIVE_DIR = path.join(WORKSPACE, 'memory', 'log-archive');
const QUEUE_DIR = path.join(WORKSPACE, 'memory', 'summarizer-queue');
const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig(){
  try{ return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8')); }catch(e){ return null; }
}

function extractMeta(text){
  const m = text.match(/---([\s\S]*?)---/);
  if(!m) return {};
  const fm = m[1];
  const res = {};
  fm.split(/\n/).forEach(l=>{ const mm = l.match(/([^:]+):\s*(.*)$/); if(mm) res[mm[1].trim()]=mm[2].trim(); });
  return res;
}

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function main(){
  const config = loadConfig();
  if(!config) { console.error('no config'); process.exit(1); }
  ensureDir(QUEUE_DIR);
  const files = fs.readdirSync(ARCHIVE_DIR).filter(f=>f.endsWith('.md'));
  const eligible = [];
  for(const f of files){
    const p = path.join(ARCHIVE_DIR,f);
    const text = fs.readFileSync(p,'utf8');
    const meta = extractMeta(text);
    const count = meta.count ? parseInt(meta.count,10) : 0;
    const matched = meta.matchedPhrases ? JSON.parse(meta.matchedPhrases) : [];
    if(count >= (config.promoteCountThreshold||20)){
      // check required param patterns
      let paramOk = false;
      for(const ph of matched){
        const key = ph.toLowerCase();
        if(config.requiredParamPatterns && config.requiredParamPatterns[key]){
          const reqRe = new RegExp(config.requiredParamPatterns[key],'i');
          if(reqRe.test(text)) { paramOk = true; break; }
        } else {
          // if phrase doesn't have required param rule, accept
          paramOk = true; break;
        }
      }
      if(paramOk){ eligible.push({file:f,path:p,count,matched}); }
    }
  }
  eligible.sort((a,b)=>b.count-a.count);
  console.log('eligible groups:', eligible.length);
  // queue top 20
  const toQueue = eligible.slice(0,20);
  for(const g of toQueue){
    const key = path.basename(g.file,'.md');
    const qpath = path.join(QUEUE_DIR, key + '.json');
    if(fs.existsSync(qpath)) { console.log('already queued', key); continue; }
    const payload = { key, count: g.count, files: g.matched, matchedPhrases: g.matched, ts: new Date().toISOString() };
    fs.writeFileSync(qpath, JSON.stringify(payload));
    console.log('queued', key);
  }
}

main();
