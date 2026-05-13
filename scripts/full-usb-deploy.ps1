# Copy BabyGPT payloads onto an already-flashed Ubuntu installer USB (or any drive letter).
# Run from repo root AFTER: npm run build
#   .\scripts\full-usb-deploy.ps1 -DriveLetter E
# Or copy to a folder (e.g. CI / no USB visible):
#   .\scripts\full-usb-deploy.ps1 -RootPath .\usb-forward-output -SkipStandalone
#
# Does NOT run Rufus — flash the ISO first (see deploy/proliant/RUNBOOK.md §2).
# Copies only the small server kit files from staging (NOT the Ubuntu .iso — that stays on the PC for Rufus).
param(
  [string]$DriveLetter = "",
  [string]$RootPath = "",
  [switch]$SkipStandalone
)

$ErrorActionPreference = "Stop"

if ($RootPath -ne "") {
  if (-not $SkipStandalone) {
    Write-Error "-RootPath is only supported together with -SkipStandalone (folder copy is kit-only)."
  }
  $resolved = New-Item -ItemType Directory -Force -Path $RootPath
  $Root = $resolved.FullName.TrimEnd('\') + "\"
  $DriveLetter = "folder"
} elseif ($DriveLetter -ne "") {
  $DriveLetter = $DriveLetter.TrimEnd(":").ToUpperInvariant()
  $Root = "${DriveLetter}:\"
  if (-not (Test-Path $Root)) {
    Write-Error "Drive not found: $Root. Plug in the USB and use the correct letter (File Explorer)."
  }
} else {
  Write-Error "Specify -DriveLetter E or -RootPath C:\path\to\folder"
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Staging = Join-Path $RepoRoot "deploy\proliant\staging"

if (-not $SkipStandalone -and -not (Test-Path (Join-Path $RepoRoot ".next\standalone"))) {
  Write-Error "Missing .next\standalone. Run: npm run build (or use -SkipStandalone to copy only babygpt-server-kit)"
}

if (-not $SkipStandalone) {
  Write-Host "Copying standalone app -> ${Root}babygpt-standalone ..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "export-standalone-to-usb.ps1") -DriveLetter $DriveLetter
} else {
  Write-Host "Skipping babygpt-standalone (-SkipStandalone)." -ForegroundColor Yellow
}

$kit = Join-Path $Root "babygpt-server-kit"
if (Test-Path $kit) {
  Remove-Item -LiteralPath $kit -Recurse -Force
}
New-Item -ItemType Directory -Path $kit | Out-Null
Write-Host "Copying server kit -> $kit ..." -ForegroundColor Cyan
$kitNames = @("babygpt-src.zip", "bootstrap.sh", "bring-online.sh", "babygpt.service", "README.md")
foreach ($name in $kitNames) {
  $src = Join-Path $Staging $name
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $kit $name) -Force
  }
}
Get-ChildItem -LiteralPath $Staging -File -ErrorAction SilentlyContinue | Where-Object {
  $_.Extension -in @(".yaml", ".yml", ".example") -or $_.Name -like "meta-data*"
} | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $kit $_.Name) -Force
}
Copy-Item -Path (Join-Path $RepoRoot "deploy\proliant\RUNBOOK.md") -Destination $kit -Force
Copy-Item -Path (Join-Path $RepoRoot "deploy\proliant\HANDOFF-DL360P-G8-STORAGE-BOOT.md") -Destination $kit -Force
$legacyTxt = Join-Path $RepoRoot "deploy\proliant\RUFUS-GEN8-LEGACY.txt"
if (Test-Path $legacyTxt) {
  Copy-Item -Path $legacyTxt -Destination $kit -Force
  Copy-Item -Path $legacyTxt -Destination (Join-Path $Root "RUFUS-GEN8-LEGACY.txt") -Force
}

$start = @"
BabyGPT — read this on the USB root

ORDER OF OPERATIONS (Gen8 / F11 USB = legacy path):
1) Flash Ubuntu with Rufus using MBR + BIOS (see RUFUS-GEN8-LEGACY.txt on this drive).
2) Then copy BabyGPT onto the same stick (already done if you ran full-usb-deploy.ps1).

If you used GPT+UEFI in Rufus instead: F11 must use a UEFI: USB line, or set UEFI in F9.

Folders on this drive:
- babygpt-server-kit  = zip + bootstrap + service + README (no Ubuntu ISO here; ISO stays on PC for Rufus)
- babygpt-standalone  = prebuilt Node app (omitted if you used -SkipStandalone)

After Ubuntu on disk:
  sudo bash bootstrap.sh ./babygpt-src.zip   (from kit folder on server)

Pre-built app: $(if ($DriveLetter -eq 'folder') { '(skipped — kit-only folder copy)' } else { "${DriveLetter}:\babygpt-standalone" }) — see README-STANDALONE.txt

Eject safely in Windows before unplugging.
"@
Set-Content -Path (Join-Path $Root "USB-START-HERE.txt") -Value $start -Encoding UTF8

Write-Host ""
Write-Host "Done. Open ${Root}USB-START-HERE.txt" -ForegroundColor Green
