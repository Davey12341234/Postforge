# Build deploy/proliant/automation/nocloud/user-data from template (password hash + your LAN seed URL).
# Requires OpenSSL (e.g. Git for Windows: Program Files\Git\usr\bin\openssl.exe).
#
# Usage:
#   .\scripts\prepare-autoinstall-seed.ps1 -SeedingPcIp 10.0.0.228 -AdminPassword 'YourSecurePassword' -RefreshStaging
#
# Then on the SAME PC during server install (Ethernet to same router as this PC):
#   npm run proliant:serve-seed
# Boot Ubuntu installer USB -> GRUB -> add the printed kernel line -> continue install unattended.
param(
  [Parameter(Mandatory = $true)]
  [string] $SeedingPcIp,

  [int] $Port = 8080,

  [string] $AdminUser = "ubuntu",

  [Parameter(Mandatory = $true)]
  [string] $AdminPassword,

  [string] $Hostname = "babygpt-host",

  [ValidateSet("lvm", "direct")]
  [string] $StorageLayout = "direct",

  [switch] $RefreshStaging
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Template = Join-Path $RepoRoot "deploy\proliant\automation\nocloud\user-data.template.yaml"
$Out = Join-Path $RepoRoot "deploy\proliant\automation\nocloud\user-data"
$Staging = Join-Path $RepoRoot "deploy\proliant\staging"

function Find-OpenSsl {
  $c = Get-Command openssl -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @(
      "${env:ProgramFiles}\Git\usr\bin\openssl.exe",
      "${env:ProgramFiles(x86)}\Git\usr\bin\openssl.exe"
    )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

if ($RefreshStaging) {
  & (Join-Path $RepoRoot "scripts\prepare-proliant-babygpt.ps1") -SkipRufus
}
elseif (-not (Test-Path -LiteralPath (Join-Path $Staging "babygpt-src.zip"))) {
  throw "Missing staging zip. Run: npm run proliant:stage  or  -RefreshStaging"
}

$openssl = Find-OpenSsl
if (-not $openssl) {
  throw "openssl not found. Install Git for Windows (includes openssl) or add OpenSSL to PATH."
}

$hash = $AdminPassword | & $openssl passwd -6 -stdin
if (-not $hash -or $hash -notmatch '^\$') {
  throw "Could not produce Linux password hash (openssl passwd -6)."
}

if (-not (Test-Path -LiteralPath $Template)) {
  throw "Missing template: $Template"
}

$base = "http://${SeedingPcIp}:${Port}"
$content = Get-Content -LiteralPath $Template -Raw -Encoding UTF8
$content = $content.Replace('CHANGEME_SEED_BASE', $base)
$content = $content.Replace('CHANGEME_USER', $AdminUser)
$content = $content.Replace('CHANGEME_PASSWORD_HASH', $hash)
$content = $content.Replace('CHANGEME_HOST', $Hostname)
$content = $content.Replace('CHANGEME_STORAGE_LAYOUT', $StorageLayout)

Set-Content -LiteralPath $Out -Value $content -Encoding UTF8

$grub = "autoinstall ds=nocloud-net\;s=${base}/"
Write-Host ""
Write-Host "=== Wrote: $Out" -ForegroundColor Green
Write-Host ""
Write-Host "=== GRUB line (append to the linux line, then Ctrl+X to boot):" -ForegroundColor Cyan
Write-Host $grub
Write-Host ""
Write-Host "=== Next on THIS PC (keep window open while server installs):" -ForegroundColor Yellow
Write-Host "  npm run proliant:serve-seed"
Write-Host ""
Write-Host "Firewall: allow inbound TCP $Port from your LAN if Windows Firewall prompts." -ForegroundColor DarkYellow
Write-Host ""
