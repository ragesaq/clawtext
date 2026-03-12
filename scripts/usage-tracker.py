#!/usr/bin/env python3
"""
Usage Tracker - Extract quota data from OpenClaw memory clusters
The quota data is already stored in memory clusters from user messages
Posts hourly reports to Discord #status channel
"""

import os
import sys
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path

def extract_quota_from_clusters():
    """
    Extract quota data from memory clusters.
    The data is already stored there from previous user messages.
    """
    quota_data = {
        'github_copilot_premium': None,
        'github_copilot_chat': None,
        'openai_codex_hourly': None,
        'openai_codex_weekly': None,
        'source': 'memory_clusters'
    }
    
    cluster_dir = Path("/home/lumadmin/.openclaw/workspace/memory/clusters")
    
    if not cluster_dir.exists():
        return quota_data
    
    # Search all cluster files for quota patterns
    for cluster_file in cluster_dir.glob("cluster-*.json"):
        try:
            with open(cluster_file, 'r') as f:
                content = f.read()
            
            # Look for quota patterns in cluster content
            # Pattern: "Premium plan with X% remaining"
            premium_match = re.search(r'Premium.*?(\d+)%\s+remaining', content, re.IGNORECASE)
            chat_match = re.search(r'Chat.*?(\d+)%\s+remaining', content, re.IGNORECASE)
            openai_hourly_match = re.search(r'(\d+)h\s+remaining', content, re.IGNORECASE)
            openai_weekly_match = re.search(r'week.*?(\d+)%', content, re.IGNORECASE)
            
            if premium_match and not quota_data['github_copilot_premium']:
                quota_data['github_copilot_premium'] = premium_match.group(1)
            if chat_match and not quota_data['github_copilot_chat']:
                quota_data['github_copilot_chat'] = chat_match.group(1)
            if openai_hourly_match and not quota_data['openai_codex_hourly']:
                quota_data['openai_codex_hourly'] = openai_hourly_match.group(1)
            if openai_weekly_match and not quota_data['openai_codex_weekly']:
                quota_data['openai_codex_weekly'] = openai_weekly_match.group(1)
                
        except Exception as e:
            continue
    
    return quota_data

def get_latest_quota_from_memory():
    """
    Get the most recent quota data from memory files.
    """
    quota_data = {
        'github_copilot_premium': None,
        'github_copilot_chat': None,
        'openai_codex_hourly': None,
        'openai_codex_weekly': None,
        'source': 'memory_files'
    }
    
    memory_dir = Path("/home/lumadmin/.openclaw/workspace/memory")
    
    # Check recent memory files
    memory_files = sorted(memory_dir.glob("*.md"), reverse=True)[:5]
    
    for memory_file in memory_files:
        try:
            with open(memory_file, 'r') as f:
                content = f.read()
            
            # Look for quota patterns
            premium_match = re.search(r'github_copilot_premium[:\s]+(\d+)%', content, re.IGNORECASE)
            chat_match = re.search(r'github_copilot_chat[:\s]+(\d+)%', content, re.IGNORECASE)
            openai_weekly_match = re.search(r'openai.*?weekly.*?(\d+)%', content, re.IGNORECASE)
            openai_hourly_match = re.search(r'(\d+)h\s+left', content, re.IGNORECASE)
            
            if premium_match and not quota_data['github_copilot_premium']:
                quota_data['github_copilot_premium'] = premium_match.group(1)
            if chat_match and not quota_data['github_copilot_chat']:
                quota_data['github_copilot_chat'] = chat_match.group(1)
            if openai_weekly_match and not quota_data['openai_codex_weekly']:
                quota_data['openai_codex_weekly'] = openai_weekly_match.group(1)
            if openai_hourly_match and not quota_data['openai_codex_hourly']:
                quota_data['openai_codex_hourly'] = openai_hourly_match.group(1)
                
            # If we found all data, stop searching
            if all([quota_data['github_copilot_premium'], quota_data['github_copilot_chat'],
                   quota_data['openai_codex_hourly'], quota_data['openai_codex_weekly']]):
                break
                
        except Exception as e:
            continue
    
    return quota_data

def save_quota_snapshot(quota_data):
    """Save a snapshot of current quota data for historical tracking."""
    log_dir = Path("/home/lumadmin/.openclaw/workspace/logs/usage")
    log_dir.mkdir(parents=True, exist_ok=True)
    
    snapshot_file = log_dir / f"quota-snapshot-{datetime.utcnow().strftime('%Y-%m-%d-%H%M')}.json"
    
    snapshot = {
        'timestamp': datetime.utcnow().isoformat(),
        **quota_data
    }
    
    with open(snapshot_file, 'w') as f:
        json.dump(snapshot, f, indent=2)
    
    # Also append to daily log
    daily_log = log_dir / f"quota-daily-{datetime.utcnow().strftime('%Y-%m-%d')}.jsonl"
    with open(daily_log, 'a') as f:
        f.write(json.dumps(snapshot) + '\n')

