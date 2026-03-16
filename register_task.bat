@echo off
echo ============================================
echo  TrekDesk Scraper - Task Scheduler Setup
echo ============================================
echo.

REM Delete old task if it exists
schtasks /delete /tn "TrekDesk Scraper" /f >nul 2>&1

REM Register: run at every logon
schtasks /create /tn "TrekDesk Scraper" /tr "wscript.exe \"C:\Users\USER\Documents\IMAi\run_scraper.vbs\"" /sc onlogon /rl limited /f

if %errorlevel%==0 (
    echo [OK] Task registered - runs automatically at every Windows logon.
    echo.
    echo Starting scraper tray icon now...
    wscript.exe "C:\Users\USER\Documents\IMAi\run_scraper.vbs"
    echo [OK] Scraper tray icon launched - check your notification area.
) else (
    echo [FAILED] Could not register task.
    echo Try right-clicking this file and selecting "Run as administrator".
)

echo.
echo Done.
