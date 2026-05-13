@echo off
REM If this errors (UAC / RunAs blocked), use ESP-FIX-Admin.cmd instead:
REM   Right-click ESP-FIX-Admin.cmd -> Run as administrator  (no PowerShell scripts)
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-fix-bootstub-admin.ps1"
if errorlevel 1 (
  echo.
  echo If you saw an error, use: Right-click ESP-FIX-Admin.cmd -^> Run as administrator
  pause
)
