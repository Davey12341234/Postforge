# Repair partition 1 on the boot-stub USB: quick FAT32 + volume name BABYGPTBOOT, copy README.
# Use when Windows shows "The volume does not contain a recognized file system" for the ESP letter
# even though the partition exists (letter assigned to a corrupt/unformatted volume).
#
# MUST run in PowerShell as Administrator (DiskPart).
#
# If you see "running scripts is disabled" when using .\fix-bootstub-esp.ps1:
#   In THIS window only (then run the script again):
#     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#   Or from repo root (no policy change): double-click fix-bootstub-usb.bat (as Administrator)
#   Or: powershell -ExecutionPolicy Bypass -File .\scripts\fix-bootstub-esp.ps1 -DiskNumber 1
#   Or once per user: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
#
# Usage:
#   Get-Disk | ? { $_.BusType -eq 'USB' } | ft Number, FriendlyName, Size
#   .\scripts\fix-bootstub-esp.ps1 -DiskNumber 1
#
param(
  [Parameter(Mandatory = $true)]
  [int]$DiskNumber,
  [string]$DriveLetter = "T",
  [switch]$RemoveSecondPartitionLetter
)

$ErrorActionPreference = "Stop"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Error "Run PowerShell as Administrator (right-click -> Run as administrator), then re-run this script."
}

$DriveLetter = $DriveLetter.TrimEnd(":").ToUpperInvariant()
$disk = Get-Disk -Number $DiskNumber
if ($disk.BusType -ne "USB") {
  Write-Error "Disk $DiskNumber is not USB (BusType=$($disk.BusType)). Refusing."
}

$parts = @(Get-Partition -DiskNumber $DiskNumber | Sort-Object PartitionNumber)
if ($parts.Count -lt 1) {
  Write-Error "No partitions on disk $DiskNumber. Run prepare-boot-stub-usb.ps1 first."
}

Write-Host "Formatting partition 1 on USB disk $DiskNumber as FAT32, label=BABYGPTBOOT, letter=$DriveLetter ..." -ForegroundColor Yellow

$script = @"
select disk $DiskNumber
select partition 1
format quick fs=fat32 label=BABYGPTBOOT
assign letter=$DriveLetter
exit
"@

if ($RemoveSecondPartitionLetter -and $parts.Count -ge 2 -and $parts[1].DriveLetter) {
  $L = $parts[1].DriveLetter
  Write-Host "Removing drive letter $L from partition 2 (RAW) so Explorer stops showing a broken volume." -ForegroundColor Yellow
  $script = @"
select disk $DiskNumber
select partition 1
format quick fs=fat32 label=BABYGPTBOOT
assign letter=$DriveLetter
select partition 2
remove letter=$L
exit
"@
}

$tmp = [System.IO.Path]::GetTempFileName() + ".txt"
Set-Content -Path $tmp -Value $script -Encoding ASCII
try {
  & diskpart.exe /s $tmp
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "diskpart exit code $LASTEXITCODE (output may still show success)."
  }
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}

$mount = "${DriveLetter}:\"
if (-not (Test-Path -LiteralPath $mount)) {
  Write-Error "Drive $DriveLetter did not mount. Check Disk Management or run list volume in diskpart."
}

$vol = Get-Volume -DriveLetter $DriveLetter -ErrorAction SilentlyContinue
if ($vol -and $vol.FileSystemType -ne "FAT32") {
  Write-Warning "Expected FAT32 on ${DriveLetter}:, got $($vol.FileSystemType)"
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReadmeSrc = Join-Path $RepoRoot "deploy\proliant\BOOT-USB-README.txt"
Copy-Item -LiteralPath $ReadmeSrc -Destination (Join-Path $mount "BOOT-USB-README.txt") -Force
Write-Host "Copied BOOT-USB-README.txt to ${DriveLetter}:\" -ForegroundColor Green
Write-Host "Volume label should be BABYGPTBOOT (This PC)." -ForegroundColor Green
Write-Host "Run: .\scripts\verify-boot-stub-usb.ps1 -DiskNumber $DiskNumber" -ForegroundColor Cyan
