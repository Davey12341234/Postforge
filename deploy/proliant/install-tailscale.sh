#!/usr/bin/env bash
# Install Tailscale on Ubuntu so this server gets a stable 100.x address on your tailnet.
# Use from PC: scp + ssh, or scripts/proliant-install-tailscale.ps1
#
# Unattended:   sudo TAILSCALE_AUTHKEY=tskey-auth-xxxxx bash install-tailscale.sh
# Interactive: sudo bash install-tailscale.sh
set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  exec sudo env TAILSCALE_AUTHKEY="${TAILSCALE_AUTHKEY:-}" bash "$0" "$@"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates

if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi

# UFW: allow Tailscale interface (common failure mode per Tailscale KB).
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q 'Status: active'; then
  ufw allow in on tailscale0 comment 'tailscale' 2>/dev/null || true
fi

if [[ -n "${TAILSCALE_AUTHKEY:-}" ]]; then
  tailscale up --auth-key="${TAILSCALE_AUTHKEY}" --accept-dns=true --ssh
else
  echo "Interactive login: open the URL shown below in a browser (any device on the internet is fine)."
  tailscale up --accept-dns=true --ssh
fi

echo ""
tailscale status 2>/dev/null || true
echo ""
echo "Tailscale IPv4 (use for: ssh user@THIS):"
tailscale ip -4 2>/dev/null || echo "(run: tailscale ip -4)"
