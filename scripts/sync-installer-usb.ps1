# Build + stage + full-usb-deploy onto the installer USB (single-USB workflow).
# Run from repo root. Uses -ExecutionPolicy Bypass when invoked via npm.
#
#   npm run proliant:usb-sync:e          # from repo root — build + stage + deploy to E:
#   .\scripts\sync-installer-usb.ps1 -DriveLetter E
#   .\scripts\sync-installer-usb.ps1   # uses first removable drive letter (if exactly one)
#
param(
  [string]$DriveLetter = "",
  [switch]$SkipStandalone
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

if (-not $DriveLetter) {
  if ($env:BBGPT_USB_LETTER) { $DriveLetter = $env:BBGPT_USB_LETTER.TrimEnd(":") }
  elseif ($env:BABYGPT_USB_LETTER) { $DriveLetter = $env:BABYGPT_USB_LETTER.TrimEnd(":") }
}
if (
  $env:BBGPT_USB_SKIP_STANDALONE -match '^(1|true|yes)$' -or
  $env:BABYGPT_USB_SKIP_STANDALONE -match '^(1|true|yes)$'
) {
  $SkipStandalone = $true
}

if (-not $DriveLetter) {
  $rem = @(Get-Volume | Where-Object { $_.DriveType -eq "Removable" -and $_.DriveLetter })
  if ($rem.Count -eq 0) {
    Write-Error "No removable drive found. Set BBGPT_USB_LETTER=E or pass -DriveLetter E."
  }
  if ($rem.Count -gt 1) {
    Write-Error "Multiple removable drives: set BBGPT_USB_LETTER or pass -DriveLetter. Found: $($rem.DriveLetter -join ', ')"
  }
  $DriveLetter = [string]$rem[0].DriveLetter
  Write-Host "Using removable drive ${DriveLetter}: (only one detected)." -ForegroundColor Cyan
}

Write-Host "npm run build ..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "npm run proliant:stage ..." -ForegroundColor Cyan
npm run proliant:stage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$splat = @{ DriveLetter = $DriveLetter }
if ($SkipStandalone) { $splat.SkipStandalone = $true }
& (Join-Path $PSScriptRoot "full-usb-deploy.ps1") @splat
Write-Host "USB sync complete (${DriveLetter}:)." -ForegroundColor Green
