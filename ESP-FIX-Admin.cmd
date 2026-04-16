@echo off
title BabyGPT boot-stub ESP fix (DiskPart only — no PowerShell scripts)
cd /d "%~dp0"

net session >nul 2>&1
if %errorLevel% neq 0 (
  echo.
  echo  ERROR: This must run as Administrator.
  echo  Do NOT double-click only. Instead:
  echo    1^) Right-click this file  -^>  "Run as administrator"
  echo    2^) Click Yes on UAC
  echo.
  echo  If that is greyed out: Start menu -^> type "cmd" -^> right-click Command Prompt
  echo  -^> Run as administrator, then run:
  echo    cd /d "%~dp0"
  echo    ESP-FIX-Admin.cmd
  echo.
  pause
  exit /b 1
)

set "DP=%TEMP%\babygpt-esp-diskpart.txt"
(
echo select disk 1
echo select partition 1
echo format quick fs=fat32 label=BABYGPTBOOT
echo assign letter=T
echo exit
) > "%DP%"

echo Running DiskPart...
diskpart /s "%DP%"
set "DPERR=%errorLevel%"
del "%DP%" 2>nul

if not exist "T:\" (
  echo.
  echo  T: did not mount. Check Disk Management: assign a drive letter to the ~550 MB partition, then copy:
  echo    deploy\proliant\BOOT-USB-README.txt  -^>  T:\
  pause
  exit /b 1
)

copy /Y "deploy\proliant\BOOT-USB-README.txt" "T:\BOOT-USB-README.txt" >nul
echo.
echo  Done. Volume T: should show label BABYGPTBOOT.
vol T:
echo.
echo  Next: npm run proliant:verify-usb   ^(from a normal terminal^)
pause
exit /b 0
