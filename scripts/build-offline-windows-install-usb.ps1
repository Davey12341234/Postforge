# Wipes ONE USB disk and copies a mounted Windows ISO onto it (offline, no Rufus).
# Result: GPT + NTFS install media for UEFI (sources\setup.exe + install.wim).
#
# MUST run elevated (Administrator).
#
# Usage (Admin PowerShell):
#   .\scripts\build-offline-windows-install-usb.ps1 -DriveLetter D -IsoPath "$env:USERPROFILE\Downloads\Win11_24H2_English_x64.iso" -Confirm
# If the stick has no drive letter after a partial run (raw disk):
#   .\scripts\build-offline-windows-install-usb.ps1 -DiskNumber 2 -IsoPath "C:\Users\...\Win11_24H2_English_x64.iso" -Confirm
param(
  [ValidatePattern("^[A-Z]$")]
  [string]$DriveLetter = "D",

  [int]$DiskNumber = -1,

  [Parameter(Mandatory = $true)]
  [string]$IsoPath,

  [Parameter(Mandatory = $true)]
  [switch]$Confirm,

  [string]$LogPath = ""
)

$ErrorActionPreference = "Stop"
$DriveLetter = $DriveLetter.Trim().ToUpperInvariant()

function Write-Log([string]$m) {
  $line = "$(Get-Date -Format o)  $m"
  Write-Host $line
  if ($LogPath) { Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8 }
}

if (-not $LogPath) {
  $LogPath = Join-Path $env:TEMP "win11-offline-usb-build.log"
}
$null = New-Item -ItemType File -Force -Path $LogPath | Out-Null

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Log "ERROR: Run in Administrator PowerShell (repairs disk / format)."
  exit 10
}

if (-not (Test-Path -LiteralPath $IsoPath)) {
  Write-Log ('ERROR: ISO not found: {0}' -f $IsoPath)
  exit 11
}

Get-DiskImage -ImagePath $IsoPath -ErrorAction SilentlyContinue | ForEach-Object {
  Dismount-DiskImage -ImagePath $IsoPath -ErrorAction SilentlyContinue | Out-Null
}

$disk = $null
if ($DiskNumber -ge 0) {
  $disk = Get-Disk -Number $DiskNumber -ErrorAction Stop
  Write-Log "Target disk from -DiskNumber: #$($disk.Number)"
} else {
  $vol = Get-Volume -DriveLetter $DriveLetter -ErrorAction SilentlyContinue
  if ($vol) {
    if ($vol.DriveType -ne "Removable") {
      Write-Log "ERROR: ${DriveLetter}: is DriveType=$($vol.DriveType) (refusing non-removable)."
      exit 13
    }
    $part = Get-Partition -DriveLetter $DriveLetter -ErrorAction Stop
    $disk = Get-Disk -Number $part.DiskNumber -ErrorAction Stop
    Write-Log "Target disk from drive ${DriveLetter}: #$($disk.Number)"
  } else {
    $raw = @(Get-Disk | Where-Object {
        $_.BusType -eq "USB" -and $_.NumberOfPartitions -eq 0 -and $_.Size -lt 512GB -and -not $_.IsBoot -and -not $_.IsSystem
      })
    if ($raw.Count -eq 1) {
      $disk = $raw[0]
      Write-Log "No volume ${DriveLetter}:; using single raw USB disk #$($disk.Number)."
    } elseif ($raw.Count -gt 1) {
      Write-Log "ERROR: Multiple raw USB disks; unplug extras or pass -DiskNumber N."
      exit 12
    } else {
      Write-Log "ERROR: No volume ${DriveLetter}: and no single raw USB disk found."
      exit 12
    }
  }
}

if ($disk.BusType -ne "USB") {
  Write-Log ('ERROR: Disk #{0} BusType={1} (expected USB).' -f $disk.Number, $disk.BusType)
  exit 14
}
if ($disk.Size -gt 512GB) {
  Write-Log "ERROR: Disk too large for a typical USB; refusing."
  exit 15
}

Write-Log ('OK: USB disk #{0} size={1} GB' -f $disk.Number, [math]::Round($disk.Size / 1GB, 2))
Write-Log ('ISO: {0}' -f $IsoPath)

