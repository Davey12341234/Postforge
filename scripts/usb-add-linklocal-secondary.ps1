# Elevated: add APIPA secondary so this PC can talk to a peer still on 169.254.0.0/16.
# Primary 192.168.99.1 stays; does not remove existing addresses.
$ErrorActionPreference = "Stop"
$log = Join-Path $env:TEMP "postforge-usb-nic.log"
$alias = "Ethernet 4"
$ll = "169.254.180.14"
$mask = "255.255.0.0"
try {
  $existing = Get-NetIPAddress -InterfaceAlias $alias -AddressFamily IPv4 | Where-Object { $_.IPAddress -eq $ll }
  if (-not $existing) {
    & netsh interface ip add address "$alias" $ll $mask
    if ($LASTEXITCODE -ne 0) { throw "netsh add address exit $LASTEXITCODE" }
  }
  "$(Get-Date -Format o) OK: added secondary $ll on $alias" | Add-Content -Path $log -Encoding utf8
} catch {
  "$(Get-Date -Format o) FAIL add secondary: $_" | Add-Content -Path $log -Encoding utf8
  throw
}
