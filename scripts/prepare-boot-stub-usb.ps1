# Prepare a SMALL USB as Ubuntu boot helper for HP Gen8 + NVMe (no front-bay disks):
#   - GPT
#   - Partition 1: ~550 MB FAT32 with EFI type GUID (PRIMARY + set id; avoids "not supported
#     on removable media" from create partition efi on many USB sticks)
#   - Partition 2: rest = unformatted space for /boot (ext4) in the Ubuntu installer
#
# DESTRUCTIVE: wipes the entire USB. Unplug other removable drives if unsure.
#
# Usage (from repo root, Admin PowerShell):
#   Get-Disk | ? { $_.BusType -eq 'USB' } | ft Number, FriendlyName, Size
#   .\scripts\prepare-boot-stub-usb.ps1 -DiskNumber 1
#
param(
  [Parameter(Mandatory = $true)]
  [int]$DiskNumber,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$disk = Get-Disk -Number $DiskNumber
if ($disk.BusType -ne "USB") {
  Write-Error "Disk $DiskNumber is not USB (BusType=$($disk.BusType)). Refusing."
}

Write-Host "Will WIPE USB disk $DiskNumber : $($disk.FriendlyName) ($([math]::Round($disk.Size/1GB,2)) GB)" -ForegroundColor Yellow
if (-not $Force) {
  Write-Host "Type YES to continue: " -NoNewline
  if ((Read-Host) -ne "YES") {
    Write-Host "Aborted."
    exit 1
  }
}

$script = @"
select disk $DiskNumber
clean
convert gpt
create partition primary size=550
set id=c12a7328-f81f-11d2-ba4b-00a0c93ec93b override
format quick fs=fat32 label="BABYGPTBOOT"
assign letter=T
create partition primary
exit
"@

$tmp = [System.IO.Path]::GetTempFileName() + ".txt"
Set-Content -Path $tmp -Value $script -Encoding ASCII
$diskpartOut = ""
$dpExit = 0
try {
  $diskpartOut = & diskpart.exe /s $tmp 2>&1 | Out-String
  $dpExit = $LASTEXITCODE
  if ($dpExit -ne 0) {
    Write-Host $diskpartOut
  }
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}

$disk2 = Get-Disk -Number $DiskNumber
$parts2 = @(Get-Partition -DiskNumber $DiskNumber | Sort-Object PartitionNumber)
$layoutOk =
  ($disk2.PartitionStyle -eq "GPT") -and ($parts2.Count -eq 2) -and
  ($parts2[0].Type -eq "System") -and ($parts2[1].Type -eq "Basic") -and
  ([math]::Abs($parts2[0].Size - 550MB) -lt 80MB)
if (-not $layoutOk) {
  Write-Error "diskpart did not produce the expected boot-stub layout (diskpart exit $dpExit). Run as Administrator; see deploy/proliant/diskpart-reflash-boot-stub-usb.txt."
}
if ($dpExit -ne 0) {
  Write-Host "diskpart reported exit $dpExit but partition layout looks correct; continuing." -ForegroundColor Yellow
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReadmeSrc = Join-Path $RepoRoot "deploy\proliant\BOOT-USB-README.txt"
if ((Test-Path -LiteralPath 'T:\') -and (Test-Path -LiteralPath $ReadmeSrc)) {
  try {
    Copy-Item -LiteralPath $ReadmeSrc -Destination 'T:\BOOT-USB-README.txt' -Force
    Write-Host ('Copied BOOT-USB-README.txt to T:\') -ForegroundColor Green
  } catch {
    Write-Host "Could not copy README to T: (run PowerShell as Administrator, or copy manually from deploy/proliant/BOOT-USB-README.txt)." -ForegroundColor Yellow
  }
} else {
  Write-Host "T: not mounted or readme missing - assign ESP a letter in Disk Management, then copy deploy/proliant/BOOT-USB-README.txt" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Run: .\scripts\verify-boot-stub-usb.ps1 -DiskNumber $DiskNumber" -ForegroundColor Cyan
Write-Host "Safely eject the USB before moving it to the server." -ForegroundColor Green
