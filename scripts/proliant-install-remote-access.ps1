#requires -Version 5.1
<#
.SYNOPSIS
  Push remote-access helpers to Ubuntu and run Tailscale or a Cloudflare quick tunnel.

.DESCRIPTION
  Use AFTER the server has Ubuntu + SSH working (same LAN or direct cable).

  - Tailscale: stable 100.x IP for ssh and http://100.x.x.x:3000 from your PC (install Tailscale on Windows too).
  - Cloudflared: temporary https://....trycloudflare.com to port 3000 (BabyGPT must already be running).

  Cursor and other cloud AIs cannot open SSH to your LAN; this is for YOU to reach the box and continue work.

.PARAMETER Mode
  Tailscale | Cloudflared

.PARAMETER TailscaleAuthKey
  Optional tskey-auth-... from https://login.tailscale.com/admin/settings/keys (non-interactive join).

.EXAMPLE
  .\scripts\proliant-install-remote-access.ps1 -Server 192.168.1.50 -Mode Tailscale

.EXAMPLE
  .\scripts\proliant-install-remote-access.ps1 -Server 192.168.1.50 -Mode Cloudflared
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Server,

  [string] $User = "ubuntu",

  [ValidateSet("Tailscale", "Cloudflared")]
  [string] $Mode = "Tailscale",

  [string] $TailscaleAuthKey = "",

  [bool] $BatchMode = $false
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$sshOpts = @("-o", "StrictHostKeyChecking=accept-new")
if ($BatchMode) {
  $sshOpts += "-o", "BatchMode=yes"
}

function Invoke-Tailscale {
  $src = Join-Path $RepoRoot "deploy\proliant\install-tailscale.sh"
  if (-not (Test-Path -LiteralPath $src)) {
    throw "Missing $src"
  }
  Write-Host "Uploading install-tailscale.sh ..."
  & scp @sshOpts $src "${User}@${Server}:~/install-tailscale.sh"
  $inner = "sed -i 's/\r`$//' ~/install-tailscale.sh && chmod +x ~/install-tailscale.sh && "
  if ($TailscaleAuthKey -ne "") {
    $esc = $TailscaleAuthKey.Replace("'", "'\''")
    $inner += "sudo env TAILSCALE_AUTHKEY='${esc}' bash ~/install-tailscale.sh"
  }
  else {
    $inner += "sudo bash ~/install-tailscale.sh"
  }
  & ssh @sshOpts "${User}@${Server}" $inner
}

function Invoke-Cloudflared {
  $src = Join-Path $RepoRoot "deploy\proliant\cloudflared-quick-tunnel.sh"
  if (-not (Test-Path -LiteralPath $src)) {
    throw "Missing $src"
  }
  Write-Host "Uploading cloudflared-quick-tunnel.sh (runs in foreground; Ctrl+C to stop) ..."
  & scp @sshOpts $src "${User}@${Server}:~/cloudflared-quick-tunnel.sh"
  $inner = "sed -i 's/\r`$//' ~/cloudflared-quick-tunnel.sh && chmod +x ~/cloudflared-quick-tunnel.sh && sudo bash ~/cloudflared-quick-tunnel.sh"
  $sshArgs = $sshOpts + @("-t") + "${User}@${Server}" + $inner
  & ssh @sshArgs
}

switch ($Mode) {
  "Tailscale" { Invoke-Tailscale }
  "Cloudflared" { Invoke-Cloudflared }
}

Write-Host ""
Write-Host "Done ($Mode)." -ForegroundColor Green
if ($Mode -eq "Tailscale") {
  Write-Host "On this PC: install Tailscale from https://tailscale.com/download , then: ssh ${User}@<tailscale-ip>"
  Write-Host "BabyGPT: http://<tailscale-ip>:3000"
}
