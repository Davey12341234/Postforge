#requires -Version 5.1
<#
.SYNOPSIS
  Push deploy/proliant/staging to an Ubuntu server and run bring-online.sh (non-interactive on the server).

.DESCRIPTION
  Requires OpenSSH client (ssh, scp) on PATH — Windows 10+ usually has it.
  For zero password prompts, add your public key to the server: ssh-copy-id user@host

.PARAMETER Server
  Hostname or IP of the Ubuntu server.

.PARAMETER User
  SSH user (default: ubuntu).

.PARAMETER EnvFile
  Optional path to a local .env file to install as /opt/babygpt/.env (API keys, etc.).

.PARAMETER RefreshStaging
  Run prepare-proliant-babygpt.ps1 -SkipRufus first so babygpt-src.zip matches current git HEAD.

.PARAMETER BatchMode
  If true (default), ssh uses BatchMode=yes — fails if key-based auth is not set up.

.EXAMPLE
  .\scripts\deploy-babygpt-to-server.ps1 -Server 192.168.1.50

.EXAMPLE
  .\scripts\deploy-babygpt-to-server.ps1 -Server 192.168.1.50 -EnvFile .\.env.production.local -RefreshStaging
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Server,

  [string] $User = "ubuntu",

  [string] $EnvFile = "",

  [switch] $RefreshStaging,

  [bool] $BatchMode = $true
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Staging = Join-Path $RepoRoot "deploy\proliant\staging"
$BringOnline = Join-Path $Staging "bring-online.sh"

if (-not (Test-Path -LiteralPath $Staging)) {
  throw "Staging folder not found: $Staging - run: npm run proliant:stage"
}

if ($RefreshStaging) {
  & (Join-Path $RepoRoot "scripts\prepare-proliant-babygpt.ps1") -SkipRufus
}

if (-not (Test-Path -LiteralPath (Join-Path $Staging "babygpt-src.zip"))) {
  throw "babygpt-src.zip missing in staging - run: npm run proliant:stage"
}
if (-not (Test-Path -LiteralPath $BringOnline)) {
  throw "bring-online.sh missing - pull latest repo or copy deploy/proliant/bring-online.sh into staging."
}

$remoteKit = "babygpt-kit"
$provisionPath = "/home/$User/$remoteKit/.env.provision"
$sshOpts = @()
if ($BatchMode) {
  $sshOpts += "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"
}

# Copy only the install kit (same set as full-usb-deploy.ps1), not the multi-GB Ubuntu .iso in staging.
$kitNames = @(
  "babygpt-src.zip",
  "bootstrap.sh",
  "bring-online.sh",
  "babygpt.service",
  "README.md"
)

Write-Host "Uploading kit files to ${User}@${Server}:~/$remoteKit ..."
& ssh @sshOpts "${User}@${Server}" "rm -rf ~/$remoteKit && mkdir -p ~/$remoteKit"
foreach ($name in $kitNames) {
  $p = Join-Path $Staging $name
  if (-not (Test-Path -LiteralPath $p)) {
    throw "Missing required kit file: $p - run: npm run proliant:stage"
  }
  & scp @sshOpts $p "${User}@${Server}:~/$remoteKit/"
}

$envPair = ""
if ($EnvFile -ne "") {
  $envFull = Resolve-Path -LiteralPath $EnvFile
  Write-Host "Uploading env file..."
  & scp @sshOpts $envFull "${User}@${Server}:~/$remoteKit/.env.provision"
  $envPair = "BABYGPT_ENV_FILE=$provisionPath "
}

$remoteCmd = @"
set -euo pipefail
cd ~/$remoteKit
chmod +x bring-online.sh bootstrap.sh
sudo env DEBIAN_FRONTEND=noninteractive ${envPair}bash ./bring-online.sh ./babygpt-src.zip
echo OK
# Next.js may take a moment to listen after systemctl restart
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then break; fi
  sleep 1
done
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/ || true
systemctl is-active --quiet babygpt && echo 'systemd: babygpt active' || echo 'systemd: babygpt not active'
"@

Write-Host "Running bring-online.sh on server (sudo on server)..."
$sshArgs = $sshOpts + "${User}@${Server}" + $remoteCmd
& ssh @sshArgs

$hostOut = & ssh @sshOpts "${User}@${Server}" "hostname -I | awk '{print `$1}'"
$ip = ($hostOut -split '\s+')[0].Trim()
Write-Host ""
Write-Host "Done. From your LAN open: http://${ip}:3000"
Write-Host "Logs on server: ssh ${User}@${Server} -- journalctl -u babygpt -f"
