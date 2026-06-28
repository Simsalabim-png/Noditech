#!/usr/bin/env bash
# Operator script — run the private Air/Air validation locally (outside GitHub).
# Claude does NOT run this. It reads NODITECH_PRIVATE_VALIDATION_FILE, uses the SAME
# evaluator/engine as the browser UI, writes the value-bearing report ONLY to a
# git-ignored private directory, and prints nothing private to stdout (only
# case-001/.. + status + counts).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

: "${NODITECH_PRIVATE_VALIDATION_FILE:?set NODITECH_PRIVATE_VALIDATION_FILE to an absolute path (never committed)}"
: "${NODITECH_PRIVATE_REPORT_DIR:?set NODITECH_PRIVATE_REPORT_DIR to a git-ignored private dir}"

if [ ! -f "$NODITECH_PRIVATE_VALIDATION_FILE" ]; then
  echo "SKIPPED private validation file not found"; exit 0
fi

mkdir -p "$NODITECH_PRIVATE_REPORT_DIR"

# Guard: the report dir must be git-ignored (best-effort check; aborts if tracked).
if command -v git >/dev/null 2>&1 && git -C "$ROOT" rev-parse >/dev/null 2>&1; then
  if ! git -C "$ROOT" check-ignore -q "$NODITECH_PRIVATE_REPORT_DIR" 2>/dev/null; then
    case "$NODITECH_PRIVATE_REPORT_DIR" in
      "$ROOT"/*) echo "ABORT: report dir is inside the repo and not git-ignored"; exit 2 ;;
    esac
  fi
fi

# Public stdout only: <case-NNN>\tVALID|WARNING|BLOCKED + summary. Detailed
# value-bearing report goes only to NODITECH_PRIVATE_REPORT_DIR.
NODITECH_ENABLE_PRIVATE_REPORT=1 node "$ROOT/src/engine/airAirEvaluator.js"

echo "private report written to the git-ignored directory (path not printed)."
