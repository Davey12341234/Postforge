# Open Rufus as Administrator with the official Ubuntu 22.04 Server ISO (RUNBOOK path).
# You must approve UAC, pick the correct USB/SD device, then click START in Rufus.
param(
  [string]$IsoPath = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $IsoPath) {
  $IsoPath = Join-Path $RepoRoot "deploy\proliant\staging\ubuntu-22.04-live-server-amd64.iso"
}
if (-not (Test-Path -LiteralPath $IsoPath)) {
  Write-Error "ISO not found: $IsoPath`nRun: npm run proliant:prepare-official-download"
}

$rufus = Get-Command rufus -ErrorAction SilentlyContinue
if (-not $rufus) {
  Write-Error "Rufus not on PATH. Install: winget install Rufus.Rufus -e"
}

Write-Host "ISO:  $IsoPath" -ForegroundColor Cyan
Write-Host "Rufus: $($rufus.Source)" -ForegroundColor Cyan
Write-Host "Opening Rufus (UAC). In Rufus: Device = your installer USB/SD (>=8 GB), NOT your Windows disk. GPT + UEFI per deploy/proliant/RUNBOOK.md" -ForegroundColor Yellow
Start-Process -FilePath $rufus.Source -Verb RunAs -ArgumentList @("-g", "-i", $IsoPath)
