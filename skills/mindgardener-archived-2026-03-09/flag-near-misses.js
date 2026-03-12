#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../..');
const MEM_DIR = path.join(WORKSPACE, 'memory');
const CONFIG_PATH = path.join(__dirname, 'config.json');
const OUT_DIR = path.join(WORKSPACE, 'memory', 'review-inspect');

function loadConfig(){
  try{ return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8')); }catch(e){
    return { allowlist:[], phraseRules:[], generic:['enabled','target','device','debug','events','button','applying','applied','success','right','timestamp','accepted','isaccepted'] };
  }
}

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function tokenizeLines(text){ return text.split(/\r?\n/); }

function findNearMatches(file, text, config){
  const lines = tokenizeLines(text);
  const results = [];
  const generic = config.generic || ['enabled','target','device','debug','events','button','applying','applied','success','right','timestamp','accepted','isaccepted'];
  const phraseRules = Array.isArray(config.phraseRules) ? config.phraseRules.map(r=>({pattern: new RegExp(r.pattern,'i'), weight: r.weight||0, raw:r.pattern})) : [];

  for(let i=0;i<lines.length;i++){
    const L = lines[i];
    const low = L.toLowerCase();
    for(const g of generic){
      if(low.includes(g)){
        // look window +/-3 lines for phrase match
        const start = Math.max(0,i-3), end = Math.min(lines.length-1,i+3);
        const window = lines.slice(start,end+1).join('\n');
        const matchedPhrases = [];
        for(const pr of phraseRules){ if(pr.pattern.test(window)) matchedPhrases.push(pr.raw); }
        if(matchedPhrases.length>0){
          results.push({file:path.basename(file), line:i+1, generic:g, lineText:L.trim(), context: window.trim(), matchedPhrases});
        }
      }
    }
  }
  return results;
}

function emitCandidates(candidates){
  ensureDir(OUT_DIR);
  const ts = new Date().toISOString().replace(/[:.]/g,'');
  let count=0;
  for(const c of candidates){
    const name = `${ts}-${c.file.replace(/[^a-z0-9]+/gi,'_')}-L${c.line}.md`;
    const pathOut = path.join(OUT_DIR,name);
    const md = `---\nsource: mindgardener-near-miss\nfile: ${c.file}\nline: ${c.line}\ngeneric: ${c.generic}\nmatchedPhrases: ${JSON.stringify(c.matchedPhrases)}\nts: ${new Date().toISOString()}\n---\n\n### Context (±3 lines)\n\n\n\
${c.context.replace(/\n/g,'\n\n')}\n\n---\n\n_Suggested action:_ Review this snippet for promotion; annotate Priority/Category/Suggested Action if OK.\n`;
    fs.writeFileSync(pathOut,md,'utf8');
    count++;
  }
  return count;
}

function main(){
  const config = loadConfig();
  const files = fs.readdirSync(MEM_DIR).filter(f=>f.endsWith('.md'));
  let allCandidates = [];
  for(const f of files){
    try{
      const p = path.join(MEM_DIR,f);
      const txt = fs.readFileSync(p,'utf8');
      const matches = findNearMatches(p,txt,config);
      allCandidates.push(...matches);
    }catch(e){/* ignore */}
  }
  if(allCandidates.length===0){ console.log('No near-miss candidates found.'); return; }
  const count = emitCandidates(allCandidates);
  const logLine = `${new Date().toISOString()} NEAR_MISS: created ${count} review-inspect items\n`;
  fs.appendFileSync(path.join(WORKSPACE,'memory','promotions.log'),logLine);
  console.log(`Created ${count} review-inspect items in memory/review-inspect/`);
}

main();
