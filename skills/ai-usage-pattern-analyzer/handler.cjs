#!/usr/bin/env node
/**
 * AI Usage Pattern Analyzer
 * Integrates with codex-profiler + OpenClaw status
 * Builds predictive models for quota needs
 * Calculates optimal subscription mix
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  usageLog: path.join(process.env.HOME, '.openclaw/workspace/memory/ai-usage-patterns.jsonl'),
  analysisLog: path.join(process.env.HOME, '.openclaw/workspace/memory/ai-usage-report.md'),
  dmChannel: '1474997928056590339'
};

function getOpenClawUsage() {
  try {
    const output = execSync('openclaw models status 2>&1', { encoding: 'utf8' });
    const data = { timestamp: Date.now(), githubCopilot: null, openaiCodex: null };

    const copilotMatch = output.match(/github-copilot usage:\s+Premium\s+(\d+)%\s+left/i);
    if (copilotMatch) {
      data.githubCopilot = parseInt(copilotMatch[1], 10);
    }

    const codexMatch = output.match(/openai-codex usage:\s+(\d+)h\s+(\d+)%\s+left.*?Week\s+(\d+)%\s+left/is);
    if (codexMatch) {
      data.openaiCodex = {
        hourly: parseInt(codexMatch[2], 10),
        weekly: parseInt(codexMatch[3], 10),
        hourlyRemaining: codexMatch[1] + 'h'
      };
    }

    return data;
  } catch (err) {
    return null;
  }
}

function getCodexProfilerUsage() {
  try {
    const output = execSync('python3 ~/.openclaw/workspace/skills/codex-profiler/scripts/codex_usage.py --profile default 2>&1', { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (err) {
    return null;
  }
}

function getOpenRouterUsage(period = 'today') {
  try {
    const flag = period === 'week' ? '--week' : period === 'month' ? '--month' : '--today';
    const output = execSync(`python3 ~/.openclaw/workspace/skills/openrouter-usage-info/scripts/openrouter_usage.py report ${flag} --format json 2>&1`, { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (err) {
    return null;
  }
}

function summarizeOpenRouter(report) {
  if (!report || !report.sessions) return null;
  const entries = Object.entries(report.sessions);
  if (entries.length === 0) {
    return {
      period: report.period || 'today',
      totalCost: 0,
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      modelCount: 0,
      topModel: null,
      creditRemaining: report.credits && typeof report.credits.remaining === 'number' ? report.credits.remaining : null,
      creditsError: report.credits && report.credits.error ? report.credits.error : null
    };
  }

  const sorted = entries.sort((a, b) => (b[1].cost || 0) - (a[1].cost || 0));
  const totalCost = sorted.reduce((sum, [, s]) => sum + (s.cost || 0), 0);
  const totalRequests = sorted.reduce((sum, [, s]) => sum + (s.requests || 0), 0);
  const totalInputTokens = sorted.reduce((sum, [, s]) => sum + (s.input_tokens || 0), 0);
  const totalOutputTokens = sorted.reduce((sum, [, s]) => sum + (s.output_tokens || 0), 0);
  const [topModelName, topModelStats] = sorted[0];

  return {
    period: report.period || 'today',
    totalCost,
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    modelCount: sorted.length,
    topModel: {
      name: topModelName,
      cost: topModelStats.cost || 0,
      share: totalCost > 0 ? ((topModelStats.cost || 0) / totalCost) * 100 : 0,
      requests: topModelStats.requests || 0
    },
    models: sorted.map(([name, stats]) => ({
      name,
      cost: stats.cost || 0,
      requests: stats.requests || 0,
      inputTokens: stats.input_tokens || 0,
      outputTokens: stats.output_tokens || 0,
      daysActive: stats.days_active || 0
    })),
    creditRemaining: report.credits && typeof report.credits.remaining === 'number' ? report.credits.remaining : null,
    creditsError: report.credits && report.credits.error ? report.credits.error : null
  };
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

function saveData(data) {
  const logDir = path.dirname(CONFIG.usageLog);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  
  fs.appendFileSync(CONFIG.usageLog, JSON.stringify(data) + '\n');
  
  // Keep 90 days
  const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
  const lines = fs.readFileSync(CONFIG.usageLog, 'utf8').trim().split('\n');
  const filtered = lines.filter(l => {
    try { return JSON.parse(l).timestamp > cutoff; } catch { return true; }
  });
  fs.writeFileSync(CONFIG.usageLog, filtered.join('\n') + '\n');
}

function analyzePatterns(history) {
  if (history.length < 3) return null;
  
  const now = Date.now();
  const dayAgo = now - (24 * 60 * 60 * 1000);
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const daily = history.filter(h => h.timestamp > dayAgo);
  const weekly = history.filter(h => h.timestamp > weekAgo);
  
  const patterns = {
    githubCopilot: null,
    openaiCodex: null,
    openrouter: null,
    recommendations: []
  };
  
  // GitHub Copilot analysis
  if (daily.length >= 2 && daily[0].githubCopilot !== null && daily[daily.length - 1].githubCopilot !== null) {
    const first = daily[0];
    const last = daily[daily.length - 1];
    const hours = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
    
    if (hours >= 1) {
      const change = first.githubCopilot - last.githubCopilot; // Positive = usage
      const ratePerHour = change / hours;
      const dailyUsage = ratePerHour * 24;
      const hoursToEmpty = last.githubCopilot / Math.max(0.1, ratePerHour);
      
      patterns.githubCopilot = {
        currentRemaining: last.githubCopilot,
        ratePerHour: ratePerHour.toFixed(2),
        dailyUsage: dailyUsage.toFixed(1),
        hoursToEmpty: hoursToEmpty.toFixed(1),
        dataPoints: daily.length
      };
      
      if (last.githubCopilot < 10) {
        patterns.recommendations.push({
          priority: 'CRITICAL',
          service: 'GitHub Copilot',
          message: `Only ${last.githubCopilot}% remaining. Will be empty in ~${hoursToEmpty.toFixed(0)} hours at current rate.`,
          actions: [
            'Shift non-critical tasks to Codex or gpt-5-mini',
            'Consider adding 2nd Copilot account ($39/mo)',
            'Wait for reset if weekly cycle'
          ]
        });
      }
    }
  }
  
  // OpenAI Codex analysis
  if (weekly.length >= 2 && weekly[0].openaiCodex?.weekly !== null && weekly[weekly.length - 1].openaiCodex?.weekly !== null) {
    const first = weekly[0];
    const last = weekly[weekly.length - 1];
    const hours = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
    
    if (hours >= 1) {
      const change = first.openaiCodex.weekly - last.openaiCodex.weekly;
      const ratePerHour = change / hours;
      const dailyUsage = ratePerHour * 24;
      const hoursToEmpty = last.openaiCodex.weekly / Math.max(0.1, ratePerHour);
      const daysToEmpty = hoursToEmpty / 24;
      
      patterns.openaiCodex = {
        currentHourly: last.openaiCodex.hourly,
        currentWeekly: last.openaiCodex.weekly,
        ratePerHour: ratePerHour.toFixed(2),
        dailyUsage: dailyUsage.toFixed(1),
        daysToWeeklyEmpty: daysToEmpty.toFixed(1),
        dataPoints: weekly.length
      };
      
      // Usage pattern classification
      if (dailyUsage > 80) {
        patterns.recommendations.push({
          priority: 'HIGH',
          service: 'OpenAI Codex',
          message: `Heavy usage detected: ${dailyUsage}% daily. You hit weekly limit in ~${daysToEmpty.toFixed(1)} days.`,
          actions: [
            'Pro Codex ($200/mo) may be cost-effective at this usage level',
            'Calculate: 2x Plus ($40) vs 1x Pro ($200) at your usage rate',
            'Track for 7 days to confirm pattern before upgrading'
          ]
        });
      } else if (dailyUsage > 40) {
        patterns.recommendations.push({
          priority: 'MEDIUM',
          service: 'OpenAI Codex',
          message: `Moderate-heavy usage: ${dailyUsage}% daily. Monitor for weekly limit.`,
          actions: [
            'Consider 2x Codex accounts ($40/mo) as intermediate step',
            'Shift simple tasks to cheaper models',
            'Track for 5 more days'
          ]
        });
      }
    }
  }
  
  // Cost optimization recommendations
  if (patterns.githubCopilot && patterns.openaiCodex) {
    const copilotUsage = parseFloat(patterns.githubCopilot.dailyUsage);
    const codexUsage = parseFloat(patterns.openaiCodex.dailyUsage);
    
    if (copilotUsage > 80 && codexUsage < 50) {
      patterns.recommendations.push({
        priority: 'MEDIUM',
        service: 'Cost Optimization',
        message: 'Imbalanced usage: Heavy on Copilot, light on Codex.',
        actions: [
          'Shift some tasks to Codex (you have capacity)',
          'Use Codex for technical coding (faster, better)',
          'Use Copilot for language tasks (Haiku 4.5 preferred)'
        ]
      });
    }
    
    if (codexUsage > 100) {
      patterns.recommendations.push({
        priority: 'HIGH',
        service: 'Subscription Recommendation',
        message: `At ${codexUsage}% daily Codex usage, you'll hit limits daily.`,
        actions: [
          'Calculate break-even: Pro ($200) vs 2x Plus ($40)',
          'If using 15+ hours/day consistently, Pro is better value',
          'If using 8-12 hours/day, 2x accounts may suffice'
        ]
      });
    }
  }
  
  return patterns;
}

function generateReport(data, patterns, history) {
  const date = new Date(data.timestamp).toISOString().split('T')[0];
  
  const lines = [
    `# AI Usage Pattern Analysis Report`,
    `Generated: ${new Date(data.timestamp).toISOString()}`,
    `Data Points: ${history.length} | Tracking Period: ${history.length > 0 ? Math.round((data.timestamp - history[0].timestamp) / (1000 * 60 * 60 * 24)) : 0} days`,
    ``,
    `## Current Status (${date})`,
    ``,
    `| Service | Cost/Mo | Remaining | Status |`,
    `|---------|---------|-----------|--------|`,
    `| GitHub Copilot | $39 | ${data.githubCopilot !== null ? `${data.githubCopilot}%` : 'N/A'} | ${data.githubCopilot !== null && data.githubCopilot < 10 ? '🚨 CRITICAL' : data.githubCopilot !== null && data.githubCopilot < 30 ? '⚠️ LOW' : '✅ OK'} |`,
    `| OpenAI Codex | $20 | ${data.openaiCodex ? `${data.openaiCodex.hourly}% / ${data.openaiCodex.weekly}%` : 'N/A'} | ${data.openaiCodex?.hourly < 30 ? '🚨 CRITICAL' : '✅ OK'} |`,
    `| OpenRouter | Variable | ${data.openrouterToday ? `$${data.openrouterToday.totalCost.toFixed(2)} today / $${(data.openrouterWeek?.totalCost || 0).toFixed(2)} week` : 'N/A'} | ${data.openrouterToday && data.openrouterToday.totalCost > 5 ? '⚠️ ACTIVE SPEND' : '✅ Active'} |`,
    `| **Total** | **$59 + OpenRouter usage** | - | - |`,
    ``,
    `## Usage Patterns`,
    ``,
    `### GitHub Copilot`,
    (patterns && patterns.githubCopilot) ? [
      `- **Daily Usage:** ${patterns.githubCopilot.dailyUsage}%`,
      `- **Rate:** ${patterns.githubCopilot.ratePerHour}%/hour`,
      `- **Hours to Empty:** ${patterns.githubCopilot.hoursToEmpty}h`,
      `- **Data Points:** ${patterns.githubCopilot.dataPoints}`
    ].join('\n') : '- Insufficient data (need 24h of tracking)',
    ``,
    `### OpenAI Codex`,
    (patterns && patterns.openaiCodex) ? [
      `- **Daily Usage:** ${patterns.openaiCodex.dailyUsage}%`,
      `- **Rate:** ${patterns.openaiCodex.ratePerHour}%/hour`,
      `- **Days to Weekly Limit:** ${patterns.openaiCodex.daysToWeeklyEmpty}d`,
      `- **Current:** ${patterns.openaiCodex.currentHourly}% hourly / ${patterns.openaiCodex.currentWeekly}% weekly`,
      `- **Data Points:** ${patterns.openaiCodex.dataPoints}`
    ].join('\n') : '- Insufficient data (need 7 days of tracking)',
    ``,
    `### OpenRouter`,
    data.openrouterToday ? [
      `- **Today Spend:** $${data.openrouterToday.totalCost.toFixed(2)}`,
      `- **7-Day Spend:** $${(data.openrouterWeek?.totalCost || 0).toFixed(2)}`,
      `- **Requests Today:** ${data.openrouterToday.totalRequests}`,
      `- **Top Cost Center:** ${data.openrouterToday.topModel ? `${data.openrouterToday.topModel.name} ($${data.openrouterToday.topModel.cost.toFixed(2)}, ${data.openrouterToday.topModel.share.toFixed(1)}%)` : 'N/A'}`,
      `- **Credits API:** ${data.openrouterToday.creditsError ? `Unavailable (${data.openrouterToday.creditsError})` : data.openrouterToday.creditRemaining !== null ? `$${data.openrouterToday.creditRemaining.toFixed(2)} remaining` : 'No data'}`
    ].join('\n') : '- OpenRouter usage not available',
    ``,
    `## Predictive Analysis`,
    ``,
    `### Projected Usage (Next 7 Days)`,
    (patterns && patterns.githubCopilot && patterns.openaiCodex) ? [
      `- **GitHub Copilot:** Will be empty in ~${patterns.githubCopilot.hoursToEmpty} hours`,
      `- **OpenAI Codex:** Will hit weekly limit in ~${patterns.openaiCodex.daysToWeeklyEmpty} days`,
      `- **Heavy Usage Pattern:** ${parseFloat(patterns.openaiCodex.dailyUsage) > 80 ? 'CONFIRMED' : 'Not yet confirmed'}`
    ].join('\n') : '- Need more data for predictions',
    ``,
    `## Cost/Benefit Recommendations`,
    ``,
    (patterns && patterns.recommendations && patterns.recommendations.length > 0) ? patterns.recommendations.map(r => [
      `### ${r.priority}: ${r.service}`,
      `**${r.message}**`,
      ``,
      `Recommended Actions:`,
      r.actions.map(a => `- ${a}`).join('\n'),
      ``
    ].join('\n')).join('\n') : '- No recommendations yet (need more data)',
    ``,
    `## OpenRouter Cost Centers`,
    ``,
    data.openrouterToday && data.openrouterToday.models && data.openrouterToday.models.length > 0 ? data.openrouterToday.models.slice(0, 5).map((m, idx) => `${idx + 1}. ${m.name} — $${m.cost.toFixed(2)} today · ${m.requests} req`).join('\n') : '- No OpenRouter model cost data yet',
    ``,
    `## Subscription Optimization Scenarios`,
    ``,
    `| Scenario | Monthly Cost | Daily Hours Supported | Best For |`,
    `|----------|--------------|----------------------|----------|`,
    `| Current (1x each) | $59 | ~5-8 | Light users |`,
    `| 2x Copilot + 1x Codex | $98 | ~10-12 | Moderate users |`,
    `| 2x Codex + 1x Copilot | $79 | ~10-15 | Codex-heavy users |`,
    `| Pro Codex + 1x Copilot | $239 | ~25-30 | Heavy professional users |`,
    `| 2x Pro Codex | $439 | ~50+ | Enterprise/Team |`,
    ``,
    `## Model Preference Mapping (User Notes)`,
    ``,
    `| Use Case | Preferred Model | Service |`,
    `|----------|----------------|---------|`,
    `| Simple queries | gpt-5-mini | GitHub Copilot |`,
    `| Language tasks | Haiku 4.5 | GitHub Copilot |`,
    `| General coding | Sonnet 4.6 | GitHub Copilot |`,
    `| Heavy technical | GPT-5.3-Codex | OpenAI Codex |`,
    `| Generalist tasks | GPT-5.4 | OpenAI Codex |`,
    `| Embeddings | Qwen 3.5 | OpenRouter |`,
    `| Backup model | Qwen 3.5 120B | OpenRouter |`,
    ``,
    `## Next Steps`,
    ``,
    `- [ ] Continue tracking for 7 days minimum`,
    `- [ ] Re-evaluate when Codex daily usage > 80%`,
    `- [ ] Consider 2nd account if consistently hitting limits`,
    `- [ ] Upgrade to Pro only after confirming 15+ hours/day usage`,
    ``,
    `---`,
    `*Report auto-generated every 30 minutes. Last update: ${new Date().toISOString()}*`
  ];
  
  return lines.join('\n');
}

function main() {
  console.log('🔍 AI Usage Pattern Analyzer');
  console.log('   Integrating OpenClaw + Codex Profiler + OpenRouter Usage\n');
  
  const openclawData = getOpenClawUsage();
  const profilerData = getCodexProfilerUsage();
  const openrouterToday = summarizeOpenRouter(getOpenRouterUsage('today'));
  const openrouterWeek = summarizeOpenRouter(getOpenRouterUsage('week'));
  
  if (!openclawData) {
    console.log('❌ Could not fetch OpenClaw usage data');
    return;
  }
  
  const data = {
    ...openclawData,
    profiler: profilerData,
    openrouterToday,
    openrouterWeek
  };
  
  saveData(data);
  
  const history = loadHistory();
  const patterns = analyzePatterns(history);
  
  const report = generateReport(data, patterns, history);
  fs.writeFileSync(CONFIG.analysisLog, report);
  
  // Console output
  console.log('📊 Current Status:');
  console.log(`   GitHub Copilot: ${data.githubCopilot !== null ? `${data.githubCopilot}%` : 'N/A'} ${data.githubCopilot !== null && data.githubCopilot < 10 ? '🚨' : ''}`);
  console.log(`   OpenAI Codex: ${data.openaiCodex ? `${data.openaiCodex.hourly}% / ${data.openaiCodex.weekly}%` : 'N/A'}`);
  console.log(`   OpenRouter: ${data.openrouterToday ? `$${data.openrouterToday.totalCost.toFixed(2)} today / $${(data.openrouterWeek?.totalCost || 0).toFixed(2)} week` : 'Active'}`);
  
  if (patterns) {
    console.log('\n📈 Predictions:');
    if (patterns.githubCopilot) {
      console.log(`   Copilot: ${patterns.githubCopilot.dailyUsage}%/day → Empty in ${patterns.githubCopilot.hoursToEmpty}h`);
    }
    if (patterns.openaiCodex) {
      console.log(`   Codex: ${patterns.openaiCodex.dailyUsage}%/day → Weekly limit in ${patterns.openaiCodex.daysToWeeklyEmpty}d`);
    }
    
    if (patterns.recommendations && patterns.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      patterns.recommendations.slice(0, 3).forEach(r => {
        console.log(`   ${r.priority}: ${r.message.substring(0, 60)}...`);
      });
    }
  } else {
    console.log('\n📊 Building patterns... Need more data points.');
  }
  
  console.log(`\n💾 Full report: memory/ai-usage-report.md`);
  console.log(`   History: ${history.length} data points`);
  
  // Critical alerts
  if (data.githubCopilot !== null && data.githubCopilot < 10) {
    console.log('\n🚨 CRITICAL: GitHub Copilot nearly full!');
  }
  if (data.openaiCodex?.hourly < 30) {
    console.log('🚨 CRITICAL: OpenAI Codex hourly nearly full!');
  }
  if (data.openaiCodex?.weekly < 30) {
    console.log('🚨 CRITICAL: OpenAI Codex weekly nearly full!');
  }
}

main();
