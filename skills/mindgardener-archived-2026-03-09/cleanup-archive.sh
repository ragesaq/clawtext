#!/bin/bash
# Delete archived log groups older than TTL (in minutes)
WORKSPACE="$HOME/.openclaw/workspace"
ARCHIVE_DIR="$WORKSPACE/memory/log-archive"
QUEUE_DIR="$WORKSPACE/memory/summarizer-queue"
# TTL in minutes (default: 360 = 6 hours)
TTL_MINUTES=${1:-360}

if [ -d "$ARCHIVE_DIR" ]; then
  find "$ARCHIVE_DIR" -type f -mmin +$TTL_MINUTES -print -delete
fi

# Optional: also cleanup summarizer queue entries older than TTL
if [ -d "$QUEUE_DIR" ]; then
  find "$QUEUE_DIR" -type f -mmin +$TTL_MINUTES -print -delete
fi

# rotate promotions log if > 1MB
LOG="$WORKSPACE/memory/promotions.log"
if [ -f "$LOG" ]; then
  size=$(stat -c%s "$LOG")
  if [ $size -gt 1000000 ]; then
    mv "$LOG" "$LOG.$(date +%s)"
    touch "$LOG"
  fi
fi
