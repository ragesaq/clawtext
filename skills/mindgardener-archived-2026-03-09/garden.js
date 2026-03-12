#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { detectAndRouteAction } from './action-adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../..');
const LEARNINGS_DIR = path.join(WORKSPACE, '.learnings');
console.log('[mindgardener] WORKSPACE=' + WORKSPACE);
console.log('[mindgardener] LEARNINGS_DIR=' + LEARNINGS_DIR);
const STAGING_DIR = path.join(WORKSPACE, 'memory', 'staging');
const REVIEW_DIR = path.join(WORKSPACE, 'memory', 'review');
const EXTRACT_BUFFER = path.join(WORKSPACE, 'memory', 'extract-buffer.jsonl');
const VALIDATE_SCRIPT = path.join(WORKSPACE, 'skills', 'clawtext', 'scripts', 'validate-rag.js');
const CONFIG_PATH = path.join(__dirname, 'config.json');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function slugify(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60); }

function loadConfig(){
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
  } catch(e){ console.error('[mindgardener] failed to load config, using defaults:', e.message); }
  return {
    allowlist: ['tool_gotcha','typo','docs','tools','documentation','tool'],
    threshold: 0.8,
    weights: {
      priority: {low:0.2, medium:0.5, high:0.8, critical:1.0},
      category: 0.4,
      keyword: 0.2,
      patternKey: 0.15,
      recurrenceScale: 0.03,
      suggestedAction: 0.1
    },
    maxRecurrenceBonus: 0.3
  };
}

function computeScore(text, config){
  const t = text.toLowerCase();
  // priority
  const priorityMatch = t.match(/\*\*priority\*\*:\s*(low|medium|high|critical)|priority:\s*(low|medium|high|critical)/i);
  const priority = priorityMatch ? (priorityMatch[1] || priorityMatch[2] || '').toLowerCase() : '';
  const pWeight = (config.weights.priority[priority] || 0);

  // category
  let category = '';
  const headerMatch = t.match(/^##\s*\[[A-Z0-9-]+\]\s*([a-z0-9_\-]+)/im);
  if (headerMatch) category = headerMatch[1].toLowerCase();
  else {
    const catField = t.match(/category\s*[:\-]\s*([a-z0-9_\-]+)/i);
    if (catField) category = (catField[1] || '').toLowerCase();
  }
  const categoryScore = config.allowlist.includes(category) ? config.weights.category : 0;

  // keyword presence
  const keywordHit = config.allowlist.some(a => t.includes(a));
  const keywordScore = keywordHit ? config.weights.keyword : 0;

  // pattern-key presence
  const patternKey = t.match(/pattern-key\s*[:\-]\s*([a-z0-9_\-]+)/i);
  const patternScore = patternKey ? config.weights.patternKey : 0;

  // recurrence count
  const recMatch = t.match(/recurrence-count\s*[:\-]\s*(\d+)/i);
  const recCount = recMatch ? parseInt(recMatch[1],10) : 0;
  const recBonus = Math.min(config.maxRecurrenceBonus, recCount * config.weights.recurrenceScale);

  // suggested action present
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
      // cap phraseScore reasonably
      phraseScore = Math.min(1, phraseScore);
    }
  }catch(e){ phraseScore = 0; }

  // Compose score (cap at 1)
  let score = pWeight * 0.6 + (categoryScore + keywordScore + patternScore + suggestedScore + phraseScore) * 0.4 + recBonus;
  if (score > 1) score = 1;
  return {score, priority, category, recCount, patternKey: (patternKey?patternKey[1]:null)};
}

