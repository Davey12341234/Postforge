# Fail fast if deploy/proliant/staging is on USB/SD or lacks space for a large ISO.
# Rufus flashes the installer TO removable media later; downloads belong on a fixed disk.
param(
  [Parameter(Mandatory = $true)]
  [string]$StagingRoot,
  [long]$MinimumFreeBytes = 4L * 1024 * 1024 * 1024
)

$ErrorActionPreference = "Stop"
if ($env:BABYGPT_ALLOW_REMOVABLE_STAGING -match '^(1|true|yes)$') {
  Write-Warning "BABYGPT_ALLOW_REMOVABLE_STAGING is set - skipping fixed-disk check (not recommended)."
  exit 0
}

$null = New-Item -ItemType Directory -Force -Path $StagingRoot
$resolved = (Resolve-Path -LiteralPath $StagingRoot).ProviderPath
if ($resolved -notmatch '^([A-Za-z]):') {
  Write-Error "Could not determine drive letter for staging: $StagingRoot"
}
$letter = $Matches[1].ToUpperInvariant()
$vol = Get-Volume -DriveLetter $letter -ErrorAction Stop
$dt = [string]$vol.DriveType
if ($dt -eq 'Removable') {
  $msg = @'
BabyGPT / Ubuntu ISO staging must be on a fixed disk (internal SSD/HDD), not USB flash or SD.

Keep the repo on C: (or another internal volume). Download the ISO there; use Rufus only to write TO the SD/USB.

Override (not recommended): set BABYGPT_ALLOW_REMOVABLE_STAGING=1
'@
  Write-Error ("{0}`n`n  Path: {1}`n  Drive: {2}: is Removable" -f $msg.Trim(), $StagingRoot, $letter)
}

$free = $vol.SizeRemaining
if ($free -lt $MinimumFreeBytes) {
  Write-Error ('Drive {0}: has {1:F2} GiB free; need at least {2:F2} GiB for ISO download + headroom.' -f $letter, ($free / 1GB), ($MinimumFreeBytes / 1GB))
}
