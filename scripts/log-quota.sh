#!/bin/bash
# Quick script to log quota data manually from Discord
# Usage: ./log-quota.sh "github_copilot_premium:6" "github_copilot_chat:100" "openai_weekly:100"

LOG_FILE="/home/lumadmin/.openclaw/workspace/logs/usage/quota-manual-entries.jsonl"

mkdir -p "$(dirname "$LOG_FILE")"

ENTRY='{"timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"'

# Parse arguments
for arg in "$@"; do
  key=$(echo "$arg" | cut -d: -f1)
  value=$(echo "$arg" | cut -d: -f2)
  
  case $key in
    github_copilot_premium)
      ENTRY+=',"github_copilot_premium":"'"$value"'"'
      ;;
    github_copilot_chat)
      ENTRY+=',"github_copilot_chat":"'"$value"'"'
      ;;
    openai_hourly)
      ENTRY+=',"openai_codex_hourly":"'"$value"'"'
      ;;
    openai_weekly)
      ENTRY+=',"openai_codex_weekly":"'"$value"'"'
      ;;
  esac
done

ENTRY+="}"

# Append to log file
echo "$ENTRY" >> "$LOG_FILE"

echo "✓ Logged quota data to $LOG_FILE"
cat "$LOG_FILE" | tail -1 | python3 -m json.tool
