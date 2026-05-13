# Official ProLiant + BabyGPT prep (canonical path - see deploy/proliant/RUNBOOK.md).
# - Refreshes staging (babygpt-src.zip, bootstrap, systemd unit, README)
# - Ensures Ubuntu 22.04.5 LTS Server ISO in staging (downloads only if missing or corrupt)
# - Launches Rufus with that ISO (unless -SkipRufus)
param(
  [switch]$SkipRufus,
  [switch]$SkipArchive,
  [switch]$RefetchIso
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Staging = Join-Path $RepoRoot "deploy\proliant\staging"
$IsoUrl = "https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso"
$IsoName = "ubuntu-22.04-live-server-amd64.iso"
$IsoPath = Join-Path $Staging $IsoName

Write-Host ""
Write-Host "=== Official ProLiant path (Ubuntu 22.04 + BabyGPT staging) ===" -ForegroundColor Cyan
$Runbook = Join-Path $RepoRoot "deploy\proliant\RUNBOOK.md"
Write-Host "Runbook: $Runbook"
Write-Host ""

$needIso = $RefetchIso
if (-not (Test-Path -LiteralPath $IsoPath)) {
  $needIso = $true
} else {
  $len = (Get-Item -LiteralPath $IsoPath).Length
  if ($len -lt (500 * 1024 * 1024)) {
    Write-Host "ISO too small ($len bytes) - will re-download." -ForegroundColor Yellow
    $needIso = $true
  }
}

$splat = @{
  IsoUrl              = $IsoUrl
  IsoFileName         = $IsoName
  SkipDownloadConfirm = $true
}
if ($needIso) {
  $splat.DownloadIso = $true
  $splat.ForceIso = $RefetchIso
} else {
  Write-Host "Using existing ISO: $IsoPath" -ForegroundColor Green
}
if ($SkipRufus) { $splat.SkipRufus = $true }
if ($SkipArchive) { $splat.SkipArchive = $true }

& (Join-Path $PSScriptRoot "prepare-proliant-babygpt.ps1") @splat

Write-Host ""
Write-Host "Next: open RUNBOOK.md and follow from section 2 (Rufus)." -ForegroundColor Green
Write-Host "  $Runbook"
Write-Host ""
