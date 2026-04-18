# One-shot: refresh staging + autoinstall seed (optional) + copy kit to USB + write START files on the stick.
#
# From repo root:
#   .\scripts\usb-forward-all.ps1 -DriveLetter E
#   .\scripts\usb-forward-all.ps1                    # if exactly one USB is plugged in
#
# Does NOT run "npm run verify" or "npm run build" by default (fast). Add -Full for verify + standalone copy.
#
# If no USB is visible (e.g. remote agent), writes to repo\usb-forward-output — copy that folder to the stick.
param(
  [string] $DriveLetter = "",

  [string] $OutputFolder = "",

  [switch] $NoAutoinstallSeed,

  [switch] $Full
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$useRootPath = $false
$Root = ""

if ($OutputFolder -ne "") {
  $useRootPath = $true
  $Root = (New-Item -ItemType Directory -Force -Path $OutputFolder).FullName.TrimEnd('\') + "\"
  Write-Host ('=== BabyGPT USB forward (folder: ' + $Root + ') ===') -ForegroundColor Cyan
}
elseif ($DriveLetter -ne "") {
  $DriveLetter = $DriveLetter.TrimEnd(":").ToUpperInvariant()
  $Root = "${DriveLetter}:\"
  if (-not (Test-Path $Root)) {
    Write-Error "Drive not found: $Root"
  }
  Write-Host ('=== BabyGPT USB forward (drive ' + $DriveLetter + ':) ===') -ForegroundColor Cyan
}
else {
  $rem = @(Get-Volume | Where-Object { $_.DriveType -eq "Removable" -and $_.DriveLetter -and $_.Size -gt 1GB })
  if ($rem.Count -eq 1) {
    $DriveLetter = [string]$rem[0].DriveLetter
    $Root = "${DriveLetter}:\"
    Write-Host ('=== BabyGPT USB forward (drive ' + $DriveLetter + ':) ===') -ForegroundColor Cyan
  }
  elseif ($rem.Count -gt 1) {
    $names = ($rem | ForEach-Object { $_.DriveLetter }) -join ", "
    Write-Error "Multiple USB drives: $names. Use -DriveLetter X or -OutputFolder path."
  }
  else {
    $useRootPath = $true
    $fallback = Join-Path $RepoRoot 'usb-forward-output'
    $Root = (New-Item -ItemType Directory -Force -Path $fallback).FullName.TrimEnd('\') + "\"
    Write-Warning ('No USB detected - wrote bundle to: ' + $Root)
    Write-Warning 'Copy everything inside that folder to the ROOT of your flashed Ubuntu USB (or re-run with the stick plugged in).'
  }
}

if ($Full) {
  Write-Host 'npm run verify ...' -ForegroundColor Yellow
  npm run verify
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host 'Skipping repo verify (-Full to run npm run verify).' -ForegroundColor DarkYellow
}

Write-Host 'npm run proliant:stage ...' -ForegroundColor Cyan
npm run proliant:stage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$candidates = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*'
} | Sort-Object -Property InterfaceMetric
$lanIp = ($candidates | Where-Object { $_.IPAddress -match '^(10\.|192\.168\.)' } | Select-Object -First 1).IPAddress
if (-not $lanIp) {
  $lanIp = ($candidates | Select-Object -First 1).IPAddress
}

$seedPort = 8080
$grubLine = 'autoinstall ds=nocloud-net\;s=http://' + $lanIp + ':' + $seedPort + '/'
$linuxPw = $null

if (-not $NoAutoinstallSeed) {
  $linuxPw = 'Bgpt' + [string](Get-Random -Minimum 10000000 -Maximum 99999999) + 'Za!'
  Write-Host ('prepare-autoinstall-seed.ps1 (LAN IP ' + $lanIp + ') ...') -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'prepare-autoinstall-seed.ps1') -SeedingPcIp $lanIp -Port $seedPort -AdminPassword $linuxPw
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host 'full-usb-deploy ...' -ForegroundColor Cyan
if ($useRootPath) {
  if ($Full) {
    Write-Error '-Full with -RootPath is not supported; use a drive letter for standalone copy.'
  }
  & (Join-Path $PSScriptRoot 'full-usb-deploy.ps1') -RootPath $Root.TrimEnd('\') -SkipStandalone
} else {
  if ($Full) {
    & (Join-Path $PSScriptRoot 'full-usb-deploy.ps1') -DriveLetter $DriveLetter
  } else {
    & (Join-Path $PSScriptRoot 'full-usb-deploy.ps1') -DriveLetter $DriveLetter -SkipStandalone
  }
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($NoAutoinstallSeed) {
  $seedBlock = @'
AUTOINSTALL seed was skipped (-NoAutoinstallSeed).
To generate it later on the PC:
  .\scripts\prepare-autoinstall-seed.ps1 -SeedingPcIp YOUR_PC_IP -AdminPassword YOUR_PASSWORD -RefreshStaging
  npm run proliant:serve-seed
'@
} else {
  $pwShow = if ($linuxPw) { $linuxPw } else { '(unknown)' }
  $seedBlock = @'
AUTOINSTALL (recommended - less typing on the server)
====================================================
On THIS Windows PC (keep repo folder open):
  1)  npm run proliant:serve-seed
      Leave that window OPEN while the server installs.

  2)  Server Ethernet = same router / Wi-Fi LAN as this PC.

  3)  Boot this USB on the ProLiant. At GRUB press E, find the linux kernel line,
      add a SPACE and this entire line, then Ctrl+X:

'@ + [Environment]::NewLine + '      ' + $grubLine + [Environment]::NewLine + [Environment]::NewLine + @'
  4)  After install, SSH:  ssh ubuntu@SERVER_IP
      Password for user ubuntu:
'@ + '  ' + $pwShow + [Environment]::NewLine + '      Change password after login: passwd' + [Environment]::NewLine
}

$destLabel = if ($useRootPath) { 'folder: ' + $Root } else { 'drive ' + $DriveLetter + ':' }
$written = Get-Date -Format 'yyyy-MM-dd HH:mm'
$start = @(
  ('BabyGPT - bundle ready - ' + $destLabel),
  "",
  $seedBlock,
  "",
  'INTERACTIVE INSTALL (if you do not use autoinstall)',
  '===================================================',
  'Boot this USB, install Ubuntu, enable OpenSSH, reboot.',
  'Then on the server, open folder babygpt-server-kit (on this stick or copy to home) and run:',
  "",
  '  chmod +x bring-online.sh bootstrap.sh',
  '  sudo bash bring-online.sh ./babygpt-src.zip',
  "",
  'Then in a browser:  http://SERVER_IP:3000',
  "",
  ('This PC LAN IP used for seed: ' + $lanIp),
  ('Written: ' + $written)
) -join [Environment]::NewLine

Set-Content -LiteralPath (Join-Path $Root 'START-BABYGPT.txt') -Value $start -Encoding UTF8

if ($linuxPw) {
  $pwonly = 'SAVE THIS - Ubuntu user ubuntu password (autoinstall):' + [Environment]::NewLine + $linuxPw
  Set-Content -LiteralPath (Join-Path $Root 'SEED-PASSWORD.txt') -Value $pwonly -Encoding UTF8
}

Write-Host ""
Write-Host ('Done. Open ' + $Root + 'START-BABYGPT.txt') -ForegroundColor Green
if ($linuxPw) {
  Write-Host ('Password for ubuntu (see SEED-PASSWORD.txt on USB): ' + $linuxPw) -ForegroundColor Yellow
}
Write-Host ""
Write-Host 'Next on PC before booting the server: npm run proliant:serve-seed' -ForegroundColor Cyan
