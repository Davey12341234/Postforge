# Open Rufus (elevated) with a Windows installer ISO pre-selected.
# Works fully offline: use a full Windows .iso already on disk/USB and rufus.exe on PATH or in a searched folder (see -Offline).
#
# Typical:
#   .\scripts\flash-proliant-windows-usb.ps1 -IsoPath "D:\ISOs\Win11.iso"
#
# If you drop exactly one .iso under deploy\proliant\staging\, you can omit -IsoPath:
#   .\scripts\flash-proliant-windows-usb.ps1 -Offline
param(
  [string]$IsoPath = "",

  [string]$RufusPath = "",

  [switch]$Offline,

  [ValidateSet("UEFI-GPT", "Legacy-MBR")]
  [string]$BootMode = "UEFI-GPT"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Staging = Join-Path $RepoRoot "deploy\proliant\staging"

function Find-RufusExe {
  param(
    [string]$Explicit,
    [string]$ScriptsDir,
    [string]$StagingDir
  )
  if ($Explicit -and (Test-Path -LiteralPath $Explicit)) {
    return (Resolve-Path -LiteralPath $Explicit).Path
  }
  $cmd = Get-Command rufus -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }
  $names = @("rufus.exe", "Rufus.exe")
  $dirs = @(
    $ScriptsDir,
    $StagingDir,
    (Join-Path $env:LOCALAPPDATA "Programs\Rufus"),
    (Join-Path ${env:ProgramFiles} "Rufus"),
    (Join-Path ${env:ProgramFiles(x86)} "Rufus")
  )
  foreach ($d in $dirs) {
    if (-not $d -or -not (Test-Path -LiteralPath $d)) { continue }
    foreach ($n in $names) {
      $p = Join-Path $d $n
      if (Test-Path -LiteralPath $p) { return (Resolve-Path -LiteralPath $p).Path }
    }
  }
  return $null
}

if (-not $IsoPath) {
  if (Test-Path -LiteralPath $Staging) {
    $candidates = @(Get-ChildItem -LiteralPath $Staging -Filter "*.iso" -File -ErrorAction SilentlyContinue)
    if ($candidates.Count -eq 1) {
      $IsoPath = $candidates[0].FullName
    }
  }
}

if (-not $IsoPath) {
  Write-Error @"
No ISO path. Copy your full Windows .iso onto this PC or USB, then run:

  .\scripts\flash-proliant-windows-usb.ps1 -IsoPath `"D:\path\to\Win11.iso`"

Add -Offline when you have no internet (see script header).

Or place exactly one *.iso under:
  $Staging
"@
}

if (-not (Test-Path -LiteralPath $IsoPath)) {
  Write-Error "ISO not found: $IsoPath"
}

$isoItem = Get-Item -LiteralPath $IsoPath
if ($isoItem.Length -lt 1GB) {
  Write-Warning "ISO is smaller than 1 GB ($($isoItem.Length) bytes). Use a full offline Windows image, not a web stub downloader."
}

$rufusExe = Find-RufusExe -Explicit $RufusPath -ScriptsDir $PSScriptRoot -StagingDir $Staging
if (-not $rufusExe) {
  if ($Offline) {
    Write-Error @"
Offline mode: rufus.exe not found.

Copy rufus.exe (portable zip from another machine) to either:
  $Staging
or
  $PSScriptRoot

Then re-run with -Offline. Or pass an explicit path:

  .\scripts\flash-proliant-windows-usb.ps1 -IsoPath `"$IsoPath`" -RufusPath `"D:\tools\rufus.exe`" -Offline
"@
  }
  else {
    Write-Error @"
Rufus not found on PATH and not under common install paths.

With internet once:  winget install Rufus.Rufus -e

Fully offline: copy rufus.exe into:
  $Staging
or set -RufusPath `"C:\path\to\rufus.exe`"
or re-run with -Offline for the same search paths without suggesting winget.
"@
  }
}

Write-Host ""
Write-Host "ISO:   $IsoPath" -ForegroundColor Cyan
Write-Host "Rufus: $rufusExe" -ForegroundColor Cyan
if ($Offline) {
  Write-Host "Mode:  offline (no winget / no downloads required for this step)" -ForegroundColor DarkGray
}
Write-Host ""

if ($BootMode -eq "UEFI-GPT") {
  Write-Host "ProLiant (UEFI): In Rufus set" -ForegroundColor Yellow
  Write-Host '  Device = your installer USB (check size - not your Windows system disk)'
  Write-Host "  Partition scheme = GPT"
  Write-Host "  Target system = UEFI (non-CSM)"
  Write-Host "  Image option = default for Windows ISO"
  Write-Host "Then START and wait until Rufus finishes."
} else {
  Write-Host "ProLiant Gen8 / legacy BIOS: In Rufus set" -ForegroundColor Yellow
  Write-Host '  Device = your installer USB (check size - not your Windows system disk)'
  Write-Host "  Partition scheme = MBR"
  Write-Host "  Target system = BIOS or UEFI-CSM (not UEFI-only)"
  Write-Host "Then START and wait until Rufus finishes."
}

Write-Host ""
Write-Host "Offline tip: Rufus only reads your local .iso; it does not need internet to write the stick." -ForegroundColor DarkCyan
Write-Host "Server: one-time boot menu (often F11) -> UEFI: USB or USB Drive Key." -ForegroundColor Green
Write-Host "Opening Rufus (UAC)..." -ForegroundColor Green
Write-Host ""

Start-Process -FilePath $rufusExe -Verb RunAs -ArgumentList @("-g", "-i", $IsoPath)
