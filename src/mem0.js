import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEM0_PATH = path.join(__dirname, '..', 'memory', 'mem0.jsonl');
const ARCHIVE_DIR = path.join(__dirname, '..', 'memory', 'log-archive');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

export function initMem0(){ ensureDir(path.dirname(MEM0_PATH)); if(!fs.existsSync(MEM0_PATH)) fs.writeFileSync(MEM0_PATH,'','utf8'); }

export function indexArchiveToMem0(){
  initMem0();
  if(!fs.existsSync(ARCHIVE_DIR)) return 0;
  const files = fs.readdirSync(ARCHIVE_DIR).filter(f=>f.endsWith('.md'));
  let written = 0;
  for(const f of files){
    try{
      const p = path.join(ARCHIVE_DIR,f);
      const text = fs.readFileSync(p,'utf8');
      // parse frontmatter-like key/count/matchedPhrases
      const metaMatch = text.match(/^---\n([\s\S]*?)\n---/);
      let meta = {};
      if(metaMatch){
        metaMatch[1].split(/\n/).forEach(line=>{ const m=line.match(/^([^:]+):\s*(.*)$/); if(m) meta[m[1].trim()]=m[2].trim(); });
      }
      const key = f.replace('.md','');
      const count = meta.count ? parseInt(meta.count,10): (meta.count===0?0:1);
      let matched = [];
      try{ matched = meta.matchedPhrases ? (JSON.parse(meta.matchedPhrases)||[]) : []; }catch(e){ matched = meta.matchedPhrases ? [meta.matchedPhrases] : []; }
      const excerpt = text.replace(/^[\s\S]*?---\n/,'').slice(0,2000);
      const record = { key, count, matchedPhrases: matched, ts: meta.ts || new Date().toISOString(), content: excerpt };
      // append to mem0.jsonl if not already present
      const exists = fs.readFileSync(MEM0_PATH,'utf8').split('\n').some(l=>l.trim().length>0 && JSON.parse(l).key===key);
      if(!exists){ fs.appendFileSync(MEM0_PATH, JSON.stringify(record)+'\n','utf8'); written++; }
    }catch(e){ /* ignore per-file errors */ }
  }
  return written;
}

export function queryMem0(query, max=5, phraseRules=[]){
  initMem0();
  if(!fs.existsSync(MEM0_PATH)) return [];
  const lines = fs.readFileSync(MEM0_PATH,'utf8').split('\n').filter(l=>l.trim().length>0);
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(t=>t.length>2);
  const results = [];
  for(const l of lines){
    try{
      const obj = JSON.parse(l);
      const text = (obj.content||'').toLowerCase();
      let score = 0;
      tokens.forEach(t=>{ if(text.includes(t)) score += 1; });
      // phrase rules boost
      if(Array.isArray(phraseRules)){
        for(const pr of phraseRules){ try{ const re=new RegExp(pr.pattern,'i'); if(re.test(obj.content)) score += (pr.weight||0.5); }catch(e){} }
      }
      // frequency boost
      score += Math.log10(Math.max(1,obj.count))*0.5;
      if(score>0) results.push({score, memory: obj});
    }catch(e){ }
  }
  results.sort((a,b)=>b.score-a.score);
  return results.slice(0,max).map(r=>({source:'mem0',score:r.score,memory:r.memory}));
}

export default { initMem0, indexArchiveToMem0, queryMem0 };
