#!/usr/bin/env node

/**
 * Memory Health Report Generator
 * 
 * Provides a holistic view of the ClawText memory system:
 * - What's been added recently
 * - What's stale (needs review)
 * - What's invalid (outdated, broken)
 * - What's missing (gaps)
 * - Overall health metrics
 * 
 * Usage: clawtext memory report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
const memoryDir = path.join(workspaceRoot, 'memory');
const clustersDir = path.join(workspaceRoot, 'memory', 'clusters');
const memoryMdPath = path.join(workspaceRoot, 'MEMORY.md');

// Configuration
const STALE_THRESHOLD_DAYS = 7;
const INVALID_THRESHOLD_DAYS = 30;
const RECENT_THRESHOLD_DAYS = 3;

/**
 * Scan memory directory for daily notes
 */
function scanDailyNotes() {
  const notes = [];
  
  if (!fs.existsSync(memoryDir)) {
    return { notes, error: 'memory/ directory not found' };
  }
  
  const files = fs.readdirSync(memoryDir);
  
  for (const file of files) {
    if (!file.match(/^\d{4}-\d{2}-\d{2}\.md$/)) continue;
    
    const filePath = path.join(memoryDir, file);
    const stat = fs.statSync(filePath);
    const date = file.replace('.md', '');
    const daysOld = Math.floor((Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24));
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    
    // Extract metadata from YAML frontmatter if present
    const frontmatterMatch = content.match(/---\n([\s\S]*?)\n---/);
    const metadata = {};
    if (frontmatterMatch) {
      const yaml = frontmatterMatch[1];
      const lines = yaml.split('\n');
      for (const line of lines) {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) metadata[key] = value;
      }
    }
    
    notes.push({
      date,
      filePath,
      daysOld,
      lineCount,
      wordCount: content.split(/\s+/).length,
      createdAt: stat.mtime,
      metadata,
      status: daysOld <= RECENT_THRESHOLD_DAYS ? 'recent' 
            : daysOld <= STALE_THRESHOLD_DAYS ? 'stale' 
            : daysOld <= INVALID_THRESHOLD_DAYS ? 'needs-review' 
            : 'stale'
    });
  }
  
  return { notes: notes.sort((a, b) => b.date.localeCompare(a.date)) };
}

/**
 * Scan MEMORY.md for curated entries
 */
function scanMemoryMd() {
  if (!fs.existsSync(memoryMdPath)) {
    return { entries: [], error: 'MEMORY.md not found' };
  }
  
  const content = fs.readFileSync(memoryMdPath, 'utf8');
  const lines = content.split('\n');
  
  const entries = [];
  let currentEntry = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect entry headers (## or ###)
    const headerMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (headerMatch) {
      if (currentEntry) {
        currentEntry.lineCount = i - currentEntry.startLine;
        entries.push(currentEntry);
      }
      currentEntry = {
        title: headerMatch[1].trim(),
        startLine: i,
        content: [line],
        lineCount: 0
      };
    } else if (currentEntry) {
      currentEntry.content.push(line);
    }
  }
  
  if (currentEntry) {
    currentEntry.lineCount = lines.length - currentEntry.startLine;
    entries.push(currentEntry);
  }
  
  return { entries };
}

/**
 * Scan clusters for health
 */
function scanClusters() {
  const clusters = [];
  
  if (!fs.existsSync(clustersDir)) {
    return { clusters, error: 'clusters/ directory not found' };
  }
  
  const files = fs.readdirSync(clustersDir);
  
  for (const file of files) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
    
    const filePath = path.join(clustersDir, file);
    const stat = fs.statSync(filePath);
    const daysOld = Math.floor((Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24));
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    
    // Count entries in YAML
    const entryCount = (content.match(/^- /g) || []).length;
    
    clusters.push({
      name: file,
      filePath,
      daysOld,
      lineCount,
      entryCount,
      status: daysOld <= 7 ? 'fresh' : daysOld <= 14 ? 'needs-refresh' : 'stale'
    });
  }
  
  return { clusters };
}

/**
 * Detect gaps and issues
 */
