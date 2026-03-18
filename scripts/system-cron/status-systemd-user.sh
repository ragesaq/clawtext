#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
STATE_ROOT="$WORKSPACE/state/clawtext/prod"
STATUS_DIR="$STATE_ROOT/run-status"
LOG_DIR="$STATE_ROOT/logs"
NOW_EPOCH="$(date -u +%s)"

status_file_report() {
  local file="$1"
  local job
  job="$(basename "$file" .json)"
  python3 - "$file" "$NOW_EPOCH" <<'PY'
import json, sys, time, pathlib
p = pathlib.Path(sys.argv[1])
now = int(sys.argv[2])
obj = json.loads(p.read_text())
ended = obj.get('endedAt') or obj.get('startedAt')
lag = None
if ended:
    try:
        lag = int(now - int(time.mktime(time.strptime(ended, '%Y-%m-%dT%H:%M:%SZ'))))
    except Exception:
        lag = None
print(f"{obj.get('job','unknown')}: ok={obj.get('ok')} exitCode={obj.get('exitCode')} durationMs={obj.get('durationMs')} lastEnded={ended} lagSec={lag}")
PY
}

printf '=== ClawText systemd timers ===\n'
systemctl --user list-timers --all 'clawtext-*' --no-pager || true

printf '\n=== Service states ===\n'
for svc in clawtext-extract-buffer.service clawtext-daily-cluster-rebuild.service clawtext-operational-maintenance.service; do
  systemctl --user show "$svc" \
    -p Id \
    -p LoadState \
    -p ActiveState \
    -p SubState \
    -p Result \
    -p ExecMainStatus \
    -p ExecMainCode | sed 's/^/  /'
  echo
done

printf '=== Run-status files ===\n'
shopt -s nullglob
for f in "$STATUS_DIR"/clawtext-*.json; do
  status_file_report "$f"
done
shopt -u nullglob

printf '\n=== Recent logs ===\n'
for f in "$LOG_DIR"/clawtext-*.log; do
  echo "--- $f"
  tail -8 "$f" || true
  echo
 done
