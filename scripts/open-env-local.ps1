# Opens repo-root .env.local in Cursor (if CLI on PATH), else VS Code, else Notepad.
# Creates the file from .env.local.example if missing. Useful when Cursor cannot resolve .env URIs.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$repo = Get-Location
$target = Join-Path $repo ".env.local"
$example = Join-Path $repo ".env.local.example"

if (-not (Test-Path -LiteralPath $target)) {
  if (Test-Path -LiteralPath $example) {
    Copy-Item -LiteralPath $example -Destination $target
    Write-Host "Created .env.local from .env.local.example - edit and save." -ForegroundColor Yellow
  } else {
    New-Item -ItemType File -Path $target | Out-Null
    Write-Host "Created empty .env.local - copy keys from .env.local.example." -ForegroundColor Yellow
  }
}

$full = (Resolve-Path -LiteralPath $target).Path
Write-Host ""
Write-Host "Path: $full"
Write-Host ""

$candidates = @(
  @{ Name = "Cursor"; Cmd = "cursor.cmd" },
  @{ Name = "VS Code"; Cmd = "code.cmd" }
)

foreach ($c in $candidates) {
  $cmd = Get-Command $c.Cmd -ErrorAction SilentlyContinue
  if ($cmd) {
    Write-Host "Opening with $($c.Name) ..."
    & $cmd.Source $full
    exit 0
  }
}

Write-Host "Cursor/code CLI not on PATH - opening Notepad (paste path into Cursor File > Open File if needed)." -ForegroundColor Yellow
Start-Process -FilePath "notepad.exe" -ArgumentList $full
exit 0
