<#
Sync BabyGPT billing + gate env from .env.local or .env to Vercel Production.

Prerequisites:
- .vercel/project.json (run: npx vercel link)
- .env.local or .env at repo root with real values (not committed)
- Required: BABYGPT_APP_PASSWORD, BABYGPT_SESSION_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_TEAM, NEXT_PUBLIC_APP_URL
- Optional: NEXT_PUBLIC_PLAN_PRICE_*_USD (list prices in Plans modal; script warns if omitted)

Each vercel env add runs in a child process (Windows-safe). See .cursor rules for VERCEL_TOKEN / team scope.

Usage:
  .\scripts\set-babygpt-vercel-prod-env.ps1
  .\scripts\set-babygpt-vercel-prod-env.ps1 -EnvFile .env.local
#>
param(
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path ".vercel\project.json")) { throw "Run from repo with .vercel linked (npx vercel link)." }

if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  if (Test-Path ".env.local") { $EnvFile = ".env.local" }
  elseif (Test-Path ".env") { $EnvFile = ".env" }
  else { throw "Create repo-root .env.local or .env with BabyGPT + Stripe keys (see .env.local.example)." }
}
$envSourcePath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path (Get-Location) $EnvFile }
if (-not (Test-Path $envSourcePath)) { throw "Env file not found: $envSourcePath" }
Write-Host "Using env file: $envSourcePath"

$npxCmd = (Get-Command npx.cmd -ErrorAction Stop).Source
$helper = Join-Path $PSScriptRoot "vercel-env-add-one.ps1"
$pwsh = (Get-Command powershell.exe -ErrorAction Stop).Source

function Get-DotEnvValue([string]$filePath, [string]$key) {
  $line = Get-Content $filePath | Where-Object { $_ -match "^\s*$([regex]::Escape($key))\s*=" } | Select-Object -First 1
  if (-not $line) { return $null }
  $raw = ($line -split "=", 2)[1].Trim()
  if ($raw.StartsWith('"') -and $raw.EndsWith('"')) { $raw = $raw.Substring(1, $raw.Length - 2) }
  return $raw.Trim()
}

function Invoke-VercelEnvAdd([string]$name, [string]$value, [switch]$Sensitive) {
  if ([string]::IsNullOrWhiteSpace($value)) { throw "Empty value for $name" }
  $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $helper, "-Name", $name, "-Value", $value)
  if ($Sensitive) { $args += "-Sensitive" }
  $p = Start-Process -FilePath $pwsh -ArgumentList $args -Wait -PassThru -NoNewWindow
  if ($p.ExitCode -ne 0) { throw "vercel env add failed for $name (exit $($p.ExitCode))" }
}

$required = @(
  @{ Key = "BABYGPT_APP_PASSWORD"; Sensitive = $true }
  @{ Key = "BABYGPT_SESSION_SECRET"; Sensitive = $true }
  @{ Key = "STRIPE_SECRET_KEY"; Sensitive = $true }
  @{ Key = "STRIPE_WEBHOOK_SECRET"; Sensitive = $true }
  @{ Key = "STRIPE_PRICE_STARTER"; Sensitive = $false }
  @{ Key = "STRIPE_PRICE_PRO"; Sensitive = $false }
  @{ Key = "STRIPE_PRICE_TEAM"; Sensitive = $false }
  @{ Key = "NEXT_PUBLIC_APP_URL"; Sensitive = $false }
)

$optionalPrices = @(
  "NEXT_PUBLIC_PLAN_PRICE_STARTER_USD"
  "NEXT_PUBLIC_PLAN_PRICE_PRO_USD"
  "NEXT_PUBLIC_PLAN_PRICE_TEAM_USD"
)

foreach ($m in $required) {
  $k = $m.Key
  $v = Get-DotEnvValue $envSourcePath $k
  if (-not $v) { throw "Missing $k in .env — add it before running this script." }
  Write-Host "Setting $k ..."
  Invoke-VercelEnvAdd $k $v -Sensitive:($m.Sensitive)
}

foreach ($k in $optionalPrices) {
  $v = Get-DotEnvValue $envSourcePath $k
  if (-not $v) {
    Write-Warning "Optional $k not in .env — Plans modal may show 'Price on checkout'. Add later in Vercel or .env and re-run."
    continue
  }
  Write-Host "Setting $k ..."
  Invoke-VercelEnvAdd $k $v -Sensitive:$false
}

Write-Host "Done. Redeploy: npx vercel deploy --prod --yes"
