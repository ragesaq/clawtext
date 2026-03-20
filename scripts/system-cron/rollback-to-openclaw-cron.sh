#!/usr/bin/env bash
set -euo pipefail

TIMER_UNITS=(
  clawtext-extract-buffer.timer
  clawtext-daily-cluster-rebuild.timer
  clawtext-operational-maintenance.timer
)
OPENCLAW_JOB_IDS=(
  40f47683-0d90-4deb-ad06-5dac45e8de80
  42be7486-c8dd-4f8b-b633-aa37b941a164
  1be4f0f1-9bb4-4ac7-89f9-b5f9cda730d0
)

printf 'Disabling ClawText user timers...\n'
systemctl --user disable --now "${TIMER_UNITS[@]}"

printf 'Re-enabling previous OpenClaw cron jobs...\n'
for id in "${OPENCLAW_JOB_IDS[@]}"; do
  openclaw cron enable "$id"
done

printf '\nRollback complete. Current OpenClaw cron list:\n'
openclaw cron list