# Prepare the USB volume FIRST, then mount the ISO, so the ISO does not steal the same drive letter as the stick.
$isoLen = (Get-Item -LiteralPath $IsoPath).Length
$usbLetter = $null
try {
  Write-Log ('Clearing disk {0} and creating GPT + NTFS...' -f $disk.Number)
  $dn = $disk.Number
  Clear-Disk -Number $dn -RemoveData -Confirm:$false -ErrorAction Stop
  $d2 = Get-Disk -Number $dn -ErrorAction Stop
  if ($d2.PartitionStyle -eq "RAW") {
    Initialize-Disk -Number $dn -PartitionStyle GPT -Confirm:$false -ErrorAction Stop
  } elseif ($d2.PartitionStyle -eq "MBR") {
    Set-Disk -Number $dn -PartitionStyle GPT -ErrorAction Stop
  } elseif ($d2.PartitionStyle -ne "GPT") {
    throw ("Unexpected partition style after clear: " + $d2.PartitionStyle)
  }
  $p = New-Partition -DiskNumber $dn -UseMaximumSize -AssignDriveLetter -ErrorAction Stop
  Format-Volume -Partition $p -FileSystem NTFS -NewFileSystemLabel "WIN11_USB" -Confirm:$false -ErrorAction Stop
  $usbLetter = (Get-Partition -DiskNumber $dn | Where-Object { $_.DriveLetter } | Select-Object -First 1).DriveLetter
  if (-not $usbLetter) {
    throw "USB partition has no drive letter after format."
  }
  Write-Log ('USB work volume (temporary letter): {0}:' -f $usbLetter)

  $null = Mount-DiskImage -ImagePath $IsoPath -StorageType ISO -Access ReadOnly -ErrorAction Stop
  Start-Sleep -Seconds 2
  $isoVol = Get-Volume | Where-Object {
    $_.DriveType -eq "CD-ROM" -and $_.DriveLetter -and [math]::Abs($_.Size - $isoLen) -lt 50MB
  } | Select-Object -First 1
  if (-not $isoVol -or -not $isoVol.DriveLetter) {
    throw "Could not find mounted ISO volume (CD-ROM size matching ISO file)."
  }
  $srcRoot = $isoVol.DriveLetter.ToString().Trim() + ":\"
  Write-Log ('Mounted ISO at {0}' -f $srcRoot)
  if ($isoVol.DriveLetter -eq $usbLetter) {
    throw "ISO mounted on same letter as USB; free a drive letter and retry."
  }

  Write-Log "Copying Windows media (robocopy); several minutes..."
  $robolog = Join-Path $env:TEMP "win11-usb-robocopy.log"
  $dest = $usbLetter.ToString().Trim() + ":\"
  $robArgs = @(
    "$srcRoot", "$dest",
    "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:2", "/W:2", "/MT:16", "/LOG:$robolog", "/TEE"
  )
  & robocopy.exe @robArgs
  $rc = $LASTEXITCODE
  if ($rc -ge 8) {
    Write-Log ('ERROR: robocopy failed with exit {0} (see {1})' -f $rc, $robolog)
    exit 17
  }
  Write-Log ('robocopy finished (exit {0}; 0-7 = success).' -f $rc)
}
catch {
  Write-Log ('ERROR: {0}' -f $_.Exception.Message)
  Write-Log ($_.ScriptStackTrace -replace "`n", " | ")
  exit 20
}
finally {
  Dismount-DiskImage -ImagePath $IsoPath -ErrorAction SilentlyContinue | Out-Null
  Write-Log "Dismounted ISO."
}

if ($usbLetter -and ($usbLetter.ToString().ToUpperInvariant() -ne $DriveLetter)) {
  Write-Log ('Renaming USB from {0}: to {1}: ...' -f $usbLetter, $DriveLetter)
  $usbPart = Get-Partition -DiskNumber $disk.Number | Where-Object { $_.DriveLetter -eq $usbLetter } | Select-Object -First 1
  if ($usbPart) {
    Set-Partition -InputObject $usbPart -NewDriveLetter $DriveLetter -ErrorAction Stop
  }
}

$setup = "${DriveLetter}:\sources\setup.exe"
$wim = "${DriveLetter}:\sources\install.wim"
$esd = "${DriveLetter}:\sources\install.esd"
if (-not (Test-Path -LiteralPath $setup)) {
  Write-Log ('ERROR: Missing after copy: {0}' -f $setup)
  exit 18
}
if (-not ((Test-Path -LiteralPath $wim) -or (Test-Path -LiteralPath $esd))) {
  Write-Log 'ERROR: Missing install.wim or install.esd under sources folder.'
  exit 19
}

Write-Log ('PASS: Offline Windows install USB ready on {0}:' -f $DriveLetter)
Write-Log 'Server: one-time boot (often F11). Pick UEFI USB in firmware.'
exit 0
