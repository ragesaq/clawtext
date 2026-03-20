#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
UNIT_SRC_DIR="$REPO_DIR/ops/systemd/user"
UNIT_DEST_DIR="${HOME}/.config/systemd/user"
TIMERS=(
  clawtext-extract-buffer.timer
  clawtext-daily-cluster-rebuild.timer
  clawtext-operational-maintenance.timer
)
SERVICES=(
  clawtext-extract-buffer.service
  clawtext-daily-cluster-rebuild.service
  clawtext-operational-maintenance.service
)

mkdir -p "$UNIT_DEST_DIR"
for unit in "${TIMERS[@]}" "${SERVICES[@]}"; do
  install -m 0644 "$UNIT_SRC_DIR/$unit" "$UNIT_DEST_DIR/$unit"
done

systemctl --user daemon-reload
systemctl --user enable --now "${TIMERS[@]}"

printf '\nInstalled/updated ClawText user units in %s\n' "$UNIT_DEST_DIR"
systemctl --user list-timers --all 'clawtext-*' --no-pager
