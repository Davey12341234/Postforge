# Opens Rufus with an optional ISO pre-selected. Requires UAC (USB writing needs admin).
# For Ubuntu + BabyGPT staging (ISO download, source zip, bootstrap): see prepare-proliant-babygpt.ps1
# Usage:
#   .\prepare-server-install-usb.ps1
#   .\prepare-server-install-usb.ps1 -IsoPath "C:\Users\you\Downloads\ubuntu-24.04-live-server-amd64.iso"
param(
  [string]$IsoPath = ""
)

$rufus = Get-Command rufus -ErrorAction SilentlyContinue
if (-not $rufus) {
  Write-Error "Rufus not found. Install with: winget install Rufus.Rufus -e"
  exit 1
}

$exe = $rufus.Source
$args = @("-g")
if ($IsoPath) {
  if (-not (Test-Path -LiteralPath $IsoPath)) {
    Write-Error "ISO not found: $IsoPath"
    exit 1
  }
  $args += "-i", $IsoPath
}

Write-Host "Starting Rufus (approve UAC). Then:"
Write-Host "  Device: your USB (label HIVE, large disk - VERIFY correct drive!)"
Write-Host "  Boot selection: Disk or ISO image - pick your ISO if not loaded"
Write-Host "  Image option: GPT + UEFI typical for DL360p Gen8"
Write-Host "  START - wait until done - Eject safely."
Start-Process -FilePath $exe -Verb RunAs -ArgumentList $args
