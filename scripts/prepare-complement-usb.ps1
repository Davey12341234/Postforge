# Wipe and format a SPARE USB, then copy only babygpt-server-kit (no standalone) for use alongside the OS USB.
# Run on Windows from repo root, with the spare stick plugged into THIS PC (not only the server).
# Requires: Administrator PowerShell (formatting).
#
#   .\scripts\prepare-complement-usb.ps1 -DriveLetter E
#
# After format, run proliant:stage first if staging is stale:
#   npm run proliant:stage
#   .\scripts\prepare-complement-usb.ps1 -DriveLetter E
param(
  [Parameter(Mandatory = $true)]
  [string]$DriveLetter,
  [switch]$SkipFormat
)

$ErrorActionPreference = "Stop"
$DriveLetter = $DriveLetter.TrimEnd(":").ToUpperInvariant()
$Root = "${DriveLetter}:\"
if (-not (Test-Path $Root)) {
  Write-Error "Drive not found: $Root. Plug the spare USB into this PC."
}

$vol = Get-Volume -DriveLetter $DriveLetter -ErrorAction Stop
if ($vol.DriveType -ne 'Removable') {
  Write-Error "Refusing to format: ${DriveLetter}: is not Removable (DriveType=$($vol.DriveType))."
}

Write-Host ""
Write-Host "ABOUT TO ERASE ${DriveLetter}: ($([math]::Round($vol.Size/1GB,2)) GB) Label was: $($vol.FileSystemLabel)" -ForegroundColor Yellow
Write-Host "Unplug the OS/installer USB if it is also ${DriveLetter}: — only the SPARE complement stick should be this letter." -ForegroundColor Yellow
$ok = Read-Host "Type ERASE and press Enter to continue"
if ($ok -ne 'ERASE') {
  Write-Host "Aborted."
  exit 0
}

if (-not $SkipFormat) {
  Write-Host "Formatting ${DriveLetter}: as exFAT (Windows + Ubuntu read/write)..." -ForegroundColor Cyan
  Format-Volume -DriveLetter $DriveLetter -FileSystem exFAT -NewFileSystemLabel "BABYGPT-KIT" -Confirm:$false
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot
Write-Host "Staging kit (npm run proliant:stage)..." -ForegroundColor Cyan
npm run proliant:stage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Copying babygpt-server-kit only (no standalone)..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "full-usb-deploy.ps1") -DriveLetter $DriveLetter -SkipStandalone

$note = @"
Complement USB (formatted on Windows)
- Contains babygpt-server-kit + USB-START-HERE (no full babygpt-standalone folder).
- On the Ubuntu server: plug in, then:
    lsblk
    sudo mkdir -p /mnt/kit && sudo mount /dev/sdX1 /mnt/kit
    cd /mnt/kit/babygpt-server-kit
    sudo bash bootstrap.sh ./babygpt-src.zip
  (Replace sdX1 with the device shown for this stick.)
"@
Set-Content -Path (Join-Path $Root "HOW-TO-USE-ON-SERVER.txt") -Value $note -Encoding UTF8
Write-Host "Done. Label: BABYGPT-KIT  Path: $Root" -ForegroundColor Green
