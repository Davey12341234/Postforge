# Starts fix-bootstub-esp.ps1 in an elevated PowerShell (UAC prompt once). No typing.
# Double-click ELEVATE-ESP-FIX.bat in the repo root, or: npm run proliant:fix-bootstub-elevate
param([int]$DiskNumber = 1)

$ErrorActionPreference = "Stop"
$fix = Join-Path $PSScriptRoot "fix-bootstub-esp.ps1"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
  & $fix -DiskNumber $DiskNumber
  exit $LASTEXITCODE
}

Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $fix,
  "-DiskNumber", "$DiskNumber"
) | Out-Null
Write-Host "If a UAC prompt appeared, approve it to format the ESP (T:). This window can close." -ForegroundColor Cyan
