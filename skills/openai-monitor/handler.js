#!/usr/bin/env node
/**
 * OpenAI Codex Usage Monitor - Using OpenClaw's built-in usage tracking
 * Now with utilization projections and trend analysis
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG = {
  usageLog: path.join(process.env.HOME, '.openclaw/workspace/memory/openai-usage-log.jsonl'),
  dmChannel: '1474997928056590339', // #general channel
  alertThresholds: {
    hourlyWarning: 70,
    hourlyCritical: 90,
    weeklyWarning: 70,
    weeklyCritical: 90
  }
};

function parseUsageOutput(output) {
  // Parse: "5h 72% left ⏱2h 39m · Week 62% left ⏱6d 11h"
  const match = output.match(/(\d+)h\s+(\d+)%\s+left.*?Week\s+(\d+)%\s+left/);
  if (!match) return null;

  return {
    hourlyUsedPercent: parseInt(match[2]),
    weeklyUsedPercent: parseInt(match[3]),
    hourlyRemaining: match[1] + 'h',
    raw: output
  };
}

function getUsageData() {
  try {
    const output = execSync('openclaw models status 2>&1', { encoding: 'utf8' });
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('openai-codex usage:')) {
        const usageStr = line.replace('openai-codex usage:', '').trim();
        return parseUsageOutput(usageStr);
      }
    }
  } catch (err) {
    console.log('❌ Failed to run openclaw models status:', err.message);
  }
  
  return null;
}

function loadHistory() {
  try {
    if (!fs.existsSync(CONFIG.usageLog)) return [];
    const lines = fs.readFileSync(CONFIG.usageLog, 'utf8').trim().split('\n');
    return lines.map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function saveUsage(usage) {
  const entry = {
    ts: Date.now(),
    hourlyUsed: usage.hourlyUsedPercent,
    weeklyUsed: usage.weeklyUsedPercent
  };
  
  const logDir = path.dirname(CONFIG.usageLog);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  
  fs.appendFileSync(CONFIG.usageLog, JSON.stringify(entry) + '\n');
  
  // Keep only last 30 days
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const lines = fs.readFileSync(CONFIG.usageLog, 'utf8').trim().split('\n');
  const filtered = lines.filter(l => {
    try { return JSON.parse(l).ts > cutoff; } catch { return true; }
  });
  fs.writeFileSync(CONFIG.usageLog, filtered.join('\n') + '\n');
}

function calculateProjections(usage, history) {
  if (history.length < 2) return null;
  
  // Calculate hourly consumption rate
  const now = Date.now();
  const recent = history.filter(h => now - h.ts < 24 * 60 * 60 * 1000); // Last 24h
  
  if (recent.length < 2) return null;
  
  const first = recent[0];
  const last = recent[recent.length - 1];
  const hoursElapsed = (last.ts - first.ts) / (1000 * 60 * 60);
  
  if (hoursElapsed < 1) return null;
  
  const hourlyRate = (last.hourlyUsed - first.hourlyUsed) / hoursElapsed;
  const weeklyRate = (last.weeklyUsed - first.weeklyUsed) / hoursElapsed;
  
  // Project when we'll hit limits
  const hoursToHourlyLimit = (100 - usage.hourlyUsedPercent) / Math.max(0.1, hourlyRate);
  const hoursToWeeklyLimit = (100 - usage.weeklyUsedPercent) / Math.max(0.1, weeklyRate);
  
  return {
    hourlyRate: hourlyRate.toFixed(2),
    weeklyRate: weeklyRate.toFixed(2),
    hoursToHourlyLimit: hoursToHourlyLimit.toFixed(1),
    hoursToWeeklyLimit: hoursToWeeklyLimit.toFixed(1),
    dailyProjection: (hourlyRate * 24).toFixed(1),
    weeklyProjection: (weeklyRate * 168).toFixed(1)
  };
}

function formatProjection(proj) {
  if (!proj) return 'Insufficient data for projections';
  
  const lines = [
    `📈 Consumption Rate: ${proj.hourlyRate}%/hour (hourly), ${proj.weeklyRate}%/hour (weekly)`,
    `📊 Daily Projection: ${proj.dailyProjection}% used/day`,
    `⏰ Hours to Hourly Limit: ${proj.hoursToHourlyLimit}h`,
    `⏰ Hours to Weekly Limit: ${proj.hoursToWeeklyLimit}h`
  ];
  
  // Add warnings if projections are concerning
  if (parseFloat(proj.hoursToHourlyLimit) < 2) {
    lines.push('🚨 WARNING: Hourly limit in <2 hours at current rate!');
  }
  if (parseFloat(proj.hoursToWeeklyLimit) < 24) {
    lines.push('⚠️ WARNING: Weekly limit in <24h at current rate!');
  }
  
  return lines.join('\n');
}

function main() {
  console.log('🔍 OpenAI Codex Usage Monitor (via OpenClaw)');
  console.log('   With utilization projections\n');
  
  const usage = getUsageData();
  
  if (!usage) {
    console.log('❌ Could not fetch usage data');
    return;
  }
  
  console.log(`📊 Current Usage:`);
  console.log(`   Hourly: ${usage.hourlyUsedPercent}% used (${usage.hourlyRemaining} remaining)`);
  console.log(`   Weekly: ${usage.weeklyUsedPercent}% used`);
  
  // Save to history
  saveUsage(usage);
  
  // Calculate projections
  const history = loadHistory();
  const projections = calculateProjections(usage, history);
  
  if (projections) {
    console.log(`\n${formatProjection(projections)}`);
  } else {
    console.log('\n📈 Building usage history for projections...');
    console.log(`   (${history.length} data points collected)`);
  }
  
  // Check alerts
  const alerts = [];
  
  if (usage.hourlyUsedPercent >= CONFIG.alertThresholds.hourlyCritical) {
    alerts.push(`🚨 CRITICAL: Hourly quota at ${usage.hourlyUsedPercent}%`);
  } else if (usage.hourlyUsedPercent >= CONFIG.alertThresholds.hourlyWarning) {
    alerts.push(`⚠️ WARNING: Hourly quota at ${usage.hourlyUsedPercent}%`);
  }
  
  if (usage.weeklyUsedPercent >= CONFIG.alertThresholds.weeklyCritical) {
    alerts.push(`🚨 CRITICAL: Weekly quota at ${usage.weeklyUsedPercent}%`);
  } else if (usage.weeklyUsedPercent >= CONFIG.alertThresholds.weeklyWarning) {
    alerts.push(`⚠️ WARNING: Weekly quota at ${usage.weeklyUsedPercent}%`);
  }
  
  if (alerts.length > 0) {
    console.log('\n🚨 ALERTS:');
    alerts.forEach(a => console.log(`  ${a}`));
    
    // Send Discord alert
    const alertMessage = `🚨 **OpenAI Codex Quota Alert**\n\n${alerts.join('\n')}\n\nHourly: ${usage.hourlyUsedPercent}% used\nWeekly: ${usage.weeklyUsedPercent}% used\n\n${projections ? formatProjection(projections) : ''}`;
    
    console.log('\n📬 Sending Discord alert...');
  } else {
    console.log('\n✅ All quotas healthy');
  }
}

main();
