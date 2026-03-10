/**
 * learnings-store.js — ESM version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const WORKSPACE = process.env.WORKSPACE_PATH || path.join(process.env.HOME, '.openclaw', 'workspace');
const OPERATIONAL_DIR = path.join(WORKSPACE, 'memory', 'operational');
const CANDIDATES_DIR = path.join(OPERATIONAL_DIR, 'candidates');
const CONFIRMED_DIR = path.join(OPERATIONAL_DIR, 'confirmed');
const RESOLUTIONS_FILE = path.join(OPERATIONAL_DIR, 'user-resolutions.json');

let learningsCache = null;
let cacheTime = 0;
const CACHE_TTL = 10000;

function ensureDirs() {
  [OPERATIONAL_DIR, CANDIDATES_DIR, CONFIRMED_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function loadResolutions() {
  if (!fs.existsSync(RESOLUTIONS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(RESOLUTIONS_FILE, 'utf8')); } catch { return {}; }
}

function saveResolutions(resolutions) {
  fs.writeFileSync(RESOLUTIONS_FILE, JSON.stringify(resolutions, null, 2));
}

function loadYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      const parsed = yaml.load(content);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
    const lines = content.split('\n');
    const obj = { _raw: content };
    for (const line of lines) {
      const m = line.match(/^(\w[\w_-]*):\s*(.+)$/);
      if (m) obj[m[1]] = m[2].trim();
    }
    return obj;
  } catch { return null; }
}

function readLearningsFromDir(dir, status) {
  ensureDirs();
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f =>
    f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json') || f.endsWith('.md')
  );
  const resolutions = loadResolutions();
  return files.map(filename => {
    const filePath = path.join(dir, filename);
    const stat = fs.statSync(filePath);
    let data;
    if (filename.endsWith('.json')) {
      try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { data = {}; }
    } else if (filename.endsWith('.md')) {
      const content = fs.readFileSync(filePath, 'utf8');
      data = { _raw: content, problem: content.substring(0, 200) };
    } else {
      data = loadYamlFile(filePath) || {};
    }
    const id = path.basename(filename, path.extname(filename));
    const userRes = resolutions[id];
    return {
      id, status, filename, filePath,
      problem: data.problem || data.description || data.error || data.what_failed || id,
      context: data.context || data.project || data.component || '',
      agentAnalysis: data.analysis || data.agent_analysis || data.cause || data.why || '',
      agentProposedFix: data.proposed_fix || data.fix || data.resolution || '',
      tags: data.tags || data.labels || [],
      severity: data.severity || 'medium',
      timestamp: data.timestamp || data.created_at || stat.mtime.toISOString(),
      promotedTo: data.promoted_to || null,
      userResolution: userRes?.resolution || null,
      userResolutionAt: userRes?.resolvedAt || null,
      userResolutionBy: userRes?.resolvedBy || 'user',
      resolutionStatus: userRes?.status || (data.promoted_to ? 'promoted' : 'unresolved'),
      _searchText: [
        data.problem, data.description, data.error,
        data.context, data.component, data.project,
        data.analysis, data.cause,
        userRes?.resolution,
        id.replace(/-/g, ' ')
      ].filter(Boolean).join(' ').toLowerCase()
    };
  });
}

export function getAllLearnings(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && learningsCache && (now - cacheTime) < CACHE_TTL) return learningsCache;
  const candidates = readLearningsFromDir(CANDIDATES_DIR, 'candidate');
  const confirmed = readLearningsFromDir(CONFIRMED_DIR, 'confirmed');
  const rootFiles = readLearningsFromDir(OPERATIONAL_DIR, 'active');
  learningsCache = [...confirmed, ...candidates, ...rootFiles]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  cacheTime = now;
  return learningsCache;
}

export function searchLearnings(query, options = {}) {
  const all = getAllLearnings();
  const { status, resolutionStatus, limit = 50 } = options;
  let results = all;
  if (status) results = results.filter(l => l.status === status);
  if (resolutionStatus) results = results.filter(l => l.resolutionStatus === resolutionStatus);
  if (query && query.trim()) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    results = results.filter(l => {
      const score = terms.filter(t => l._searchText.includes(t)).length;
      l._score = score;
      return score > 0;
    }).sort((a, b) => (b._score || 0) - (a._score || 0));
  }
  return results.slice(0, limit);
}

export function getLearning(id) {
  return getAllLearnings(true).find(l => l.id === id) || null;
}

export function addUserResolution(id, resolution, options = {}) {
  ensureDirs();
  const resolutions = loadResolutions();
  resolutions[id] = {
    resolution: resolution.trim(),
    resolvedAt: new Date().toISOString(),
    resolvedBy: options.resolvedBy || 'user',
    status: 'resolved',
    readyToPromote: options.readyToPromote !== false
  };
  saveResolutions(resolutions);
  learningsCache = null;
  return { success: true, id, resolution: resolutions[id] };
}

export function updateResolutionStatus(id, status) {
  const resolutions = loadResolutions();
  if (!resolutions[id]) return { success: false, error: 'Resolution not found' };
  resolutions[id].status = status;
  if (status === 'promoted') resolutions[id].promotedAt = new Date().toISOString();
  saveResolutions(resolutions);
  learningsCache = null;
  return { success: true };
}

export function getStats() {
  const all = getAllLearnings();
  const resolutions = loadResolutions();
  return {
    total: all.length,
    candidates: all.filter(l => l.status === 'candidate').length,
    confirmed: all.filter(l => l.status === 'confirmed').length,
    unresolved: all.filter(l => l.resolutionStatus === 'unresolved').length,
    resolved: all.filter(l => l.resolutionStatus === 'resolved').length,
    promoted: all.filter(l => l.resolutionStatus === 'promoted' || l.promotedTo).length,
    readyToPromote: all.filter(l => {
      const res = resolutions[l.id];
      return res?.status === 'resolved' && res?.readyToPromote && !l.promotedTo;
    }).length
  };
}
