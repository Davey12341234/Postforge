<#
CRITICAL NOTE FOR CURSOR / AGENTS
================================
- Read real values from repo .env (DATABASE_URL, OPENAI_API_KEY, NEXTAUTH_SECRET). Do not echo placeholder
  commands; substitute secrets only inside this script or secure env vars.
- API paths: use projectId + teamId from .vercel/project.json — not deployment hostnames. If REST 404,
  run: npx vercel ls --scope cant-lose-gaming and confirm project; IDs are in .vercel/project.json.
- For REST + Bearer token, use scripts/vercel-set-env-rest.ps1 with $env:VERCEL_TOKEN set.
#>
# Sets production env using Vercel CLI. Each `vercel env add` runs in a child PowerShell process — running
# multiple `npx vercel env add` in sequence in one session hangs on Windows.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path ".vercel\project.json")) { throw "Run from repo with .vercel linked (vercel link)." }

$env:CI = "true"
$npxCmd = (Get-Command npx.cmd -ErrorAction Stop).Source
$helper = Join-Path $PSScriptRoot "vercel-env-add-one.ps1"
$pwsh = (Get-Command powershell.exe -ErrorAction Stop).Source

function Remove-EnvIfExists([string]$name) {
  $oldEap = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  try {
    $null = & $npxCmd @("vercel@latest", "env", "rm", $name, "production", "--yes") 2>&1
  } finally {
    $ErrorActionPreference = $oldEap
  }
}

function Get-DotEnvValue([string]$key) {
  if (-not (Test-Path ".env")) { throw ".env not found" }
  $line = Get-Content ".env" | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
  if (-not $line) { throw "Key $key not found in .env" }
  $raw = ($line -split "=", 2)[1].Trim()
  if ($raw.StartsWith('"') -and $raw.EndsWith('"')) { $raw = $raw.Substring(1, $raw.Length - 2) }
  return $raw.Trim()
}

function Invoke-VercelEnvAdd([string]$name, [string]$value, [switch]$Sensitive) {
  $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $helper, "-Name", $name, "-Value", $value)
  if ($Sensitive) { $args += "-Sensitive" }
  $p = Start-Process -FilePath $pwsh -ArgumentList $args -Wait -PassThru -NoNewWindow
  if ($p.ExitCode -ne 0) { throw "vercel env add failed for $name (exit $($p.ExitCode))" }
}

$db = Get-DotEnvValue "DATABASE_URL"
$openai = Get-DotEnvValue "OPENAI_API_KEY"
$nextAuthSecret = Get-DotEnvValue "NEXTAUTH_SECRET"
$nextAuthUrl = "https://postforge2.vercel.app"

foreach ($k in @("DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "OPENAI_API_KEY")) { Remove-EnvIfExists $k }

Invoke-VercelEnvAdd "DATABASE_URL" $db -Sensitive
Invoke-VercelEnvAdd "NEXTAUTH_URL" $nextAuthUrl
Invoke-VercelEnvAdd "NEXTAUTH_SECRET" $nextAuthSecret -Sensitive
Invoke-VercelEnvAdd "OPENAI_API_KEY" $openai -Sensitive

Write-Host "Deploying production..."
$outD = [System.IO.Path]::GetTempFileName()
$errD = [System.IO.Path]::GetTempFileName()
try {
  $pd = Start-Process -FilePath $npxCmd -ArgumentList @("vercel@latest", "deploy", "--prod", "--yes", "--force") -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outD -RedirectStandardError $errD
  Get-Content $outD, $errD -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
  exit $pd.ExitCode
} finally {
  Remove-Item $outD, $errD -ErrorAction SilentlyContinue
}
