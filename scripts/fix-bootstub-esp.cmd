@echo off
REM Right-click this file -> Run as administrator (DiskPart needs elevation).
REM Bypasses PowerShell execution policy for this run only.
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-bootstub-esp.ps1" -DiskNumber 1
echo.
pause