def detect_quota_reset(previous_snapshots, current_data):
    """Detect if a quota reset occurred by comparing with previous snapshots."""
    resets = []
    
    if not previous_snapshots:
        return resets
    
    # Get the most recent previous snapshot
    prev = previous_snapshots[-1]
    
    # Check GitHub Copilot Premium
    if prev.get('github_copilot_premium') and current_data.get('github_copilot_premium'):
        prev_pct = int(prev['github_copilot_premium'])
        curr_pct = int(current_data['github_copilot_premium'])
        if curr_pct > prev_pct + 10:  # Significant increase indicates reset
            resets.append(f"GitHub Copilot Premium: {prev_pct}% → {curr_pct}%")
    
    # Check OpenAI Weekly
    if prev.get('openai_codex_weekly') and current_data.get('openai_codex_weekly'):
        prev_pct = int(prev['openai_codex_weekly'])
        curr_pct = int(current_data['openai_codex_weekly'])
        if curr_pct > prev_pct + 10:
            resets.append(f"OpenAI Weekly: {prev_pct}% → {curr_pct}%")
    
    return resets

def get_previous_snapshots():
    """Get previous quota snapshots for comparison."""
    log_dir = Path("/home/lumadmin/.openclaw/workspace/logs/usage")
    snapshots = []
    
    # Read daily logs
    for daily_log in sorted(log_dir.glob("quota-daily-*.jsonl")):
        try:
            with open(daily_log, 'r') as f:
                for line in f:
                    if line.strip():
                        snapshots.append(json.loads(line))
        except:
            continue
    
    return snapshots[-10:]  # Last 10 snapshots

def format_report(quota_data, resets):
    """Format the usage report for Discord."""
    report = []
    report.append("📊 **Hourly Quota Report**")
    report.append(f"🕐 *{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*")
    report.append("")
    
    # GitHub Copilot Section
    report.append("🟢 **GitHub Copilot**")
    if quota_data.get('github_copilot_premium'):
        report.append(f"• Premium: {quota_data['github_copilot_premium']}% left")
    else:
        report.append("• Premium: No data available")
    
    if quota_data.get('github_copilot_chat'):
        report.append(f"• Chat: {quota_data['github_copilot_chat']}% left")
    else:
        report.append("• Chat: No data available")
    
    report.append("")
    
    # OpenAI Codex Section
    report.append("🔵 **OpenAI Codex**")
    if quota_data.get('openai_codex_hourly'):
        report.append(f"• Hourly: {quota_data['openai_codex_hourly']}h left")
    else:
        report.append("• Hourly: No data available")
    
    if quota_data.get('openai_codex_weekly'):
        report.append(f"• Weekly: {quota_data['openai_codex_weekly']}% left")
    else:
        report.append("• Weekly: No data available")
    
    # Reset Detection
    if resets:
        report.append("")
        report.append("🔄 **Quota Resets Detected**")
        for reset in resets:
            report.append(f"• {reset}")
    
    report.append("")
    report.append(f"*Data source: {quota_data.get('source', 'unknown')}*")
    report.append("*Report generated by Usage Tracker cron job*")
    
    return "\n".join(report)

def send_to_discord(report):
    """Send report to Discord via OpenClaw CLI."""
    try:
        result = subprocess.run(
            ['openclaw', 'message', 'send', '--channel', 'discord', 
             '--target', 'channel:1475019186563448852',
             '--message', report],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✓ Report sent to Discord")
            return True
        else:
            print(f"✗ Failed to send to Discord: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"✗ Error sending to Discord: {e}")
        return False

def main():
    """Main entry point."""
    print(f"Starting usage tracker at {datetime.utcnow()}")
    
    # Extract quota data from memory
    quota_data = extract_quota_from_clusters()
    
    # If not found in clusters, try memory files
    if not quota_data['github_copilot_premium']:
        quota_data = get_latest_quota_from_memory()
    
    # Get previous snapshots for reset detection
    previous_snapshots = get_previous_snapshots()
    
    # Detect resets
    resets = detect_quota_reset(previous_snapshots, quota_data)
    
    # Save snapshot
    save_quota_snapshot(quota_data)
    
    # Format report
    report = format_report(quota_data, resets)
    
    # Print to stdout
    print(report)
    
    # Send to Discord
    send_to_discord(report)
    
    # Print reset alerts
    if resets:
        print("\n⚠️  QUOTA RESETS DETECTED:")
        for reset in resets:
            print(f"  - {reset}")
    
    print("Usage tracker completed")

if __name__ == "__main__":
    main()
