@echo off
REM Right-click -> Run as administrator (formats ESP + copies READMEs).
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0finish-bootstub-usb.ps1" -DiskNumber 1
echo.
pause
