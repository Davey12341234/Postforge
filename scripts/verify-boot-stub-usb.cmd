@echo off
REM No admin required for verify (read-only).
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify-boot-stub-usb.ps1" -DiskNumber 1
echo.
pause