async function main(){
  ensureDir(STAGING_DIR);
  ensureDir(REVIEW_DIR);

  if (!fs.existsSync(LEARNINGS_DIR)){
    console.log('[mindgardener] no .learnings directory found; nothing to do.');
    process.exit(0);
  }

  const files = fs.readdirSync(LEARNINGS_DIR).filter(f=>f.endsWith('.md'));
  if (files.length === 0){
    console.log('[mindgardener] no learning files to process.');
    process.exit(0);
  }

  const createdStaging = [];

  for (const f of files){
    try {
      const src = path.join(LEARNINGS_DIR, f);
      const content = fs.readFileSync(src,'utf8').trim();
      if (!content) continue;

      const ts = new Date().toISOString().replace(/[:.]/g,'');
      const slug = slugify(f.replace(/\.md$/,''));
      const stagingName = `${ts}-${slug}.md`;
      const stagingPath = path.join(STAGING_DIR, stagingName);

      const header = `---\nsource: mindgardener\noriginal: ${f}\nts: ${new Date().toISOString()}\n---\n\n`;
      fs.writeFileSync(stagingPath, header + content + '\n');

      // ── Action adapter: detect & route action intents before RAG promotion ──
      const actionResult = detectAndRouteAction(content, { source: f, stagingPath });
      if (actionResult.routed) {
        console.log(`[mindgardener] action detected (${actionResult.actionType}) — routed to review-actions/${actionResult.draftFile}, skipping RAG promote for this item.`);
        // Don't add to createdStaging so it bypasses extract-buffer injection
        continue;
      }

      createdStaging.push({stagingPath, content});
      console.log(`[mindgardener] created staging: ${stagingName}`);
    } catch (err){
      console.error(`[mindgardener] failed to stage ${f}:`, err.message);
    }
  }

  if (createdStaging.length === 0){
    console.log('[mindgardener] no staging files created.');
    process.exit(0);
  }

  const config = loadConfig();

  // Run RAG validation (best-effort)
  try {
    console.log('[mindgardener] running RAG validation...');
    const cmd = `node "${VALIDATE_SCRIPT}" --output json`;
    const out = execSync(cmd, { cwd: WORKSPACE, stdio: 'pipe', encoding: 'utf8', timeout: 120000 });
    console.log('[mindgardener] validate-rag output captured.');

    // If validation passed (exit code 0), append staged items to extract-buffer.jsonl
    for (const s of createdStaging){
      const record = {
        ts: Date.now(),
        dir: 'system',
        from: 'mindgardener',
        channel: 'mindgardener',
        conversationId: null,
        content: s.content.slice(0, 4000)
      };
      fs.appendFileSync(EXTRACT_BUFFER, JSON.stringify(record) + '\n');
    }

    // Log promotion
    const logLine = `${new Date().toISOString()} SUCCESS: promoted ${createdStaging.length} items to extract-buffer\n`;
    fs.appendFileSync(path.join(WORKSPACE,'memory','promotions.log'), logLine);
    console.log('[mindgardener] promoted staging items to extract-buffer.jsonl');
  } catch (err){
    console.error('[mindgardener] validation failed or errored:', err.message);

    // Conservative weighted scoring + allowlist auto-promote
    const promoted = [];
    const movedToReview = [];

    for (const s of createdStaging){
      try {
        const analysis = computeScore(s.content, config);
        const score = analysis.score;
        console.log(`[mindgardener] score=${score.toFixed(3)} priority=${analysis.priority} category=${analysis.category} rec=${analysis.recCount}`);

        if (score >= config.threshold){
          // additional param-pattern guard for phrase rules to avoid promoting raw log snippets
          let paramOk = true;
          try {
            if (config.requiredParamPatterns && Array.isArray(config.phraseRules)){
              // check if any phrase rule present requires params, and ensure those params exist
              for (const rule of config.phraseRules){
                const re = new RegExp(rule.pattern, 'i');
                if (re.test(s.content)){
                  const req = (config.requiredParamPatterns && config.requiredParamPatterns[rule.pattern.toLowerCase()]) || null;
                  if (req){
                    const reqRe = new RegExp(req, 'i');
                    if (!reqRe.test(s.content)) { paramOk = false; break; }
                  }
                }
              }
            }
          } catch(e){ paramOk = true; }

          if (!paramOk){
            const base = path.basename(s.stagingPath);
            const dest = path.join(REVIEW_DIR, base);
            try{ fs.renameSync(s.stagingPath, dest); } catch(e){ }
            movedToReview.push(base);
            console.log(`[mindgardener] moved to review (missing params): ${base} (score=${score.toFixed(3)})`);
            continue;
          }

          const record = {
            ts: Date.now(),
            dir: 'system',
            from: 'mindgardener',
            channel: 'mindgardener',
            conversationId: null,
            content: s.content.slice(0, 4000),
            metadata: { forced_promote: true, reason: 'scoring', score, category: analysis.category, priority: analysis.priority }
          };
          fs.appendFileSync(EXTRACT_BUFFER, JSON.stringify(record) + '\n');
          promoted.push(s.stagingPath);
          console.log(`[mindgardener] promoted by score: ${path.basename(s.stagingPath)} (score=${score.toFixed(3)})`);
        } else {
          // fallback: move to review
          const base = path.basename(s.stagingPath);
          const dest = path.join(REVIEW_DIR, base);
          try{ fs.renameSync(s.stagingPath, dest); } catch(e){ console.error('[mindgardener] move to review failed:', e.message); }
          movedToReview.push(base);
          console.log(`[mindgardener] moved to review: ${base} (score=${score.toFixed(3)})`);
        }
      } catch (inner){
        console.error('[mindgardener] scoring failed for', s.stagingPath, inner.message);
        const base = path.basename(s.stagingPath);
        const dest = path.join(REVIEW_DIR, base);
        try{ fs.renameSync(s.stagingPath, dest); } catch(e){ /* ignore */ }
        movedToReview.push(base);
      }
    }

    // Log actions
    if (promoted.length > 0){
      const logLine = `${new Date().toISOString()} PARTIAL_PROMOTE: promoted ${promoted.length} items to extract-buffer (scoring)
`;
      fs.appendFileSync(path.join(WORKSPACE,'memory','promotions.log'), logLine);
    }
    if (movedToReview.length > 0){
      const logLine = `${new Date().toISOString()} FAILURE: moved ${movedToReview.length} items to review (validation failed & below threshold)
`;
      fs.appendFileSync(path.join(WORKSPACE,'memory','promotions.log'), logLine);
    }

    process.exit(movedToReview.length > 0 ? 1 : 0);
  }
}

main().catch(err=>{ console.error('[mindgardener] fatal:', err); process.exit(1); });
