# Stage Ubuntu Server USB + BabyGPT install kit for a bare-metal ProLiant (e.g. DL360p Gen8).
# 1) Builds babygpt-src.zip from the current git HEAD (tracked files only).
# 2) Copies bootstrap.sh, systemd unit, README into deploy\proliant\staging\
# 3) Optionally downloads Ubuntu Server ISO.
# 4) Launches Rufus elevated so you can flash the installer USB (GPT + UEFI).
#
# After Ubuntu is installed, copy this staging folder to the server (scp/USB) and run:
#   sudo bash bootstrap.sh ./babygpt-src.zip
#
# Usage:
#   .\scripts\prepare-proliant-babygpt.ps1
#   .\scripts\prepare-proliant-babygpt.ps1 -DownloadIso   # asks before downloading ~3.1 GB
#   .\scripts\prepare-proliant-babygpt.ps1 -SkipRufus -DownloadIso
# Non-interactive (no prompt): -DownloadIso -SkipDownloadConfirm
# Re-download ISO even if present: -DownloadIso -SkipDownloadConfirm -ForceIso
param(
  [string]$StagingRoot = "",
  [switch]$DownloadIso,
  [string]$IsoUrl = "https://releases.ubuntu.com/24.04/ubuntu-24.04.3-live-server-amd64.iso",
  [string]$IsoFileName = "ubuntu-live-server-amd64.iso",
  [switch]$SkipRufus,
  [switch]$SkipArchive,
  [switch]$SkipDownloadConfirm,
  [switch]$ForceIso
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $StagingRoot) {
  $StagingRoot = Join-Path $RepoRoot "deploy\proliant\staging"
}
$null = New-Item -ItemType Directory -Force -Path $StagingRoot
& (Join-Path $PSScriptRoot "assert-proliant-staging-location.ps1") -StagingRoot $StagingRoot

if (-not $SkipArchive) {
  $zipOut = Join-Path $StagingRoot "babygpt-src.zip"
  & "$PSScriptRoot\archive-babygpt-for-server.ps1" -OutputPath $zipOut
}

Copy-Item -Force (Join-Path $RepoRoot "deploy\proliant\bootstrap.sh") $StagingRoot
Copy-Item -Force (Join-Path $RepoRoot "deploy\proliant\bring-online.sh") $StagingRoot
Copy-Item -Force (Join-Path $RepoRoot "deploy\proliant\babygpt.service") $StagingRoot
Copy-Item -Force (Join-Path $RepoRoot "deploy\proliant\README.md") $StagingRoot
Copy-Item -Force (Join-Path $RepoRoot "deploy\proliant\install-tailscale.sh") $StagingRoot
Copy-Item -Force (Join-Path $RepoRoot "deploy\proliant\cloudflared-quick-tunnel.sh") $StagingRoot

$isoPath = Join-Path $StagingRoot $IsoFileName

