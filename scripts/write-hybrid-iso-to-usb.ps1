#Requires -RunAsAdministrator
# Writes a hybrid ISO (Ubuntu Server) byte-for-byte to a USB disk (dd-style).
# DESTROYS all data on the target disk. Use only on the correct removable USB.
param(
  [Parameter(Mandatory = $true)]
  [int]$DiskNumber,
  [Parameter(Mandatory = $true)]
  [string]$IsoPath
)

$ErrorActionPreference = "Stop"
$log = Join-Path $env:TEMP ("write-usb-{0}.log" -f (Get-Date -Format "yyyyMMddHHmmss"))
Start-Transcript -Path $log -Force | Out-Null

try {
  if (-not (Test-Path -LiteralPath $IsoPath)) {
    throw "ISO not found: $IsoPath"
  }

  $disk = Get-Disk -Number $DiskNumber -ErrorAction Stop
  if ($disk.BusType -ne 'USB') {
    throw "Refusing: disk $DiskNumber is not USB (BusType=$($disk.BusType))."
  }

  $isoLen = (Get-Item -LiteralPath $IsoPath).Length
  if ($isoLen -gt $disk.Size) {
    throw "ISO ($isoLen bytes) is larger than disk ($($disk.Size) bytes)."
  }

  Write-Host "Target: Disk $DiskNumber - $($disk.FriendlyName) ($([math]::Round($disk.Size/1GB,2)) GB) USB"
  Write-Host "Image:  $IsoPath ($([math]::Round($isoLen/1GB,3)) GiB)"
  Write-Host "Log:    $log"
  Write-Host ""
  Write-Host "Clearing partition table, then writing raw ISO..."
  Clear-Disk -Number $DiskNumber -RemoveData -Confirm:$false

  $isoFull = (Resolve-Path -LiteralPath $IsoPath).Path
  $phy = "\\.\PhysicalDrive$DiskNumber"

  $in = [System.IO.File]::OpenRead($isoFull)
  $out = [System.IO.File]::Open($phy, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)

  try {
    $buf = New-Object byte[] (4MB)
    $done = 0L
    $lastPct = -1
    while (($r = $in.Read($buf, 0, $buf.Length)) -gt 0) {
      $out.Write($buf, 0, $r)
      $done += $r
      $pct = [int](100 * $done / $isoLen)
      if ($pct -ne $lastPct -and ($pct % 2 -eq 0 -or $done -eq $isoLen)) {
        $lastPct = $pct
        Write-Progress -Activity "Writing ISO to USB" -Status "$pct% complete" -PercentComplete ([Math]::Min(100, $pct))
      }
    }
    $out.Flush()
  } finally {
    $in.Close()
    $out.Close()
  }

  Write-Progress -Activity "Writing ISO to USB" -Completed
  Write-Host ""
  Write-Host "Done. Log: $log" -ForegroundColor Green
  Write-Host "Eject the USB safely, then boot the ProLiant." -ForegroundColor Green
  exit 0
} catch {
  Write-Host ""
  Write-Host "FAILED: $_" -ForegroundColor Red
  Write-Host "Log: $log"
  exit 1
} finally {
  try { Stop-Transcript | Out-Null } catch {}
}
