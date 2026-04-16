#!/usr/bin/env bash
# One-shot entry after copying this folder to the server: installs deps, builds, systemd, firewall.
# Run:   sudo bash bring-online.sh
# Or:   sudo BABYGPT_ENV_FILE=/path/to/.env bash bring-online.sh
# With zip path: sudo bash bring-online.sh /path/to/babygpt-src.zip
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ZIP_PATH="${1:-${BABYGPT_SRC_ZIP:-${DIR}/babygpt-src.zip}}"

for f in bootstrap.sh bring-online.sh; do
  if [[ -f "${DIR}/${f}" ]]; then
    sed -i 's/\r$//' "${DIR}/${f}" 2>/dev/null || true
  fi
done

chmod +x "${DIR}/bootstrap.sh" 2>/dev/null || true

if [[ "${EUID:-0}" -ne 0 ]]; then
  exec sudo env BABYGPT_ENV_FILE="${BABYGPT_ENV_FILE:-}" BABYGPT_SRC_ZIP="${BABYGPT_SRC_ZIP:-}" bash "${DIR}/bring-online.sh" "$@"
fi

if [[ ! -f "${ZIP_PATH}" ]]; then
  echo "ERROR: Zip not found: ${ZIP_PATH}" >&2
  exit 1
fi

exec bash "${DIR}/bootstrap.sh" "${ZIP_PATH}"
