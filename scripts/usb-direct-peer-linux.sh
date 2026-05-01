#!/usr/bin/env bash
# Run ON THE SERVER (Linux) after the Windows laptop is set to 192.168.99.1/24.
# Usage: sudo ./usb-direct-peer-linux.sh [interface]   # default: first ethernet with carrier
set -euo pipefail
PEER="${PEER:-192.168.99.1}"
ME="${ME:-192.168.99.2}"

iface="${1:-}"
if [[ -z "$iface" ]]; then
  iface="$(ip -o link show | awk -F': ' '/state UP/{print $2}' | grep -E 'eth|en|usb|end' | head -1 || true)"
fi
if [[ -z "$iface" ]]; then
  echo "Could not guess interface. Usage: sudo $0 eth0" >&2
  exit 1
fi

ip link set "$iface" up
ip addr flush dev "$iface" 2>/dev/null || true
ip addr add "${ME}/24" dev "$iface"
echo "Set $iface to ${ME}/24 — try: ping -c 2 $PEER"
echo "Then: ssh from laptop: ssh $USER@$ME   (or use the IP you expect on Windows)"
