# Called by set-babygpt-vercel-prod-env.ps1 — avoids PowerShell hanging on sequential `npx vercel env add`.
param(
  [Parameter(Mandatory)][string]$Name,
  [Parameter(Mandatory)][string]$Value,
  [switch]$Sensitive
)
$ErrorActionPreference = "Stop"
$env:CI = "true"
Set-Location (Join-Path $PSScriptRoot "..")
$npx = (Get-Command npx.cmd -ErrorAction Stop).Source
$vargs = @("vercel@latest", "env", "add", $Name, "production", "--yes", "--force")
if ($Sensitive) { $vargs += "--sensitive" }
$vargs += @("--value", $Value)
& $npx @vargs
exit $LASTEXITCODE
