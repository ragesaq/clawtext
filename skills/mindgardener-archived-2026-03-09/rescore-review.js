#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../..');
const REVIEW_DIR = path.join(WORKSPACE, 'memory', 'review');
const EXTRACT_BUFFER = path.join(WORKSPACE, 'memory', 'extract-buffer.jsonl');
const PROMOTIONS_LOG = path.join(WORKSPACE, 'memory', 'promotions.log');
const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig(){
  try { if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8')); }
  catch(e){ console.error('[rescore] failed to load config, using defaults:', e.message); }
  return { allowlist: ['tool_gotcha','typo','docs','tools','documentation','tool'], threshold:0.8, weights:{priority:{low:0.2,medium:0.5,high:0.8,critical:1.0}, category:0.4, keyword:0.2, patternKey:0.15, recurrenceScale:0.03, suggestedAction:0.1}, maxRecurrenceBonus:0.3 };
}

function computeScore(text, config){
  const t = text.toLowerCase();
  const priorityMatch = t.match(/\*\*priority\*\*:\s*(low|medium|high|critical)|priority:\s*(low|medium|high|critical)/i);
  const priority = priorityMatch ? (priorityMatch[1] || priorityMatch[2] || '').toLowerCase() : '';
  const pWeight = (config.weights.priority[priority] || 0);

  let category = '';
  const headerMatch = t.match(/^##\s*\[[A-Z0-9-]+\]\s*([a-z0-9_\-]+)/im);
  if (headerMatch) category = headerMatch[1].toLowerCase();
  else {
    const catField = t.match(/category\s*[:\-]\s*([a-z0-9_\-]+)/i);
    if (catField) category = (catField[1] || '').toLowerCase();
  }
  const categoryScore = config.allowlist.includes(category) ? config.weights.category : 0;

  const keywordHit = config.allowlist.some(a => t.includes(a));
  const keywordScore = keywordHit ? config.weights.keyword : 0;

  const patternKey = t.match(/pattern-key\s*[:\-]\s*([a-z0-9_\-]+)/i);
  const patternScore = patternKey ? config.weights.patternKey : 0;

  const recMatch = t.match(/recurrence-count\s*[:\-]\s*(\d+)/i);
  const recCount = recMatch ? parseInt(recMatch[1],10) : 0;
  const recBonus = Math.min(config.maxRecurrenceBonus, recCount * config.weights.recurrenceScale);

  const suggested = /suggested action|suggested fix|suggested implementation|suggested/i.test(t);
  const suggestedScore = suggested ? config.weights.suggestedAction : 0;

  // phrase rules
  let phraseScore = 0;
  try {
    if (Array.isArray(config.phraseRules)){
      for (const rule of config.phraseRules){
        try{
          const re = new RegExp(rule.pattern, 'i');
          if (re.test(text)) phraseScore += (rule.weight || 0);
        }catch(e){ /* ignore bad regex */ }
      }
      phraseScore = Math.min(1, phraseScore);
    }
  }catch(e){ phraseScore = 0; }

  let score = pWeight * 0.6 + (categoryScore + keywordScore + patternScore + suggestedScore + phraseScore) * 0.4 + recBonus;
  if (score > 1) score = 1;
  return {score, priority, category, recCount, patternKey: (patternKey?patternKey[1]:null)};
}

async function main(){
  const config = loadConfig();
  if (!fs.existsSync(REVIEW_DIR)){
    console.log('[rescore] no review directory found');
    process.exit(0);
  }
  const files = fs.readdirSync(REVIEW_DIR).filter(f=>f.endsWith('.md'));
  if (files.length === 0){ console.log('[rescore] no files to rescore'); process.exit(0); }

  const promoted = [];
  const stillReview = [];

  for (const f of files){
    const p = path.join(REVIEW_DIR, f);
    try{
      const content = fs.readFileSync(p,'utf8');
      const analysis = computeScore(content, config);
      console.log(`[rescore] ${f} -> score=${analysis.score.toFixed(3)} priority=${analysis.priority} category=${analysis.category} rec=${analysis.recCount}`);
      if (analysis.score >= config.threshold){
        const record = { ts: Date.now(), dir: 'mindgardener-rescore', from: 'mindgardener', channel:'mindgardener', conversationId:null, content: content.slice(0,4000), metadata:{rescore:true, score:analysis.score, category:analysis.category, priority:analysis.priority} };
        fs.appendFileSync(EXTRACT_BUFFER, JSON.stringify(record)+'\n');
        promoted.push(f);
        // remove review file
        fs.unlinkSync(p);
      } else {
        stillReview.push(f);
      }
    } catch(e){ console.error('[rescore] failed', f, e.message); }
  }

  if (promoted.length>0){
    const logLine = `${new Date().toISOString()} RESCORE_PROMOTE: promoted ${promoted.length} items: ${promoted.join(', ')}\n`;
    fs.appendFileSync(PROMOTIONS_LOG, logLine);
  }
  if (stillReview.length>0){
    const logLine = `${new Date().toISOString()} RESCORE_REMAIN: ${stillReview.length} items remain in review: ${stillReview.join(', ')}\n`;
    fs.appendFileSync(PROMOTIONS_LOG, logLine);
  }

  console.log('[rescore] done. promoted=', promoted.length, 'remain=', stillReview.length);
}

main().catch(e=>{ console.error('[rescore] fatal', e); process.exit(1); });
