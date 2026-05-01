@echo off
REM BabyGPT: check boot-stub USB layout (no admin needed).
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify-boot-stub-usb.ps1" -DiskNumber 1
echo.
pause
