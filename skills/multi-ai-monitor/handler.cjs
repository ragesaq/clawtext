#!/usr/bin/env node
/**
 * Multi-AI Usage Monitor - Comprehensive Tracking
 * Tracks GitHub Copilot + OpenAI Codex + OpenRouter
 * Analyzes usage patterns, costs, and model preferences
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  usageLog: path.join(process.env.HOME, '.openclaw/workspace/memory/multi-ai-usage-log.jsonl'),
  analysisLog: path.join(process.env.HOME, '.openclaw/workspace/memory/ai-usage-analysis.md'),
  dmChannel: '1474997928056590339'
};

function parseUsageLine(line, serviceName) {
  if (serviceName === 'github-copilot') {
    const match = line.match(/Premium\s+(\d+)%\s+left/);
    return match ? parseInt(match[1]) : null;
  }
  
  if (serviceName === 'openai-codex') {
    const match = line.match(/(\d+)h\s+(\d+)%\s+left.*?Week\s+(\d+)%\s+left/);
    return match ? { hourly: parseInt(match[2]), weekly: parseInt(match[3]) } : null;
  }
  
  if (serviceName === 'openrouter') {
    // OpenRouter typically shows usage differently
    return null;
  }
  
  return null;
}

function getUsageData() {
  try {
    const output = execSync('openclaw models status 2>&1', { encoding: 'utf8' });
    const lines = output.split('\n');
    
    const data = {
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      githubCopilot: null,
      openaiCodex: null,
      openrouter: null
    };
    
    for (const line of lines) {
      if (line.includes('github-copilot usage:')) {
        data.githubCopilot = parseUsageLine(line, 'github-copilot');
      }
      if (line.includes('openai-codex usage:')) {
        data.openaiCodex = parseUsageLine(line, 'openai-codex');
      }
      if (line.includes('openrouter')) {
        data.openrouter = 'active'; // No specific usage data available
      }
    }
    
    return data;
  } catch (err) {
    console.log('❌ Failed to fetch usage:', err.message);
    return null;
  }
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

function saveUsage(data) {
  const logDir = path.dirname(CONFIG.usageLog);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  
  fs.appendFileSync(CONFIG.usageLog, JSON.stringify(data) + '\n');
  
  // Keep last 90 days for better trend analysis
  const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
  const lines = fs.readFileSync(CONFIG.usageLog, 'utf8').trim().split('\n');
  const filtered = lines.filter(l => {
    try { return JSON.parse(l).timestamp > cutoff; } catch { return true; }
  });
  fs.writeFileSync(CONFIG.usageLog, filtered.join('\n') + '\n');
}

function calculateTrends(history) {
  if (history.length < 2) return null;
  
  const now = Date.now();
  const dayAgo = now - (24 * 60 * 60 * 1000);
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const recent24h = history.filter(h => h.timestamp > dayAgo);
  const recent7d = history.filter(h => h.timestamp > weekAgo);
  
  const trends = {
    githubCopilot: null,
    openaiCodex: null
  };
  
  // GitHub Copilot trend (24h)
  if (recent24h.length >= 2 && recent24h[0].githubCopilot !== null && recent24h[recent24h.length - 1].githubCopilot !== null) {
    const first = recent24h[0];
    const last = recent24h[recent24h.length - 1];
    const hoursElapsed = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
    
    if (hoursElapsed >= 1) {
      const change = last.githubCopilot - first.githubCopilot;
      const rate = change / hoursElapsed;
      const hoursToZero = last.githubCopilot / Math.max(0.1, Math.abs(rate));
      
      trends.githubCopilot = {
        rate: rate.toFixed(2),
        hoursToZero: hoursToZero.toFixed(1),
        dailyProjection: (rate * 24).toFixed(1),
        dataPoints: recent24h.length
      };
    }
  }
  
  // OpenAI Codex trend (7d for weekly)
  if (recent7d.length >= 2 && recent7d[0].openaiCodex?.weekly !== null && recent7d[recent7d.length - 1].openaiCodex?.weekly !== null) {
    const first = recent7d[0];
    const last = recent7d[recent7d.length - 1];
    const hoursElapsed = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
    
    if (hoursElapsed >= 1) {
      const change = last.openaiCodex.weekly - first.openaiCodex.weekly;
      const rate = change / hoursElapsed;
      const hoursToZero = last.openaiCodex.weekly / Math.max(0.1, Math.abs(rate));
      const daysToZero = hoursToZero / 24;
      
      trends.openaiCodex = {
        weeklyRate: rate.toFixed(2),
        weeklyHoursToZero: hoursToZero.toFixed(1),
        weeklyDaysToZero: daysToZero.toFixed(1),
        dailyProjection: (rate * 24).toFixed(1),
        dataPoints: recent7d.length
      };
    }
  }
  
  return trends;
}

function generateAnalysis(data, trends, history) {
  const lines = [
    `# AI Usage Analysis Report`,
    `Generated: ${new Date(data.timestamp).toISOString()}`,
    ``,
    `## Current Usage Status`,
    ``,
    `### GitHub Copilot ($39/mo)`,
    `-${data.githubCopilot !== null ? ` ${data.githubCopilot}% remaining` : ' No data'}`,
    `-${data.githubCopilot !== null && data.githubCopilot < 10 ? ' 🚨 CRITICAL - Nearly Full!' : ''}`,
    `-${data.githubCopilot !== null && data.githubCopilot < 30 ? ' ⚠️ WARNING - Low Capacity' : ''}`,
    ``,
    `### OpenAI Codex ($20/mo)`,
    `-${data.openaiCodex ? ` ${data.openaiCodex.hourly}% hourly remaining` : ' No hourly data'}`,
    `-${data.openaiCodex ? ` ${data.openaiCodex.weekly}% weekly remaining` : ' No weekly data'}`,
    `-${data.openaiCodex?.hourly < 30 ? ' 🚨 CRITICAL - Hourly Nearly Full!' : ''}`,
    `-${data.openaiCodex?.weekly < 30 ? ' 🚨 CRITICAL - Weekly Nearly Full!' : ''}`,
    ``,
    `### OpenRouter`,
    `- Active (usage tracking not available via API)`,
    `- Models: Qwen 3.5 120B (backup), Embeddings (primary)`,
    ``,
    `## Usage Trends`,
    ``,
    `### GitHub Copilot (24h trend)`,
    `${trends?.githubCopilot ? `- Rate: ${trends.githubCopilot.rate}%/hour` : '- Insufficient data'}`,
    `${trends?.githubCopilot ? `- Hours to limit: ${trends.githubCopilot.hoursToZero}h` : ''}`,
    `${trends?.githubCopilot ? `- Daily projection: ${trends.githubCopilot.dailyProjection}% used/day` : ''}`,
    `${trends?.githubCopilot ? `- Data points: ${trends.githubCopilot.dataPoints}` : ''}`,
    ``,
    `### OpenAI Codex (7d trend)`,
    `${trends?.openaiCodex ? `- Weekly rate: ${trends.openaiCodex.weeklyRate}%/hour` : '- Insufficient data'}`,
    `${trends?.openaiCodex ? `- Days to weekly limit: ${trends.openaiCodex.weeklyDaysToZero}d` : ''}`,
    `${trends?.openaiCodex ? `- Daily projection: ${trends.openaiCodex.dailyProjection}% used/day` : ''}`,
    `${trends?.openaiCodex ? `- Data points: ${trends.openaiCodex.dataPoints}` : ''}`,
    ``,
    `## Cost/Benefit Analysis`,
    ``,
    `| Service | Cost/Mo | Est. Hours/Mo | Cost/Hour |`,
    `|---------|---------|---------------|-----------|`,
    `| GitHub Copilot | $39 | ~93 | $0.42 |`,
    `| OpenAI Codex | $20 | ~30 | $0.67 |`,
    `| OpenRouter | Variable | - | Variable |`,
    `| **Total** | **$59+** | - | - |`,
    ``,
    `## Model Preferences (User Notes)`,
    ``,
    `### GitHub Copilot Strengths`,
    `- GPT-5-mini (free with subscription)`,
    `- Haiku 4.5 (preferred language abilities)`,
    `- Sonnet 4.6 (better than GPT-4/5.3-Codex sometimes)`,
    `- Slow at times`,
    ``,
    `### OpenAI Codex Strengths`,
    `- Usually fast`,
    `- GPT-5.4 (powerful generalist)`,
    `- GPT-5.3-Codex (excellent for technical coding)`,
    ``,
    `### OpenRouter Strengths`,
    `- Dirt cheap for embeddings`,
    `- Qwen 3.5 120B (backup model)`,
    ``,
    `## Recommendations`,
    ``,
    `${data.githubCopilot !== null && data.githubCopilot < 10 ? `
    ### 🚨 IMMEDIATE ACTION: GitHub Copilot Critical
    - Copilot at ${data.githubCopilot}% remaining
    - Options:
      1. Shift some tasks to Codex (you have capacity)
      2. Use gpt-5-mini for simple tasks
      3. Add 2nd Copilot account ($39/mo)
      4. Wait for reset (if weekly)
    ` : ''}`,
    `
    ### Usage Pattern Analysis
    - You hit Codex weekly limit in 1 day of heavy use
    - This suggests **heavy daily usage** (15+ hours/day potential)
    - At this rate, **Pro Codex ($200/mo) might be worth it**
    - But first, track for 7 days to confirm pattern
    `,
    `
    ### Cost Optimization Strategy
    1. **Track for 7 days** before making upgrade decisions
    2. **Shift simple tasks** to gpt-5-mini or Haiku 4.5
    3. **Use Codex for heavy coding** (faster, better for technical)
    4. **Use Copilot for general tasks** (more model options)
    5. **Use OpenRouter for embeddings** (already doing this ✅)
    `,
    `
    ## Data Collection Status
    - History: ${history.length} data points
    - Tracking started: ${history.length > 0 ? new Date(history[0].timestamp).toISOString().split('T')[0] : 'Just now'}
    - Recommended tracking period: 7-14 days for reliable trends
    `
  ];
  
  return lines.join('\n');
}

function saveAnalysis(analysis) {
  fs.writeFileSync(CONFIG.analysisLog, analysis);
}

function main() {
  console.log('🔍 Multi-AI Usage Monitor - Comprehensive Tracking');
  console.log('   Tracking GitHub Copilot + OpenAI Codex + OpenRouter\n');
  
  const data = getUsageData();
  
  if (!data) {
    console.log('❌ Could not fetch usage data');
    return;
  }
  
  saveUsage(data);
  
  const history = loadHistory();
  const trends = calculateTrends(history);
  
  const analysis = generateAnalysis(data, trends, history);
  saveAnalysis(analysis);
  
  // Console output
  console.log('📊 Current Status:');
  console.log(`   GitHub Copilot: ${data.githubCopilot !== null ? `${data.githubCopilot}% left` : 'No data'} ${data.githubCopilot !== null && data.githubCopilot < 10 ? '🚨' : ''}`);
  console.log(`   OpenAI Codex: ${data.openaiCodex ? `${data.openaiCodex.hourly}% hourly / ${data.openaiCodex.weekly}% weekly` : 'No data'} ${data.openaiCodex?.hourly < 30 ? '🚨' : ''}`);
  console.log(`   OpenRouter: Active`);
  
  console.log('\n📈 Trends:');
  if (trends?.githubCopilot) {
    console.log(`   Copilot: ${trends.githubCopilot.dailyProjection}%/day → ${trends.githubCopilot.hoursToZero}h to limit`);
  }
  if (trends?.openaiCodex) {
    console.log(`   Codex: ${trends.openaiCodex.dailyProjection}%/day → ${trends.openaiCodex.weeklyDaysToZero}d to weekly limit`);
  }
  
  console.log('\n💾 Analysis saved to: memory/ai-usage-analysis.md');
  console.log(`   History: ${history.length} data points`);
  
  // Alert if critical
  if (data.githubCopilot !== null && data.githubCopilot < 10) {
    console.log('\n🚨 GitHub Copilot CRITICAL - nearly full!');
  }
  
  if (data.openaiCodex?.hourly !== null && data.openaiCodex.hourly < 30) {
    console.log('🚨 OpenAI Codex CRITICAL - hourly limit nearly full!');
  }
  
  if (data.openaiCodex?.weekly !== null && data.openaiCodex.weekly < 30) {
    console.log('🚨 OpenAI Codex CRITICAL - weekly limit nearly full!');
  }
}

main();
