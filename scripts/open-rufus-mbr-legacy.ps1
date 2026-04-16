# Opens Rufus with the Ubuntu 22.04 Server ISO selected. YOU must set MBR + BIOS/CSM and click START.
# Run from repo root (elevated prompt recommended - Rufus needs admin to flash).
# After Rufus finishes:  npm run build ; .\scripts\full-usb-deploy.ps1 -DriveLetter <USB letter>

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Iso = Join-Path $RepoRoot "deploy\proliant\staging\ubuntu-22.04-live-server-amd64.iso"

if (-not (Test-Path -LiteralPath $Iso)) {
  Write-Error "ISO not found: $Iso`nRun: .\scripts\prepare-official-proliant-path.ps1 -SkipArchive (or -SkipRufus) first."
}

$rufus = Get-Command rufus -ErrorAction SilentlyContinue
if (-not $rufus) {
  Write-Error "Rufus not on PATH. Install: winget install Rufus.Rufus -e"
}
$exe = $rufus.Source

Write-Host ""
Write-Host "=== Rufus will open with the ISO loaded ===" -ForegroundColor Cyan
Write-Host "ISO: $Iso"
Write-Host ""
Write-Host "In Rufus, set EXACTLY (Gen8 legacy USB boot):" -ForegroundColor Yellow
Write-Host "  Device:     YOUR USB stick (check drive letter and size - NOT C:)"
Write-Host "  Partition scheme:  MBR"
Write-Host "  Target system:     BIOS or UEFI-CSM   (NOT UEFI-only / non-CSM)"
Write-Host "  Then click START and wait until done."
Write-Host ""
Write-Host "After flashing, restore BabyGPT files:" -ForegroundColor Green
Write-Host "  cd $RepoRoot"
Write-Host "  npm run build"
Write-Host "  .\scripts\full-usb-deploy.ps1 -DriveLetter E"
Write-Host "  (use the USB drive letter shown in File Explorer)"
Write-Host ""

# -g GUI, -i preselect ISO (Rufus 3.x+)
Start-Process -FilePath $exe -ArgumentList @("-g", "-i", $Iso) -Verb RunAs
