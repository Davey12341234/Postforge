# Set a static IPv4 on a Windows Ethernet adapter for a direct cable to another machine
# (e.g. PC <--USB-Ethernet--> server). Run PowerShell as Administrator.
#
# List adapters (find your USB-Ethernet name):
#   Get-NetAdapter | Format-Table Name, InterfaceDescription, Status, LinkSpeed
#
# Example:
#   .\scripts\set-direct-link-ethernet.ps1 -InterfaceAlias "Ethernet 4" -IPAddress 10.10.10.1
#
param(
  [Parameter(Mandatory = $true)]
  [string]$InterfaceAlias,
  [string]$IPAddress = "10.10.10.1",
  [int]$PrefixLength = 24
)

#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$adapter = Get-NetAdapter -Name $InterfaceAlias -ErrorAction Stop
if ($adapter.Status -ne 'Up') {
  Write-Warning "Adapter '$InterfaceAlias' is not Up. Check cable and retry."
}

$parts = $IPAddress.Split('.')
if ($parts.Count -ne 4) { throw "Invalid IPAddress: $IPAddress" }
$serverIp = "{0}.{1}.{2}.2" -f $parts[0], $parts[1], $parts[2]

Get-NetIPAddress -InterfaceAlias $InterfaceAlias -ErrorAction SilentlyContinue | Remove-NetIPAddress -Confirm:$false
Remove-NetRoute -DestinationPrefix "0.0.0.0/0" -InterfaceAlias $InterfaceAlias -Confirm:$false -ErrorAction SilentlyContinue

New-NetIPAddress -InterfaceAlias $InterfaceAlias -IPAddress $IPAddress -PrefixLength $PrefixLength

Write-Host ""
Write-Host "This PC:  $IPAddress/$PrefixLength on '$InterfaceAlias'" -ForegroundColor Green
Write-Host "Set peer: $serverIp/$PrefixLength (e.g. Ubuntu netplan or nmcli on the server)"
Write-Host "Then:     ping $serverIp"
Write-Host "          ssh user@$serverIp"
Write-Host ""
