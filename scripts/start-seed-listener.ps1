# Picks a sensible LAN IPv4 (10.x / 192.168.x) and serves the autoinstall seed (Python stdlib; no Windows URL ACL).
param([int]$Port = 8080)
$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$candidates = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"
} | Sort-Object -Property InterfaceMetric
$ip = ($candidates | Where-Object { $_.IPAddress -match '^(10\.|192\.168\.)' } | Select-Object -First 1).IPAddress
if (-not $ip) {
  $ip = ($candidates | Select-Object -First 1).IPAddress
}
if (-not $ip) {
  Write-Error "No non-loopback IPv4 found."
}
Write-Host "Binding seed HTTP to http://${ip}:${Port}/ (Python)" -ForegroundColor Cyan
$py = Join-Path $PSScriptRoot "serve-babygpt-staging-http.py"
& python $py --repo-root $RepoRoot --bind $ip --port $Port
