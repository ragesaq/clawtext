# Usage Tracker - How to Use

## Overview
This system tracks OpenAI and GitHub Copilot quota limits over time to detect reset patterns.

## The Problem
- Quota data (`Premium 6% left`, `Weekly 100% left`) is displayed in Discord
- This data is **not** accessible via CLI or API
- We need to manually log it to track changes over time

## Solution: Manual Entry + Automated Tracking

### Step 1: Log Quota Data When You See It in Discord

When you see the quota status in Discord (e.g., after a status check), run:

```bash
# Example: GitHub Copilot Premium at 6%, Chat at 100%, OpenAI Weekly at 100%
./log-quota.sh "github_copilot_premium:6" "github_copilot_chat:100" "openai_weekly:100"
```

**Common commands:**
```bash
# Log GitHub Copilot data
./log-quota.sh "github_copilot_premium:6" "github_copilot_chat:100"

# Log OpenAI data
./log-quota.sh "openai_weekly:100"

# Log everything
./log-quota.sh "github_copilot_premium:6" "github_copilot_chat:100" "openai_hourly:5" "openai_weekly:100"
```

### Step 2: Automated Hourly Reports

The cron job runs every hour and:
1. Reads the **most recent** manual entry
2. Compares it to previous entries
3. Detects quota resets (e.g., 19% → 100%)
4. Posts a report to Discord #status channel
5. Saves historical data for trend analysis

### Step 3: View Historical Data

```bash
# View today's entries
cat /home/lumadmin/.openclaw/workspace/logs/usage/quota-manual-entries.jsonl

# View all history
cat /home/lumadmin/.openclaw/workspace/logs/usage/quota-history-*.jsonl

# View with formatting
tail -f /home/lumadmin/.openclaw/workspace/logs/usage/quota-manual-entries.jsonl | python3 -m json.tool
```

## Example Workflow

1. **Check Discord** for quota status (e.g., "Premium 6% left")
2. **Log the data**: `./log-quota.sh "github_copilot_premium:6"`
3. **Wait for hourly report** - the cron job will post to Discord
4. **Detect resets** - if quota jumps from 19% → 100%, the report will flag it

## Setting Up the Cron Job

### Option A: System Cron
```bash
crontab -e
# Add this line:
0 * * * * /home/lumadmin/.openclaw/workspace/scripts/usage-tracker.py
```

### Option B: OpenClaw Cron
The cron job definition is in `/home/lumadmin/.openclaw/workspace/cron/usage-tracker.json`

## Data Storage

All data is stored in:
```
/home/lumadmin/.openclaw/workspace/logs/usage/
├── quota-manual-entries.jsonl    # Manual entries (most recent first)
├── quota-history-YYYY-MM-DD.jsonl  # Hourly snapshots
└── usage-YYYY-MM-DD.json         # Token consumption data
```

## Benefits

- **Track quota reset patterns** (e.g., "OpenAI resets every 2 days")
- **Detect anomalies** (unexpected resets or limits)
- **Historical analysis** (plot usage over time)
- **Automated alerts** (when resets are detected)

## Tips

- Log data **every time** you check Discord quota status
- The cron job will use the **most recent** manual entry
- If you don't log data, the report will show "No data"
- Reset detection triggers when quota increases by >10%

---

**Quick Start:**
```bash
# 1. Log your current quota (check Discord first!)
./log-quota.sh "github_copilot_premium:6" "openai_weekly:100"

# 2. Run the tracker manually to test
python3 /home/lumadmin/.openclaw/workspace/scripts/usage-tracker.py

# 3. Set up cron for hourly reports
crontab -e  # Add: 0 * * * * /home/lumadmin/.openclaw/workspace/scripts/usage-tracker.py
```
