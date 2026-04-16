# After `npm run build` with output: "standalone" in next.config.ts, copies the self-contained app to a USB drive.
# Usage: .\scripts\export-standalone-to-usb.ps1 -DriveLetter D
param(
  [Parameter(Mandatory = $true)]
  [string]$DriveLetter
)

$ErrorActionPreference = "Stop"
$DriveLetter = $DriveLetter.TrimEnd(':').ToUpperInvariant()
$Root = "${DriveLetter}:\"
if (-not (Test-Path $Root)) {
  Write-Error "Drive not found: $Root"
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Standalone = Join-Path $RepoRoot ".next\standalone"
$Static = Join-Path $RepoRoot ".next\static"
$Public = Join-Path $RepoRoot "public"

if (-not (Test-Path $Standalone)) {
  Write-Error "Missing .next\standalone. Run: npm run build (requires output: standalone in next.config.ts)"
}

$Dest = Join-Path $Root "babygpt-standalone"
if (Test-Path $Dest) {
  Remove-Item -LiteralPath $Dest -Recurse -Force
}
New-Item -ItemType Directory -Path $Dest | Out-Null

Write-Host "Copying standalone build to $Dest ..."
Copy-Item -Path (Join-Path $Standalone "*") -Destination $Dest -Recurse -Force

$nextStatic = Join-Path $Dest ".next\static"
New-Item -ItemType Directory -Path (Split-Path $nextStatic) -Force | Out-Null
if (Test-Path $Static) {
  Copy-Item -Path $Static -Destination $nextStatic -Recurse -Force
}

if (Test-Path $Public) {
  Copy-Item -Path $Public -Destination (Join-Path $Dest "public") -Recurse -Force
}

$readme = @"
BabyGPT standalone build (Next.js).

On Ubuntu Server with Node 20+:
  cd babygpt-standalone
  export NODE_ENV=production
  node server.js

Listen address: Next standalone uses HOSTNAME for the bind address (not only DNS hostname).
If other machines cannot reach the server, use all interfaces explicitly:
  HOSTNAME=0.0.0.0 node server.js

Default port: 3000 (set PORT to change).

Windows build copied to Linux: native deps (e.g. sharp for images) may not load. Fix on the Linux box:
  npm rebuild sharp
Or build on the server: npm ci && npm run build, then copy only if same OS/arch.

Copy .env next to this folder or set env vars for AI keys (see .env.local.example in repo).

If BABYGPT_APP_PASSWORD is set, you must also set BABYGPT_SESSION_SECRET or APIs return 500/401.
"@
Set-Content -Path (Join-Path $Dest "README-STANDALONE.txt") -Value $readme -Encoding UTF8

Write-Host "Done: $Dest" -ForegroundColor Green
Get-ChildItem $Dest -Recurse | Measure-Object -Property Length -Sum | ForEach-Object { "Total size (~): $([math]::Round($_.Sum/1MB,1)) MB" }
