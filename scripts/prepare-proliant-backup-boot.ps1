# Backup boot path for ProLiant when Ubuntu 24.04 USB loops at GRUB or resets.
# Downloads Ubuntu 22.04.5 LTS Server (older kernel; often behaves better on Gen8-class UEFI),
# re-stages the BabyGPT kit, opens Rufus. In Rufus use GPT + UEFI (non-CSM) if the server is UEFI.
#
# Usage (from repo root):
#   .\scripts\prepare-proliant-backup-boot.ps1
#   .\scripts\prepare-proliant-backup-boot.ps1 -SkipRufus   # only download + stage, no Rufus
param(
  [switch]$SkipRufus,
  [switch]$SkipArchive
)

$ErrorActionPreference = "Stop"
$BackupIsoUrl = "https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso"
$BackupIsoName = "ubuntu-22.04-live-server-amd64.iso"

$splat = @{
  DownloadIso           = $true
  SkipDownloadConfirm   = $true
  ForceIso              = $true
  IsoUrl                = $BackupIsoUrl
  IsoFileName           = $BackupIsoName
}
if ($SkipRufus) { $splat.SkipRufus = $true }
if ($SkipArchive) { $splat.SkipArchive = $true }

Write-Host ""
Write-Host "=== Backup boot: Ubuntu 22.04.5 LTS Server ISO ===" -ForegroundColor Cyan
Write-Host "After Rufus: Partition scheme GPT, Target system UEFI (match your BIOS mode)."
Write-Host ""
& (Join-Path $PSScriptRoot "prepare-proliant-babygpt.ps1") @splat
