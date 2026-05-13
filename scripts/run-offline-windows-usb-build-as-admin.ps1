# UAC prompt once: wipes removable drive D: (default) and copies Win11 ISO contents for offline UEFI install.
param(
  [ValidatePattern("^[A-Z]$")]
  [string]$DriveLetter = "D",

  [string]$IsoPath = "$env:USERPROFILE\Downloads\Win11_24H2_English_x64.iso"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$build = Join-Path $PSScriptRoot "build-offline-windows-install-usb.ps1"
$log = Join-Path $RepoRoot "deploy\proliant\staging\win11-usb-build.log"
$null = New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null

$usbDisks = @(Get-Disk | Where-Object { $_.BusType -eq "USB" -and $_.Size -lt 512GB -and -not $_.IsSystem })
if ($usbDisks.Count -ne 1) {
  Write-Error "Plug exactly one USB installer stick (found $($usbDisks.Count) candidate USB disks under 512 GB)."
}
$diskNum = $usbDisks[0].Number

$pre = @(
  "$(Get-Date -Format o)  --- launcher ---",
  "If you cancelled UAC, the USB was NOT changed. Re-run and click Yes on the prompt.",
  "Target USB disk number: $diskNum (letter ${DriveLetter}: assigned after format). Copies local Win11 ISO (no Internet)."
) -join "`n"
Set-Content -LiteralPath $log -Value $pre -Encoding UTF8

$arg = "-NoProfile -ExecutionPolicy Bypass -File `"$build`" -DiskNumber $diskNum -DriveLetter $DriveLetter -IsoPath `"$IsoPath`" -Confirm -LogPath `"$log`""
Write-Host "Elevating (UAC). Approve to wipe ONLY removable ${DriveLetter}: and build Windows install USB." -ForegroundColor Yellow
Write-Host "Log: $log"
$p = Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $arg -Wait -PassThru
Write-Host "Elevated process exit code: $($p.ExitCode)" -ForegroundColor Cyan
Write-Host "Log tail:" -ForegroundColor Cyan
if (Test-Path -LiteralPath $log) {
  Get-Content -LiteralPath $log -Tail 40
}
