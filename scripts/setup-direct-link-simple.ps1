# Interactive: pick your USB-Ethernet adapter and set this PC to 10.10.10.1/24
# Run in PowerShell as Administrator.
# See: deploy/proliant/HELP-STEPS.md

#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Direct link helper ===" -ForegroundColor Cyan
Write-Host "This sets THIS Windows PC to 10.10.10.1 so the server can use 10.10.10.2"
Write-Host ""

$adapters = @(Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Sort-Object Name)
if ($adapters.Count -eq 0) {
  Write-Host "No adapters are Up. Plug in the USB-Ethernet dongle and run again." -ForegroundColor Yellow
  exit 1
}

$i = 0
foreach ($a in $adapters) {
  $i++
  $desc = $a.InterfaceDescription
  Write-Host "  [$i] $($a.Name)  |  $desc"
}

Write-Host ""
$choice = Read-Host "Type the number for your USB-Ethernet row (often says USB / ASIX / Realtek), then Enter"
$idx = 0
if (-not [int]::TryParse($choice, [ref]$idx) -or $idx -lt 1 -or $idx -gt $adapters.Count) {
  Write-Host "Invalid choice." -ForegroundColor Red
  exit 1
}

$name = $adapters[$idx - 1].Name
$pcIp = "10.10.10.1"
$serverIp = "10.10.10.2"
$prefix = 24

Write-Host ""
Write-Host "Using adapter: $name" -ForegroundColor Green

Get-NetIPAddress -InterfaceAlias $name -ErrorAction SilentlyContinue | Remove-NetIPAddress -Confirm:$false

New-NetIPAddress -InterfaceAlias $name -IPAddress $pcIp -PrefixLength $prefix

Write-Host ""
Write-Host "Done. This PC: $pcIp/$prefix" -ForegroundColor Green
Write-Host "On the server, set $serverIp/$prefix on the NIC that has this cable (see HELP-STEPS.md)."
Write-Host "Then on this PC run:  ping $serverIp"
Write-Host ""
