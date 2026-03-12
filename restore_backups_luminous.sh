#!/usr/bin/env bash
set -euo pipefail

# restore_backups_luminous.sh
# Safe restore helper for *.bak.<timestamp> backup files created by the assistant.
# Places backups are usually written on this host:
#  - ~/.npm-global/lib/node_modules/openclaw/...  (plugin/source edits)
#  - /home/lumadmin/.openclaw/agents/main/agent/... (agent catalogs)
#  - /home/lumadmin/.openclaw/workspace/ (workspace files)
#
# Usage:
#  ./restore_backups_luminous.sh            # interactive selection
#  ./restore_backups_luminous.sh -l         # list backups found
#  ./restore_backups_luminous.sh -r /path/to/file.bak.20260307T045605Z   # restore one
#  ./restore_backups_luminous.sh -d /some/dir   # restore all backups under dir
#  ./restore_backups_luminous.sh -a -y     # restore all found backups, answer yes to prompts
#  ./restore_backups_luminous.sh -n -r <file>  # dry run

SEARCH_DIRS=("$HOME/.npm-global/lib/node_modules/openclaw" "$HOME/.openclaw" "$HOME/.local/share/pnpm/store" "$PWD")
LOGFILE="$HOME/.openclaw/workspace/restore_backups_log_$(date -u +%Y%m%dT%H%M%SZ).log"
DRY_RUN=false
ASSUME_YES=false
LIST_ONLY=false
RESTORE_ONE=""
RESTORE_DIR=""
RESTORE_ALL=false

usage(){
  sed -n '1,200p' "$0" | sed -n '1,200p' >/dev/stderr
}

find_backups(){
  local -n _out=$1
  _out=()
  for d in "${SEARCH_DIRS[@]}"; do
    if [[ -d "$d" ]]; then
      while IFS= read -r -d $'\0' f; do
        _out+=("$f")
      done < <(find "$d" -type f -name '*.bak.*' -print0 2>/dev/null)
    fi
  done
}

restore_one(){
  local bak="$1"
  local original
  # Compute original by stripping the first occurrence of ".bak." and everything after it.
  # Example: /path/index.ts.bak.20260307T045605Z -> /path/index.ts
  original="${bak%%.bak.*}"
  if [[ "$original" == "$bak" ]]; then
    echo "[ERROR] Could not determine original path for backup: $bak" >&2
    return 1
  fi

  echo "\n[INFO] Restoring backup:" >&2
  echo "  backup:  $bak" >&2
  echo "  target:  $original" >&2

  if [[ -e "$original" ]]; then
    if [[ "$ASSUME_YES" != "true" ]]; then
      read -r -p "Target already exists. Overwrite and create a pre-restore copy? [y/N] " yn
      case "$yn" in
        [Yy]*) : ;;
        *) echo "Skipping $bak" >&2; return 0 ;;
      esac
    fi
    local pre="${original}.prerestore.$(date -u +%Y%m%dT%H%M%SZ)"
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[DRY RUN] would copy existing target $original -> $pre" >&2
    else
      echo "[INFO] Backing up existing target to: $pre" >&2
      cp -a --preserve=all "$original" "$pre" || { echo "[ERROR] failed to back up existing $original" >&2; return 1; }
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Backed up $original -> $pre" >> "$LOGFILE"
    fi
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY RUN] would restore $bak -> $original" >&2
  else
    # Ensure target dir exists
    mkdir -p "$(dirname "$original")"
    cp -a --preserve=all "$bak" "$original" || { echo "[ERROR] failed to restore $bak -> $original" >&2; return 1; }
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Restored $bak -> $original" >> "$LOGFILE"
    echo "[OK] Restored $bak -> $original" >&2
  fi
}

# CLI parsing
while [[ ${#} -gt 0 ]]; do
  case "$1" in
    -l|--list) LIST_ONLY=true; shift ;;
    -r|--restore) RESTORE_ONE="$2"; shift 2 ;;
    -d|--restore-dir) RESTORE_DIR="$2"; shift 2 ;;
    -a|--restore-all) RESTORE_ALL=true; shift ;;
    -n|--dry-run) DRY_RUN=true; shift ;;
    -y|--yes) ASSUME_YES=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

# Discover backups
mapfile -t BACKUPS < <(for d in "${SEARCH_DIRS[@]}"; do
  if [[ -d "$d" ]]; then find "$d" -type f -name '*.bak.*' 2>/dev/null; fi
done | sort)

if [[ -n "$RESTORE_DIR" ]]; then
  mapfile -t BACKUPS < <(find "$RESTORE_DIR" -type f -name '*.bak.*' 2>/dev/null | sort)
fi

if [[ -n "$RESTORE_ONE" ]]; then
  if [[ ! -f "$RESTORE_ONE" ]]; then
    echo "[ERROR] Specified backup not found: $RESTORE_ONE" >&2
    exit 2
  fi
  BACKUPS=("$RESTORE_ONE")
fi

if [[ ${#BACKUPS[@]} -eq 0 ]]; then
  echo "No backup files (*.bak.*) found in the default locations." >&2
  echo "Searched: ${SEARCH_DIRS[*]}" >&2
  exit 0
fi

if [[ "$LIST_ONLY" == "true" ]]; then
  echo "Found ${#BACKUPS[@]} backup(s):" >&2
  for i in "${!BACKUPS[@]}"; do
    echo "[$i] ${BACKUPS[$i]}" >&2
  done
  exit 0
fi

# Non-interactive: restore all if -a provided
if [[ "$RESTORE_ALL" == "true" ]]; then
  echo "Restoring all ${#BACKUPS[@]} backups..." >&2
  for b in "${BACKUPS[@]}"; do restore_one "$b"; done
  echo "Done. Log: $LOGFILE" >&2
  exit 0
fi

# Interactive selection
echo "Found ${#BACKUPS[@]} backup(s):" >&2
for i in "${!BACKUPS[@]}"; do
  echo "[$i] ${BACKUPS[$i]}" >&2
done

echo
read -r -p "Enter index(es) to restore (e.g. 0 2 3), 'all' to restore all, or empty to cancel: " sel
if [[ -z "$sel" ]]; then
  echo "No selection. Exiting." >&2
  exit 0
fi

if [[ "$sel" == "all" ]]; then
  for b in "${BACKUPS[@]}"; do restore_one "$b"; done
  echo "Done. Log: $LOGFILE" >&2
  exit 0
fi

# parse indices
for token in $sel; do
  if [[ "$token" =~ ^[0-9]+$ ]]; then
    idx=$token
    if (( idx < 0 || idx >= ${#BACKUPS[@]} )); then
      echo "Index out of range: $idx" >&2; continue
    fi
    restore_one "${BACKUPS[$idx]}"
  else
    echo "Ignoring invalid token: $token" >&2
  fi
done

echo "All requested ops complete. Log: $LOGFILE" >&2
exit 0
