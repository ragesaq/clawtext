#!/bin/bash
# Usage Tracker Cron Job
# Runs hourly to check OpenAI and GitHub Copilot usage

cd /home/lumadmin/.openclaw/workspace

# Set environment variables from config if needed
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# Run the usage tracker
python3 /home/lumadmin/.openclaw/workspace/scripts/usage-tracker.py

# Log completion
echo "$(date '+%Y-%m-%d %H:%M:%S') - Usage tracker completed" >> /home/lumadmin/.openclaw/workspace/logs/usage/cron.log
