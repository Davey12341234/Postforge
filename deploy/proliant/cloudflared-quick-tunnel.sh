#!/usr/bin/env bash
# One-shot public HTTPS URL to BabyGPT on port 3000 (no router port-forward).
# URL looks like https://random-subdomain.trycloudflare.com — good for testing; not for production secrets.
# Run on server: sudo bash cloudflared-quick-tunnel.sh
# Prefer tmux/screen so the tunnel stays up: tmux new -s cf \; send-keys 'sudo bash cloudflared-quick-tunnel.sh' Enter
set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  exec sudo bash "$0" "$@"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates

DEB="/tmp/cloudflared-linux-amd64.deb"
ARCH="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
if [[ "${ARCH}" != "amd64" ]]; then
  echo "This quick script only handles amd64 .deb; install cloudflared manually for ${ARCH}." >&2
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  curl -fsSL -o "${DEB}" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
  dpkg -i "${DEB}" || apt-get install -y -f
fi

echo "Starting tunnel to http://127.0.0.1:3000 — copy the https://....trycloudflare.com URL when it appears."
echo "Ensure BabyGPT is running: systemctl status babygpt"
echo ""
exec cloudflared tunnel --url "http://127.0.0.1:3000"
