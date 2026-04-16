# Sanity-check a drive after full-usb-deploy (or sync-installer-usb).
# Usage: .\scripts\verify-proliant-usb-deploy.ps1 -DriveLetter E
# Use -AllowKitOnly if you deployed with -SkipStandalone (no babygpt-standalone).
param(
  [Parameter(Mandatory = $true)]
  [string]$DriveLetter,
  [switch]$AllowKitOnly
)

$ErrorActionPreference = "Stop"
$DriveLetter = $DriveLetter.TrimEnd(":").ToUpperInvariant()
$Root = "${DriveLetter}:\"
if (-not (Test-Path $Root)) {
  Write-Error "Drive not found: $Root"
}

$ok = $true
function Write-Check([string]$Path, [string]$Desc) {
  if (Test-Path -LiteralPath $Path) {
    Write-Host "  OK  $Desc" -ForegroundColor Green
    return $true
  }
  Write-Host "  MISSING  $Desc -> $Path" -ForegroundColor Red
  return $false
}

Write-Host "Verifying ${Root} ..." -ForegroundColor Cyan
$kit = Join-Path $Root "babygpt-server-kit"
$standalone = Join-Path $Root "babygpt-standalone"

if (-not (Write-Check (Join-Path $Root "USB-START-HERE.txt") "USB-START-HERE.txt")) { $ok = $false }
if (-not (Write-Check (Join-Path $kit "babygpt-src.zip") "babygpt-src.zip")) { $ok = $false }
if (-not (Write-Check (Join-Path $kit "bootstrap.sh") "bootstrap.sh")) { $ok = $false }
if (-not (Write-Check (Join-Path $kit "babygpt.service") "babygpt.service")) { $ok = $false }
if (-not (Write-Check (Join-Path $kit "RUNBOOK.md") "RUNBOOK.md (in kit)")) { $ok = $false }

if ($AllowKitOnly) {
  if (-not (Test-Path -LiteralPath $standalone)) {
    Write-Host "  OK  babygpt-standalone absent (-AllowKitOnly)" -ForegroundColor Green
  } else {
    Write-Host "  NOTE  babygpt-standalone present (unexpected with -AllowKitOnly)" -ForegroundColor Yellow
  }
} else {
  if (-not (Test-Path -LiteralPath $standalone)) {
    Write-Host "  MISSING  babygpt-standalone folder" -ForegroundColor Red
    $ok = $false
  } else {
    $srv = Get-ChildItem -Path $standalone -Filter "server.js" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($srv) {
      Write-Host "  OK  babygpt-standalone contains server.js" -ForegroundColor Green
    } else {
      Write-Host "  MISSING  server.js under babygpt-standalone" -ForegroundColor Red
      $ok = $false
    }
  }
}

if (-not $ok) {
  Write-Error "Verification failed. Run: npm run proliant:usb-sync:e"
  exit 1
}
Write-Host "Verification passed." -ForegroundColor Green
exit 0
