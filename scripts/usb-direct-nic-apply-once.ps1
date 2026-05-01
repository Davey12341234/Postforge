# Runs elevated via UAC — writes result for verification.
$log = Join-Path $env:TEMP "postforge-usb-nic.log"
$alias = "Ethernet 4"
$ip = "192.168.99.1"
$mask = "255.255.255.0"
try {
  $null = netsh interface ip set address "$alias" static $ip $mask 2>&1
  if ($LASTEXITCODE -ne 0) { throw "netsh exit $LASTEXITCODE" }
  try { Set-NetConnectionProfile -InterfaceAlias $alias -NetworkCategory Private } catch {}
  "$(Get-Date -Format o) OK: $alias -> $ip/$mask" | Out-File -FilePath $log -Encoding utf8
} catch {
  "$(Get-Date -Format o) FAIL: $_" | Out-File -FilePath $log -Encoding utf8
  throw
}
