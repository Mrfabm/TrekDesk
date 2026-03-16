@echo off
echo Stopping TrekDesk...

for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

del "%~dp0app_running.flag" >nul 2>&1

echo Done. Ports 3000 and 8000 are now free.
pause
