@echo off
set "PS1=%~dp0usb-direct-nic-setup.ps1"
echo Requesting Administrator permission...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%PS1%'"
echo.
echo If the window closed quickly, click Yes on the UAC prompt next time.
pause
