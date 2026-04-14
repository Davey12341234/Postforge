# Build a source zip for the ProLiant bootstrap (tracked files only — commit or stash first).
# Usage: .\scripts\archive-babygpt-for-server.ps1
#        .\scripts\archive-babygpt-for-server.ps1 -OutputPath "D:\babygpt-src.zip"
param(
  [string]$OutputPath = ""
)

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
  Write-Error "This repo has no .git directory. Clone from GitHub or init git, then retry."
  exit 1
}

if (-not $OutputPath) {
  $OutputPath = Join-Path $RepoRoot "deploy\proliant\staging\babygpt-src.zip"
}

$dir = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $dir)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Push-Location $RepoRoot
try {
  git archive --format=zip --prefix=babygpt/ -o $OutputPath HEAD
} finally {
  Pop-Location
}

Write-Host "Wrote: $OutputPath"
Get-Item $OutputPath | Select-Object FullName, Length, LastWriteTime
