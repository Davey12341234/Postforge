# Find hosts that respond to ping on the USB Ethernet cable (no admin).
param(
  [string]$InterfaceAlias = "Ethernet 4",
  [int]$TimeoutMs = 250
)
$ping = [System.Net.NetworkInformation.Ping]::new()
$found = [System.Collections.Generic.List[string]]::new()

function Test-Range([string]$label, [string[]]$ips) {
  Write-Host "Scanning $label ($($ips.Count) targets)..."
  foreach ($ip in $ips) {
    try {
      $r = $ping.Send($ip, $TimeoutMs)
      if ($r.Status -eq 'Success') {
        $null = $found.Add($ip)
        Write-Host "  $ip"
      }
    } catch {}
  }
}

# Same /24 we used before the static 192.168.x move (skip .14 = this machine if dual-stack)
$ll24 = 1..254 | Where-Object { $_ -ne 14 } | ForEach-Object { "169.254.180.$_" }
# Common static plan
$st = 2..30 | ForEach-Object { "192.168.99.$_" }

Test-Range "169.254.180.0/24" $ll24
Test-Range "192.168.99.2-30" $st

$ping.Dispose()
Write-Host ""
if ($found.Count -eq 0) {
  Write-Host "No ICMP replies. Try: cable, server power, or configure the peer IP manually."
} else {
  Write-Host "Reachable: $($found -join ', ')"
  Write-Host "Try: ssh USER@$($found[0])"
}
