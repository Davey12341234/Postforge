#Requires -RunAsAdministrator
<#
  Configures the USB (or direct) Ethernet link for a two-machine subnet so your
  laptop can reach a headless server on the same cable.

  Default: this PC = 192.168.99.1/24, peer (server) = 192.168.99.2/24

  After this script: on the SERVER set its NIC to 192.168.99.2/24 (same subnet).
  Linux example (replace eth0):
    sudo ip addr flush dev eth0
    sudo ip addr add 192.168.99.2/24 dev eth0
    sudo ip link set eth0 up
#>
param(
  [string]$InterfaceAlias = "",
  [string]$LocalIp = "192.168.99.1",
  [int]$PrefixLength = 24,
  [string]$PeerIp = "192.168.99.2"
)

$ErrorActionPreference = "Stop"

function Resolve-UsbEthernetAlias {
  if ($InterfaceAlias) { return $InterfaceAlias }
  $candidates = Get-NetAdapter | Where-Object {
    $_.Status -eq "Up" -and (
      $_.InterfaceDescription -match "ASIX|USB.*Fast Ethernet|USB.*Gigabit|RNDIS|CDC Ethernet|Ethernet.*USB"
    )
  }
  if ($candidates.Count -eq 0) {
    throw "No active USB/RNDIS Ethernet adapter found. Plug in the adapter, wait for link, or pass -InterfaceAlias (see Get-NetAdapter)."
  }
  if ($candidates.Count -gt 1) {
    $candidates | Format-Table Name, InterfaceDescription, LinkSpeed
    throw "Multiple USB-style adapters are up. Pass -InterfaceAlias explicitly."
  }
  return $candidates[0].Name
}

$alias = Resolve-UsbEthernetAlias
Write-Host "Using interface: $alias"

if ($PrefixLength -ne 24) {
  throw "This script only supports /24 for now; use PrefixLength 24 or edit netmask mapping."
}

$mask = "255.255.255.0"
Get-NetIPAddress -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Remove-NetIPAddress -Confirm:$false

# netsh is more reliable than cmdlets on some USB NIC drivers (see: netsh interface ip set address /?)
& netsh interface ip set address "$alias" static $LocalIp $mask
if ($LASTEXITCODE -ne 0) {
  throw "netsh failed (exit $LASTEXITCODE). Run this script as Administrator."
}

try {
  Set-NetConnectionProfile -InterfaceAlias $alias -NetworkCategory Private
  Write-Host "Set network category to Private for $alias"
} catch {
  Write-Warning "Could not set profile to Private (policy or other): $_"
}

# Inbound ICMP echo from peer (optional; helps if server pings this laptop)
$ruleName = "BabyGPT USB-direct ICMP from $PeerIp"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -RemoteAddress $PeerIp `
    -Protocol ICMPv4 -IcmpType 8 -Action Allow | Out-Null
  Write-Host "Firewall: allowed inbound ping from $PeerIp"
}

Write-Host ""
Write-Host "This PC is $LocalIp/$PrefixLength on $alias"
Write-Host "Set the SERVER to $PeerIp/$PrefixLength on the cable-connected NIC, then test:"
Write-Host "  ping $PeerIp"
Write-Host ""

$ping = Test-Connection -ComputerName $PeerIp -Count 2 -Quiet -ErrorAction SilentlyContinue
if ($ping) {
  Write-Host "OK: $PeerIp responded to ping. Try: ssh user@$PeerIp"
} else {
  Write-Host "No reply from $PeerIp yet — configure the peer IP on the server, then ping again."
}
