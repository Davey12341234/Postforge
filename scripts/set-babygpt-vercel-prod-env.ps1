<#
Sync bbGPT billing + gate env from .env.local or .env to Vercel Production.

Prerequisites:
- .vercel/project.json (run: npx vercel link)
- .env.local or .env at repo root with real values (not committed)
- Required (canonical on Vercel): BBGPT_APP_PASSWORD, BBGPT_SESSION_SECRET — .env.local may still use BABYGPT_* only; legacy values are mapped when pushing. Also: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_TEAM, NEXT_PUBLIC_APP_URL
- Optional: NEXT_PUBLIC_PLAN_PRICE_*_USD, *_YEARLY_USD; STRIPE_PRICE_*_YEARLY; Z_AI_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY

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
  else { throw "Create repo-root .env.local or .env with bbGPT + Stripe keys (see .env.local.example)." }
}
$envSourcePath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path (Get-Location) $EnvFile }
if (-not (Test-Path $envSourcePath)) { throw "Env file not found: $envSourcePath" }
Write-Host "Using env file: $envSourcePath"

$helper = Join-Path $PSScriptRoot "vercel-env-add-one.ps1"

function Get-DotEnvValue([string]$filePath, [string]$key) {
  $line = Get-Content $filePath | Where-Object { $_ -match "^\s*$([regex]::Escape($key))\s*=" } | Select-Object -First 1
  if (-not $line) { return $null }
  $raw = ($line -split "=", 2)[1].Trim()
  if ($raw.StartsWith('"') -and $raw.EndsWith('"')) { $raw = $raw.Substring(1, $raw.Length - 2) }
  return $raw.Trim()
}

function Invoke-VercelEnvAdd([string]$name, [string]$value, [switch]$Sensitive) {
  if ([string]::IsNullOrWhiteSpace($value)) { throw "Empty value for $name" }
  # Run helper in-process (nested Start-Process breaks on secret characters and can hang).
  if ($Sensitive) {
    & $helper -Name $name -Value $value -Sensitive
  } else {
    & $helper -Name $name -Value $value
  }
  if ($LASTEXITCODE -ne 0) { throw "vercel env add failed for $name (exit $($LASTEXITCODE))" }
}

$required = @(
  @{ Key = "BBGPT_APP_PASSWORD"; Sensitive = $true; LegacyKey = "BABYGPT_APP_PASSWORD" }
  @{ Key = "BBGPT_SESSION_SECRET"; Sensitive = $true; LegacyKey = "BABYGPT_SESSION_SECRET" }
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

$optionalYearlyPrices = @(
  "NEXT_PUBLIC_PLAN_PRICE_STARTER_YEARLY_USD"
  "NEXT_PUBLIC_PLAN_PRICE_PRO_YEARLY_USD"
  "NEXT_PUBLIC_PLAN_PRICE_TEAM_YEARLY_USD"
)

$optionalYearlyStripe = @(
  "STRIPE_PRICE_STARTER_YEARLY"
  "STRIPE_PRICE_PRO_YEARLY"
  "STRIPE_PRICE_TEAM_YEARLY"
)

$optionalLlm = @(
  @{ Key = "Z_AI_API_KEY"; Sensitive = $true }
  @{ Key = "OPENAI_API_KEY"; Sensitive = $true }
  @{ Key = "GEMINI_API_KEY"; Sensitive = $true }
)

foreach ($m in $required) {
  $k = $m.Key
  $v = Get-DotEnvValue $envSourcePath $k
  if (-not $v -and $m.LegacyKey) {
    $v = Get-DotEnvValue $envSourcePath $m.LegacyKey
  }
  if (-not $v) {
    $hint = if ($m.LegacyKey) { " (or $($m.LegacyKey))" } else { "" }
    throw "Missing $k$hint in .env - add it before running this script."
  }
  Write-Host "Setting $k ..."
  Invoke-VercelEnvAdd $k $v -Sensitive:($m.Sensitive)
}

foreach ($k in $optionalPrices) {
  $v = Get-DotEnvValue $envSourcePath $k
  if (-not $v) {
    Write-Warning "Optional $k not in .env - monthly list price uses built-in default in the app. Add to match Stripe exactly."
    continue
  }
  Write-Host "Setting $k ..."
  Invoke-VercelEnvAdd $k $v -Sensitive:$false
}

foreach ($k in $optionalYearlyPrices) {
  $v = Get-DotEnvValue $envSourcePath $k
  if (-not $v) {
    Write-Warning "Optional $k not in .env - annual list price uses built-in default until set."
    continue
  }
  Write-Host "Setting $k ..."
  Invoke-VercelEnvAdd $k $v -Sensitive:$false
}

foreach ($k in $optionalYearlyStripe) {
  $v = Get-DotEnvValue $envSourcePath $k
  if (-not $v) {
    Write-Warning "Optional $k not in .env - Annual Checkout for that tier will fail until you add a yearly Stripe Price ID."
    continue
  }
  Write-Host "Setting $k ..."
  Invoke-VercelEnvAdd $k $v -Sensitive:$false
}

foreach ($m in $optionalLlm) {
  $k = $m.Key
  $v = Get-DotEnvValue $envSourcePath $k
  if (-not $v) {
    Write-Warning "Optional $k not in .env - production chat needs at least one LLM key (Z.AI or OpenAI ; Gemini for attachments)."
    continue
  }
  Write-Host "Setting $k ..."
  Invoke-VercelEnvAdd $k $v -Sensitive:($m.Sensitive)
}

Write-Host "Done. Redeploy: npx vercel deploy --prod --yes"
