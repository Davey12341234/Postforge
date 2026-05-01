# Verify boot-stub USB layout (GPT, EFI ~550MB, second partition for /boot).
# Usage: .\scripts\verify-boot-stub-usb.ps1 -DiskNumber 1
param([Parameter(Mandatory = $true)][int]$DiskNumber)

$ErrorActionPreference = "Stop"
$disk = Get-Disk -Number $DiskNumber
if ($disk.BusType -ne "USB") { Write-Error "Disk $DiskNumber is not USB." }

$ok = $true
if ($disk.PartitionStyle -ne "GPT") { Write-Warning "Expected GPT, got $($disk.PartitionStyle)"; $ok = $false }

$parts = @(Get-Partition -DiskNumber $DiskNumber | Sort-Object PartitionNumber)
if ($parts.Count -ne 2) { Write-Warning "Expected 2 partitions, got $($parts.Count)"; $ok = $false }

$p1 = $parts | Where-Object PartitionNumber -eq 1
$p2 = $parts | Where-Object PartitionNumber -eq 2
if (-not $p1 -or $p1.Type -ne "System") { Write-Warning "Partition 1 should be System (EFI)"; $ok = $false }
if ($p1 -and [math]::Abs($p1.Size - 550MB) -gt 50MB) { Write-Warning "Partition 1 size unexpected: $($p1.Size)" }
if (-not $p2 -or $p2.Type -ne "Basic") { Write-Warning "Partition 2 should be Basic (unformatted for ext4 /boot)"; $ok = $false }

if ($p1 -and $p1.DriveLetter) {
  $L = $p1.DriveLetter
  $vol = Get-Volume -DriveLetter $L -ErrorAction SilentlyContinue
  if (-not $vol -or $vol.FileSystemType -ne "FAT32") {
    Write-Warning "Partition 1 has letter ${L}: but ESP is not usable FAT32 (Explorer: volume does not contain a recognized file system). Run as Administrator: .\scripts\fix-bootstub-esp.ps1 -DiskNumber $DiskNumber"
    $ok = $false
  } elseif ($vol.FileSystemLabel -and $vol.FileSystemLabel -ne "BABYGPTBOOT") {
    Write-Host "ESP label is '$($vol.FileSystemLabel)' (expected BABYGPTBOOT). Run fix-bootstub-esp.ps1 to rename, or ignore." -ForegroundColor Yellow
  }
}

$readme = $false
foreach ($letter in @('T','S','R','U','V')) {
  $root = "${letter}:\"
  if (-not (Test-Path -LiteralPath $root)) { continue }
  $p = Join-Path $root "BOOT-USB-README.txt"
  if (Test-Path -LiteralPath $p) { $readme = $true; Write-Host "Found $p" -ForegroundColor Green; break }
}
if (-not $readme) { Write-Host "BOOT-USB-README.txt not on ESP (optional). Copy from deploy/proliant/BOOT-USB-README.txt after assigning a drive letter." -ForegroundColor Yellow }

if ($ok) { Write-Host "Layout OK for boot-stub + Ubuntu custom install." -ForegroundColor Green } else { Write-Host "Review warnings above." -ForegroundColor Yellow }
