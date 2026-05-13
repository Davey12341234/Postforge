# Finalize the boot-stub USB in one run: ESP (FAT32 BABYGPTBOOT) + READMEs + verification.
# Run in PowerShell as Administrator (same as fix-bootstub-esp.ps1).
#
#   .\scripts\finish-bootstub-usb.ps1 -DiskNumber 1
#
param(
  [int]$DiskNumber = 1,
  [string]$EspLetter = "T"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Proliant = Join-Path $RepoRoot "deploy\proliant"

& (Join-Path $PSScriptRoot "fix-bootstub-esp.ps1") -DiskNumber $DiskNumber -DriveLetter $EspLetter

$p2 = Get-Partition -DiskNumber $DiskNumber -PartitionNumber 2 -ErrorAction SilentlyContinue
if ($p2 -and $p2.DriveLetter) {
  $dl = [string]$p2.DriveLetter
  $root = "${dl}:\"
  Copy-Item -LiteralPath (Join-Path $Proliant "BOOT-USB-README.txt") -Destination (Join-Path $root "BOOT-USB-README.txt") -Force
  @"
This is partition 2 on the BabyGPT boot-stub USB (large volume, not the EFI partition).
Ubuntu custom install: format as ext4, mount point /boot.
Partition 1 (volume BABYGPTBOOT, often T:) = EFI for /boot/efi.
You may delete this file after install.
"@ | Set-Content -Path (Join-Path $root "READ-ME-PARTITION-2.txt") -Encoding UTF8
  @"
BabyGPT boot-stub — quick server test
1) Plug installer USB + this stick (rear USB ports).
2) F11 → boot UEFI installer USB (not legacy-only).
3) Storage → Custom: NVMe = / (ext4). This USB small partition = EFI for /boot/efi. This USB large = ext4 /boot.
4) Install bootloader to the ESP on this USB. Reboot; remove installer USB; keep this one if firmware needs it.
"@ | Set-Content -Path (Join-Path $root "SERVER-QUICK-TEST.txt") -Encoding UTF8
  Write-Host "Updated ${dl}:\ (README + partition-2 note + SERVER-QUICK-TEST.txt)" -ForegroundColor Green
}

Write-Host ""
& (Join-Path $PSScriptRoot "verify-boot-stub-usb.ps1") -DiskNumber $DiskNumber
Write-Host ""
Write-Host "Safe to eject disk $DiskNumber and test on the ProLiant." -ForegroundColor Cyan
