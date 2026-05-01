# Serves deploy/proliant/staging + automation/nocloud over HTTP for Ubuntu autoinstall (ds=nocloud-net).
# Run on your Windows PC on the SAME network segment as the server during install.
#
# 1. Copy user-data.template.yaml to deploy/proliant/automation/nocloud/user-data (no extension) and edit CHANGEME + IPs.
# 2. Run (Admin optional; uses HttpListener):
#    .\scripts\serve-babygpt-staging-http.ps1 -ListenIp 0.0.0.0 -Port 8080
# 3. Installer kernel cmdline must include:
#      autoinstall ds=nocloud-net\;s=http://THIS_PC_IP:8080/
#
# Stop: Ctrl+C
param(
  [string]$ListenIp = "0.0.0.0",
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Staging = Join-Path $RepoRoot "deploy\proliant\staging"
$Nocloud = Join-Path $RepoRoot "deploy\proliant\automation\nocloud"

if (-not (Test-Path $Staging)) {
  Write-Error "Missing staging folder: $Staging"
}

$prefix = "http://${ListenIp}:${Port}/"
if ($ListenIp -eq "0.0.0.0") {
  $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object -ExpandProperty IPAddress
  $hint = ($ips | Select-Object -First 3) -join ", "
  Write-Host "Listening on all interfaces :$Port"
  Write-Host "Try seed URL: http://<this-pc-lan-ip>:$Port/"
  Write-Host "Detected IPv4 candidates: $hint"
} else {
  Write-Host "Seed base URL: http://${ListenIp}:$Port/"
}

$listener = New-Object System.Net.HttpListener
# Binding http://+:port/ requires Admin URL ACL. Binding a specific LAN IP usually works without elevation.
if ($ListenIp -eq "0.0.0.0") {
  $listener.Prefixes.Add("http://+:$Port/")
} else {
  $listener.Prefixes.Add("http://${ListenIp}:${Port}/")
}
try {
  $listener.Start()
} catch {
  Write-Error "Could not bind (try -ListenIp <this-pc-lan-ip>, Admin PowerShell, or netsh urlacl): $_"
}

Write-Host "Serving:"
Write-Host "  $Staging  -> /babygpt-src.zip, /bootstrap.sh, ..."
Write-Host "  $Nocloud  -> /user-data, /meta-data (if files exist)"
Write-Host ""
Write-Host "Press Ctrl+C to stop."
Write-Host ""

function Send-File($res, $path, $ctype) {
  if (-not (Test-Path -LiteralPath $path)) {
    $res.StatusCode = 404
    $buf = [Text.Encoding]::UTF8.GetBytes("Not found")
    $res.ContentLength64 = $buf.Length
    $res.OutputStream.Write($buf, 0, $buf.Length)
    $res.OutputStream.Flush()
    return
  }
  $bytes = [System.IO.File]::ReadAllBytes($path)
  $res.ContentType = $ctype
  $res.StatusCode = 200
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.OutputStream.Flush()
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  $path = $req.Url.AbsolutePath.TrimEnd("/")
  if ($path -eq "") { $path = "/" }

  try {
    switch -Regex ($path) {
      "^/$" {
        $msg = "BabyGPT staging. Use autoinstall ds=nocloud-net;s=http://<this-host>:$Port/`n"
        $b = [Text.Encoding]::UTF8.GetBytes($msg)
        $res.StatusCode = 200
        $res.ContentType = "text/plain"
        $res.ContentLength64 = $b.Length
        $res.OutputStream.Write($b, 0, $b.Length)
        $res.OutputStream.Flush()
      }
      "^/user-data$" {
        $p = Join-Path $Nocloud "user-data"
        if (-not (Test-Path $p)) { $p = Join-Path $Nocloud "user-data.template.yaml" }
        Send-File $res $p "text/cloud-config"
      }
      "^/meta-data$" {
        Send-File $res (Join-Path $Nocloud "meta-data") "text/plain"
      }
      "^/babygpt-src.zip$" {
        Send-File $res (Join-Path $Staging "babygpt-src.zip") "application/zip"
      }
      "^/bootstrap.sh$" {
        Send-File $res (Join-Path $Staging "bootstrap.sh") "application/x-sh"
      }
      "^/bring-online.sh$" {
        Send-File $res (Join-Path $Staging "bring-online.sh") "application/x-sh"
      }
      "^/babygpt.service$" {
        Send-File $res (Join-Path $Staging "babygpt.service") "text/plain"
      }
      default {
        $res.StatusCode = 404
        $b = [Text.Encoding]::UTF8.GetBytes("Not found: $path")
        $res.ContentLength64 = $b.Length
        $res.OutputStream.Write($b, 0, $b.Length)
        $res.OutputStream.Flush()
      }
    }
  } finally {
    $res.Close()
  }
}
