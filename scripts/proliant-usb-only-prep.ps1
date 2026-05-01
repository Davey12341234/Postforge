# Full prep for "no internal/NVMe yet": Ubuntu installer + BabyGPT on USB stick(s).
# NVMe can be added later; P420i RAID is irrelevant until you have bay disks.
#
# From repo root (Administrator optional unless you format elsewhere):
#   .\scripts\proliant-usb-only-prep.ps1
#   .\scripts\proliant-usb-only-prep.ps1 -DriveLetters @('D','E')
#   .\scripts\proliant-usb-only-prep.ps1 -LaunchRufus   # opens Rufus with 22.04 ISO after deploy
param(
  [string[]]$DriveLetters = @(),
  [switch]$LaunchRufus,
  [switch]$SkipStandalone
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

if ($DriveLetters.Count -eq 0) {
  $rem = @(Get-Volume | Where-Object { $_.DriveType -eq "Removable" -and $_.DriveLetter -and $_.Size -gt 1GB })
  if ($rem.Count -eq 0) {
    Write-Error "No USB detected. Plug in the stick(s), or pass -DriveLetters D,E"
  }
  $DriveLetters = foreach ($v in $rem) { [string]$v.DriveLetter }
  Write-Host "Detected removable: $($DriveLetters -join ', ')" -ForegroundColor Cyan
}

$okLetters = [System.Collections.Generic.List[string]]::new()
foreach ($L in $DriveLetters) {
  $x = $L.TrimEnd(":").ToUpperInvariant()
  if (Test-Path "${x}:\") {
    [void]$okLetters.Add($x)
  } else {
    Write-Warning "Skipping ${x}: (not accessible - reseat USB or wrong letter)."
  }
}
$DriveLetters = @($okLetters)
if ($DriveLetters.Count -eq 0) {
  Write-Error "No accessible removable paths. Plug USB and retry."
}

Write-Host "npm run verify ..." -ForegroundColor Cyan
npm run verify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "npm run proliant:prepare-official-download ..." -ForegroundColor Cyan
npm run proliant:prepare-official-download
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

foreach ($L in $DriveLetters) {
  $L = $L.TrimEnd(":").ToUpperInvariant()
  $splat = @{ DriveLetter = $L }
  if ($SkipStandalone) { $splat.SkipStandalone = $true }
  Write-Host "full-usb-deploy -> ${L}: ..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "full-usb-deploy.ps1") @splat
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & (Join-Path $PSScriptRoot "verify-proliant-usb-deploy.ps1") -DriveLetter $L
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $next = @"
BabyGPT - USB-only system (no NVMe / no RAID disks required yet)

1) ProLiant: one-time boot -> USB drive key (not NIC). One USB in the slot until it boots.
2) Ubuntu installer: Guided -> use entire disk -> pick THIS USB only -> finish install + OpenSSH.
3) Ignore P420i 'no drives' for NVMe in PCIe - optional later. Install to USB only.
4) After first login: cd to babygpt-server-kit on this stick (mount path varies), then:
     chmod +x bootstrap.sh; sudo bash bootstrap.sh ./babygpt-src.zip
5) Re-copy kit after any Rufus re-flash: npm run proliant:quick-usb (from Windows repo).

Written: $(Get-Date -Format o)
"@
  Set-Content -LiteralPath "$($L):\NEXT-STEPS-USB-ONLY.txt" -Value $next -Encoding UTF8
}

if ($LaunchRufus) {
  Write-Host "Launching Rufus (UAC) ..." -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot "launch-rufus-ubuntu-installer.ps1")
}

Write-Host "Done." -ForegroundColor Green
