<#
CRITICAL NOTE FOR CURSOR / AGENTS
================================
- Never paste placeholder commands like YOUR_NEON_URL_HERE. Always Read-Path ".env" (repo root),
  parse DATABASE_URL, OPENAI_API_KEY, NEXTAUTH_SECRET, and substitute real strings before any API call.
- Vercel project URLs MUST use the project ID from .vercel/project.json (field "projectId", e.g. prj_...)
  plus query teamId= (field "orgId", e.g. team_...). Do NOT use deployment hostnames or display names in
  /v10/projects/... paths — those return 404. If you get 404, run: npx vercel ls --scope <team-slug>
  and confirm the project name; the API path uses projectId, not slug.
- This script requires $env:VERCEL_TOKEN (create at https://vercel.com/account/tokens). auth.json is often
  absent on Windows; the CLI still works via other stores, but REST needs an explicit token.
#>
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not $env:VERCEL_TOKEN -or $env:VERCEL_TOKEN.Length -lt 10) {
  throw "Set VERCEL_TOKEN to a Vercel personal token (Dashboard → Tokens), then re-run."
}

$proj = Get-Content ".vercel\project.json" -Raw | ConvertFrom-Json
$projectId = $proj.projectId
$teamId = $proj.orgId

function Get-DotEnvValue([string]$key) {
  $line = Get-Content ".env" | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
  if (-not $line) { throw "Missing $key in .env" }
  $raw = ($line -split "=", 2)[1].Trim()
  if ($raw.StartsWith('"') -and $raw.EndsWith('"')) { $raw = $raw.Substring(1, $raw.Length - 2) }
  return $raw.Trim()
}

$db = Get-DotEnvValue "DATABASE_URL"
$openai = Get-DotEnvValue "OPENAI_API_KEY"
$nextAuthSecret = Get-DotEnvValue "NEXTAUTH_SECRET"
$nextAuthUrl = "https://postforge2.vercel.app"

$headers = @{
  Authorization = "Bearer $($env:VERCEL_TOKEN)"
  "Content-Type" = "application/json"
}

$base = "https://api.vercel.com/v10/projects/$projectId/env?teamId=$teamId&upsert=true"

$vars = @(
  @{ key = "DATABASE_URL";    value = $db;            type = "encrypted" },
  @{ key = "NEXTAUTH_URL";    value = $nextAuthUrl;   type = "encrypted" },
  @{ key = "NEXTAUTH_SECRET"; value = $nextAuthSecret; type = "encrypted" },
  @{ key = "OPENAI_API_KEY";  value = $openai;        type = "encrypted" }
)

foreach ($v in $vars) {
  $bodyObj = @{
    key     = $v.key
    value   = $v.value
    type    = $v.type
    target  = @("production")
  }
  $body = $bodyObj | ConvertTo-Json -Compress -Depth 5
  try {
    Invoke-RestMethod -Uri $base -Method Post -Headers $headers -Body $body | Out-Null
    Write-Host "OK: $($v.key)"
  } catch {
    $err = $_.ErrorDetails.Message
    if ($_.Exception.Response.StatusCode -eq 404) {
      throw "404 from Vercel API — check projectId=$projectId and teamId=$teamId in .vercel/project.json (not the deployment URL slug)."
    }
    throw $_
  }
}

Write-Host "Triggering production deploy via CLI..."
$npx = (Get-Command npx.cmd).Source
$p = Start-Process -FilePath $npx -ArgumentList @("vercel@latest", "deploy", "--prod", "--yes", "--force") -Wait -PassThru -NoNewWindow
exit $p.ExitCode
