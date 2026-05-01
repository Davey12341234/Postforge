# Check that a thumb drive looks like a Windows install USB (what the ProLiant boots),
# not just a data stick with an .iso or the PC-side flash script.
#
# Usage:
#   .\scripts\verify-windows-installer-usb.ps1
#   .\scripts\verify-windows-installer-usb.ps1 -DriveLetter E
param(
  [string]$DriveLetter = ""
)

$ErrorActionPreference = "Stop"

function Test-WinUsb([string]$Letter) {
  $L = $Letter.TrimEnd(':').ToUpperInvariant() + ":"
  $root = $L + "\"
  if (-not (Test-Path -LiteralPath $root)) {
    return @{ Ok = $false; Reason = "Drive $L not found." }
  }
  $setup = Join-Path $root "sources\setup.exe"
  $wim = Join-Path $root "sources\install.wim"
  $esd = Join-Path $root "sources\install.esd"
  $hasSetup = Test-Path -LiteralPath $setup
  $hasImage = (Test-Path -LiteralPath $wim) -or (Test-Path -LiteralPath $esd)
  $efi = Test-Path -LiteralPath (Join-Path $root "EFI\Boot\bootx64.efi")
  $bootmgr = Test-Path -LiteralPath (Join-Path $root "bootmgr")

  $markers = @()
  if ($hasSetup) { $markers += "sources\setup.exe" }
  if (Test-Path -LiteralPath $wim) { $markers += "sources\install.wim" }
  if (Test-Path -LiteralPath $esd) { $markers += "sources\install.esd" }
  if ($efi) { $markers += "EFI\Boot\bootx64.efi" }
  if ($bootmgr) { $markers += "bootmgr" }

  $extras = @()
  if (Get-ChildItem -LiteralPath $root -Filter "*.iso" -File -ErrorAction SilentlyContinue) {
    $extras += "Has .iso on root (OK for storage; server still needs a *flashed* installer for boot)"
  }
  if (Test-Path -LiteralPath (Join-Path $root "rufus.exe")) { $extras += "rufus.exe present" }
  if (Test-Path -LiteralPath (Join-Path $root "boot\grub")) { $extras += "boot\grub present (typical of Ubuntu, not Windows install USB)" }

  if ($hasSetup -and $hasImage) {
    return @{ Ok = $true; Reason = "Windows installer USB layout OK."; Markers = $markers; Extras = $extras; Letter = $L }
  }
  if (-not $hasSetup -and $efi -and (Test-Path -LiteralPath (Join-Path $root "boot\grub"))) {
    return @{ Ok = $false; Reason = "Looks like a Linux/Ubuntu installer stick, not a flashed Windows USB."; Markers = $markers; Extras = $extras; Letter = $L }
  }
  if (-not $hasSetup) {
    return @{ Ok = $false; Reason = "Missing sources\setup.exe (not a normal Windows install USB)."; Markers = $markers; Extras = $extras; Letter = $L }
  }
  return @{ Ok = $false; Reason = "Missing sources\install.wim or install.esd."; Markers = $markers; Extras = $extras; Letter = $L }
}

$targets = @()
if ($DriveLetter) {
  $targets = @($DriveLetter)
} else {
  $rem = @(Get-Volume | Where-Object { $_.DriveType -eq "Removable" -and $_.DriveLetter })
  foreach ($v in $rem) {
    $targets += $v.DriveLetter.ToString()
  }
}

if ($targets.Count -eq 0) {
  Write-Host "No removable drive with a letter found. Plug the USB, wait, then retry (or use -DriveLetter E)." -ForegroundColor Red
  exit 2
}

$anyOk = $false
foreach ($t in $targets) {
  $r = Test-WinUsb $t
  Write-Host ""
  Write-Host "=== $($r.Letter) ===" -ForegroundColor Cyan
  Write-Host "Markers: $($r.Markers -join ', ')"
  if ($r.Extras.Count) { Write-Host "Notes:   $($r.Extras -join '; ')" }
  if ($r.Ok) {
    Write-Host "PASS: $($r.Reason)" -ForegroundColor Green
    $anyOk = $true
  } else {
    Write-Host "FAIL: $($r.Reason)" -ForegroundColor Yellow
  }
}

Write-Host ""
if (-not $anyOk) {
  Write-Host "To fix: on a Windows PC with Rufus, write your Windows .iso TO the stick (Flash), then run this script again." -ForegroundColor DarkGray
  exit 1
}
exit 0
