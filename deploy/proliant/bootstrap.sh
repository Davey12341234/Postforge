#!/usr/bin/env bash
# Install BabyGPT on Ubuntu Server 22.04/24.04 (amd64) after you boot from the installer USB.
# Run as root: sudo bash bootstrap.sh /path/to/babygpt-src.zip
# Or:   curl -fsSL ... | sudo bash -s -- /path/to/babygpt-src.zip
set -euo pipefail

INSTALL_ROOT="/opt/babygpt"
NODE_MAJOR=20

die() { echo "ERROR: $*" >&2; exit 1; }

if [[ "${EUID:-0}" -ne 0 ]]; then
  die "Run as root (sudo)."
fi

ZIP_PATH="${1:-}"
if [[ -z "${ZIP_PATH}" && -n "${BABYGPT_SRC_ZIP:-}" ]]; then
  ZIP_PATH="${BABYGPT_SRC_ZIP}"
fi

if [[ -z "${ZIP_PATH}" ]]; then
  die "Usage: sudo bash bootstrap.sh /path/to/babygpt-src.zip
Or set BABYGPT_SRC_ZIP to the zip path (from this repo: scripts/archive-babygpt-for-server.ps1)."
fi

if [[ ! -f "${ZIP_PATH}" ]]; then
  die "Zip not found: ${ZIP_PATH}"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git rsync unzip

if ! command -v node >/dev/null 2>&1 || ! node -e "process.exit(Number(process.versions.node.split('.')[0]) < ${NODE_MAJOR} ? 1 : 0)" 2>/dev/null; then
  echo "Installing Node.js ${NODE_MAJOR}.x (NodeSource)..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

echo "Node: $(command -v node) $(node -v) / npm $(npm -v)"

if ! id -u babygpt >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "${INSTALL_ROOT}" --shell /bin/bash babygpt
fi

mkdir -p "${INSTALL_ROOT}"
TMP="${TMPDIR:-/tmp}/babygpt-unzip-$$"
rm -rf "${TMP}"
mkdir -p "${TMP}"
unzip -q -o "${ZIP_PATH}" -d "${TMP}"

# Expect git-archive layout: top-level folder "babygpt/" with package.json inside.
if [[ -f "${TMP}/babygpt/package.json" ]]; then
  rsync -a --delete "${TMP}/babygpt/" "${INSTALL_ROOT}/"
elif [[ -f "${TMP}/package.json" ]]; then
  rsync -a --delete "${TMP}/" "${INSTALL_ROOT}/"
else
  die "Could not find package.json after unzip. Re-create the zip with: git archive --format=zip --prefix=babygpt/ -o babygpt-src.zip HEAD"
fi
rm -rf "${TMP}"

chown -R babygpt:babygpt "${INSTALL_ROOT}"

# Non-interactive: BABYGPT_ENV_FILE installs secrets before npm build (NEXT_PUBLIC_* and build-time env).
if [[ -n "${BABYGPT_ENV_FILE:-}" && -f "${BABYGPT_ENV_FILE}" ]]; then
  install -o babygpt -g babygpt -m 0600 "${BABYGPT_ENV_FILE}" "${INSTALL_ROOT}/.env"
  echo "Installed ${INSTALL_ROOT}/.env from BABYGPT_ENV_FILE"
elif [[ ! -f "${INSTALL_ROOT}/.env" ]]; then
  if [[ -f "${INSTALL_ROOT}/.env.local.example" ]]; then
    cp "${INSTALL_ROOT}/.env.local.example" "${INSTALL_ROOT}/.env"
    chown babygpt:babygpt "${INSTALL_ROOT}/.env"
    echo "Created ${INSTALL_ROOT}/.env from .env.local.example - set Z_AI_API_KEY / OPENAI_API_KEY for full AI features."
  else
    echo "WARNING: No .env - create ${INSTALL_ROOT}/.env (see .env.local.example)."
  fi
fi

sudo -u babygpt bash -c "cd ${INSTALL_ROOT} && npm ci && npm run build"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/babygpt.service" ]]; then
  install -m 0644 "${SCRIPT_DIR}/babygpt.service" /etc/systemd/system/babygpt.service
else
  cat > /etc/systemd/system/babygpt.service <<'UNIT'
[Unit]
Description=BabyGPT (Next.js production server)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=babygpt
Group=babygpt
WorkingDirectory=/opt/babygpt
Environment=NODE_ENV=production
Environment=HOME=/opt/babygpt
EnvironmentFile=-/opt/babygpt/.env
ExecStart=/usr/bin/npm run start -- --hostname 0.0.0.0 --port 3000
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT
  chmod 0644 /etc/systemd/system/babygpt.service
fi

systemctl daemon-reload
systemctl enable babygpt.service
systemctl restart babygpt.service

# OpenSSH first, then app port, then enable UFW (non-interactive; safe for default SSH install).
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH comment 'ssh' 2>/dev/null || ufw allow 22/tcp comment 'ssh' || true
  ufw allow 3000/tcp comment 'BabyGPT' || true
  if ufw status 2>/dev/null | grep -q 'Status: inactive'; then
    ufw --force enable
  fi
fi

echo "BabyGPT service installed."
echo "  journalctl -u babygpt -f"
echo "  Open from another machine: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Edit keys: nano ${INSTALL_ROOT}/.env  then: sudo systemctl restart babygpt"