function detectGaps(notes, memoryEntries, clusters) {
  const gaps = [];
  
  // Check for stale daily notes
  const staleNotes = notes.filter(n => n.status === 'stale' || n.status === 'needs-review');
  if (staleNotes.length > 0) {
    gaps.push({
      type: 'stale-notes',
      severity: 'medium',
      message: `${staleNotes.length} daily note(s) older than ${STALE_THRESHOLD_DAYS} days`,
      details: staleNotes.map(n => `${n.date} (${n.daysOld} days, ${n.lineCount} lines)`),
      action: 'Review and promote to MEMORY.md or archive'
    });
  }
  
  // Check for missing recent dates
  const today = new Date().toISOString().split('T')[0];
  const recentDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    recentDates.push(d.toISOString().split('T')[0]);
  }
  
  const existingDates = notes.map(n => n.date);
  const missingDates = recentDates.filter(d => !existingDates.includes(d));
  
  if (missingDates.length > 0) {
    gaps.push({
      type: 'missing-dates',
      severity: 'low',
      message: `No daily notes for: ${missingDates.join(', ')}`,
      details: 'Days without captured memories',
      action: 'Normal if no activity; otherwise check extraction cron'
    });
  }
  
  // Check for outdated paths in MEMORY.md
  const memoryContent = fs.readFileSync(memoryMdPath, 'utf8');
  const outdatedPaths = [
    { pattern: /~\/workspace\/skills\//, replacement: '~/.openclaw/workspace/skills/' },
    { pattern: /~\/workspace\/memory\//, replacement: '~/.openclaw/workspace/memory/' }
  ];
  
  for (const { pattern, replacement } of outdatedPaths) {
    if (pattern.test(memoryContent)) {
      gaps.push({
        type: 'outdated-paths',
        severity: 'medium',
        message: 'MEMORY.md contains outdated workspace paths',
        details: `Found: ${pattern.toString()}, Should be: ${replacement}`,
        action: 'Run path update script or manual find/replace'
      });
    }
  }
  
  // Check for stale clusters
  const staleClusters = clusters.filter(c => c.status === 'stale');
  if (staleClusters.length > 0) {
    gaps.push({
      type: 'stale-clusters',
      severity: 'high',
      message: `${staleClusters.length} cluster(s) older than 14 days`,
      details: staleClusters.map(c => `${c.name} (${c.daysOld} days)`),
      action: 'Run cluster rebuild: clawtext clusters rebuild'
    });
  }
  
  // Check for reference material in MEMORY.md
  if (memoryContent.includes('Source:') && memoryContent.includes('OWASP')) {
    gaps.push({
      type: 'reference-in-curation',
      severity: 'low',
      message: 'MEMORY.md contains reference material (not curated insights)',
      details: 'Found external research/documentation',
      action: 'Move to memory/ directory, keep pointer in MEMORY.md'
    });
  }
  
  return gaps;
}

/**
 * Generate health metrics
 */
function calculateMetrics(notes, memoryEntries, clusters, gaps) {
  const totalMemories = notes.reduce((sum, n) => sum + n.wordCount, 0);
  const totalLines = notes.reduce((sum, n) => sum + n.lineCount, 0);
  
  const recentNotes = notes.filter(n => n.status === 'recent').length;
  const staleNotes = notes.filter(n => n.status === 'stale' || n.status === 'needs-review').length;
  
  const criticalGaps = gaps.filter(g => g.severity === 'high').length;
  const mediumGaps = gaps.filter(g => g.severity === 'medium').length;
  
  // Calculate overall health score (0-100)
  let score = 100;
  score -= criticalGaps * 20;
  score -= mediumGaps * 10;
  score -= staleNotes * 2;
  score = Math.max(0, score);
  
  return {
    totalMemories,
    totalLines,
    totalNotes: notes.length,
    recentNotes,
    staleNotes,
    totalClusters: clusters.length,
    totalEntries: memoryEntries.length,
    criticalGaps,
    mediumGaps,
    healthScore: score,
    healthGrade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
  };
}

/**
 * Generate report
 */
function generateReport() {
  const { notes, error: notesError } = scanDailyNotes();
  const { entries: memoryEntries, error: memoryError } = scanMemoryMd();
  const { clusters, error: clustersError } = scanClusters();
  
  if (notesError) {
    console.error(`Error: ${notesError}`);
    process.exit(1);
  }
  
  const gaps = detectGaps(notes, memoryEntries, clusters);
  const metrics = calculateMetrics(notes, memoryEntries, clusters, gaps);
  
  // Build report
  const report = [];
  
  report.push('='.repeat(80));
  report.push('MEMORY SYSTEM HEALTH REPORT');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('='.repeat(80));
  report.push('');
  
  // Health Score
  report.push('📊 OVERALL HEALTH');
  report.push('-'.repeat(40));
  report.push(`Score: ${metrics.healthScore}/100 (Grade: ${metrics.healthGrade})`);
  report.push('');
  
  // Metrics
  report.push('📈 METRICS');
  report.push('-'.repeat(40));
  report.push(`Total Memories: ${metrics.totalMemories.toLocaleString()} words`);
  report.push(`Total Lines: ${metrics.totalLines.toLocaleString()}`);
  report.push(`Daily Notes: ${metrics.totalNotes} (${metrics.recentNotes} recent, ${metrics.staleNotes} stale)`);
  report.push(`Clusters: ${metrics.totalClusters}`);
  report.push(`MEMORY.md Entries: ${metrics.totalEntries}`);
  report.push('');
  
  // Gaps by Severity
  const critical = gaps.filter(g => g.severity === 'high');
  const medium = gaps.filter(g => g.severity === 'medium');
  const low = gaps.filter(g => g.severity === 'low');
  
  if (critical.length > 0) {
    report.push('🔴 CRITICAL ISSUES');
    report.push('-'.repeat(40));
    for (const gap of critical) {
      report.push(`⚠️  ${gap.message}`);
      report.push(`   Action: ${gap.action}`);
      report.push('');
    }
  }
  
  if (medium.length > 0) {
    report.push('🟡 MEDIUM PRIORITY');
    report.push('-'.repeat(40));
    for (const gap of medium) {
      report.push(`⚡ ${gap.message}`);
      report.push(`   Action: ${gap.action}`);
      report.push('');
    }
  }
  
  if (low.length > 0) {
    report.push('🟢 LOW PRIORITY');
    report.push('-'.repeat(40));
    for (const gap of low) {
      report.push(`ℹ️  ${gap.message}`);
      report.push(`   Details: ${gap.details}`);
      report.push('');
    }
  }
  
  // Recent Activity
  report.push('📝 RECENT DAILY NOTES');
  report.push('-'.repeat(40));
  const recent = notes.slice(0, 5);
  if (recent.length === 0) {
    report.push('No recent notes found');
  } else {
    for (const note of recent) {
      report.push(`• ${note.date}: ${note.lineCount} lines, ${note.wordCount} words`);
    }
  }
  report.push('');
  
  // Cluster Status
  report.push('🗂️  CLUSTER STATUS');
  report.push('-'.repeat(40));
  for (const cluster of clusters) {
    const icon = cluster.status === 'fresh' ? '✅' : cluster.status === 'needs-refresh' ? '⚠️' : '🔴';
    report.push(`${icon} ${cluster.name}: ${cluster.entryCount} entries (${cluster.daysOld} days old)`);
  }
  report.push('');
  
  // Recommendations
  report.push('🎯 RECOMMENDED ACTIONS');
  report.push('-'.repeat(40));
  const actions = [];
  
  if (critical.length > 0) {
    actions.push('1. Address critical issues immediately');
  }
  
  const staleNoteCount = notes.filter(n => n.status === 'stale' || n.status === 'needs-review').length;
  if (staleNoteCount > 0) {
    actions.push(`${critical.length > 0 ? '2' : '1'}. Review ${staleNoteCount} stale note(s) for promotion to MEMORY.md`);
  }
  
  if (clusters.filter(c => c.status === 'stale').length > 0) {
    actions.push(`${actions.length + 1}. Rebuild clusters: clawtext clusters rebuild`);
  }
  
  if (medium.some(g => g.type === 'outdated-paths')) {
    actions.push(`${actions.length + 1}. Update workspace paths in MEMORY.md`);
  }
  
  if (actions.length === 0) {
    actions.push('✅ System is healthy. No immediate actions required.');
  }
  
  for (const action of actions) {
    report.push(action);
  }
  
  report.push('');
  report.push('='.repeat(80));
  report.push('END OF REPORT');
  report.push('='.repeat(80));
  
  return report.join('\n');
}

// CLI entry point
const args = process.argv.slice(2);
if (args.includes('--json')) {
  // Output as JSON for programmatic use
  const { notes, error: notesError } = scanDailyNotes();
  const { entries: memoryEntries } = scanMemoryMd();
  const { clusters } = scanClusters();
  const gaps = detectGaps(notes, memoryEntries, clusters);
  const metrics = calculateMetrics(notes, memoryEntries, clusters, gaps);
  
  console.log(JSON.stringify({ metrics, gaps, notes: notes.length, clusters: clusters.length }, null, 2));
} else {
  // Human-readable report
  const report = generateReport();
  console.log(report);
}
