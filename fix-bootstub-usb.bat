@echo off
REM BabyGPT: repair boot-stub USB ESP (FAT32 BABYGPTBOOT on T:). REQUIRES ADMIN.
REM Double-click -> if UAC: approve. Or: right-click -> Run as administrator.
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fix-bootstub-esp.ps1" -DiskNumber 1
echo.
pause
