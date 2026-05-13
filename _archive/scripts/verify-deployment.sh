#!/usr/bin/env bash
# Thin wrapper — delegates to Node for Windows/Git Bash compatibility.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/verify-deployment.mjs" "$@"