$performDownload = $false
if ($DownloadIso) {
  Write-Host ""
  Write-Host "=== Ubuntu Server ISO ===" -ForegroundColor Cyan
  Write-Host "URL:    $IsoUrl"
  Write-Host "Save:   $isoPath"
  Write-Host "Size:   about 3.1 GB (takes several minutes on typical connections)"
  Write-Host ""

  if (-not $SkipDownloadConfirm) {
    if (Test-Path -LiteralPath $isoPath) {
      $reuse = Read-Host "This file already exists. Re-download (overwrites)? [y/N]"
      if ($reuse -match '^[yY]') {
        Remove-Item -LiteralPath $isoPath -Force
        $performDownload = $true
      } else {
        Write-Host "Keeping existing ISO (no download)." -ForegroundColor Green
      }
    } else {
      $go = Read-Host "Download this file now? [Y/n]"
      if ($go -match '^[nN]') {
        Write-Host "Download skipped. Add the ISO yourself or re-run with -DownloadIso." -ForegroundColor Yellow
      } else {
        $performDownload = $true
      }
    }
  } else {
    if (Test-Path -LiteralPath $isoPath) {
      $isoLen = (Get-Item -LiteralPath $isoPath).Length
      $looksBad = $isoLen -lt 500MB
      if ($ForceIso -or $looksBad) {
        if ($looksBad -and -not $ForceIso) {
          Write-Host "Existing ISO is too small ($isoLen bytes) - removing and re-downloading." -ForegroundColor Yellow
        } elseif ($ForceIso) {
          Write-Host "ForceIso: removing existing ISO and re-downloading." -ForegroundColor Yellow
        }
        Remove-Item -LiteralPath $isoPath -Force -ErrorAction Stop
        $performDownload = $true
      } else {
        $isoGb = [math]::Round($isoLen / 1GB, 2)
        Write-Host ('ISO already present ({0} GiB); skipping download. Use -ForceIso to replace.' -f $isoGb) -ForegroundColor Green
      }
    } else {
      $performDownload = $true
    }
  }

  if ($performDownload) {
    Write-Host ""
    Write-Host 'Downloading (this is large; may take many minutes)...'
    $ProgressPreference = "SilentlyContinue"
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
      $curl = (Get-Command curl.exe).Source
      $cargs = @('-fL', '--retry', '8', '--retry-delay', '15', '--connect-timeout', '60')
      if (Test-Path -LiteralPath $isoPath) {
        $partialLen = (Get-Item -LiteralPath $isoPath).Length
        if ($partialLen -gt 0 -and $partialLen -lt 500MB) {
          Write-Host "Resuming partial download ($partialLen bytes)..." -ForegroundColor Yellow
          $cargs = @('-C', '-') + $cargs
        }
      }
      $cargs = $cargs + @('-o', $isoPath, $IsoUrl)
      & $curl @cargs
      if ($LASTEXITCODE -ne 0) {
        Write-Error "curl download failed (exit $LASTEXITCODE). Try again or download the ISO in a browser and save as:`n  $isoPath"
      }
    } else {
      Invoke-WebRequest -Uri $IsoUrl -OutFile $isoPath -UseBasicParsing -TimeoutSec 86400
    }
    $finalLen = (Get-Item -LiteralPath $isoPath).Length
    if ($finalLen -lt 500MB) {
      Remove-Item -LiteralPath $isoPath -Force -ErrorAction SilentlyContinue
      Write-Error "Downloaded file is too small ($finalLen bytes) - likely corrupt or truncated. Removed. Retry when network is stable."
    }
    Write-Host "Saved: $isoPath" -ForegroundColor Green
  }
} elseif (-not (Test-Path -LiteralPath $isoPath)) {
  Write-Host ""
  Write-Host "No Ubuntu ISO in staging. To download it (you will be asked to confirm), run:" -ForegroundColor Yellow
  Write-Host "  .\scripts\prepare-proliant-babygpt.ps1 -DownloadIso" -ForegroundColor White
  Write-Host "Or save an ISO manually as:" -ForegroundColor Yellow
  Write-Host "  $isoPath" -ForegroundColor White
  Write-Host ""
}

if (-not $SkipRufus) {
  $rufus = Get-Command rufus -ErrorAction SilentlyContinue
  if (-not $rufus) {
    Write-Error "Rufus not found. Install with: winget install Rufus.Rufus -e"
  }
  $exe = $rufus.Source
  $rufusArgs = @("-g")
  if (Test-Path -LiteralPath $isoPath) {
    $rufusArgs += "-i", $isoPath
    Write-Host "Launching Rufus with ISO: $isoPath"
  } else {
    Write-Host "No ISO in staging (use -DownloadIso or place ubuntu-live-server-amd64.iso here)."
    Write-Host "Launching Rufus - select your Ubuntu Server ISO manually."
  }
  Write-Host ""
  Write-Host "Rufus checklist:"
  Write-Host "  Device: your USB - VERIFY the correct drive."
  Write-Host "  Image: Ubuntu Server ISO - GPT + UEFI typical for DL360p Gen8."
  Write-Host "  Click START, wait, eject safely."
  Write-Host ""
  Write-Host "After Ubuntu is installed, copy this folder to the server:"
  Write-Host "  $StagingRoot"
  Write-Host "Then on Ubuntu: sudo bash bring-online.sh   (or: sudo bash bootstrap.sh ./babygpt-src.zip)"
  Write-Host "Or from this PC: npm run deploy:server -- -Server <SERVER_IP>"
  Write-Host ""
  Start-Process -FilePath $exe -Verb RunAs -ArgumentList $rufusArgs
} else {
  Write-Host "Skipped Rufus (-SkipRufus). Staging folder:"
  Write-Host "  $StagingRoot"
}

Write-Host "Done. Staging: $StagingRoot"
