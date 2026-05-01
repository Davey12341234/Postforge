# Run as Administrator (right-click PowerShell -> Run as administrator, then run this file).
# Sets the boot-stub EFI volume (drive T:) label to BABYGPTBOOT (11 chars, FAT32 max).
$ErrorActionPreference = "Stop"
$dp = Join-Path $env:TEMP "dp-label.txt"
@"
select volume T
label BABYGPTBOOT
exit
"@ | Set-Content -Path $dp -Encoding ASCII
& diskpart.exe /s $dp
Remove-Item -LiteralPath $dp -Force -ErrorAction SilentlyContinue
Write-Host "Done. Check This PC -> drive T: should show BABYGPTBOOT" -ForegroundColor Green
