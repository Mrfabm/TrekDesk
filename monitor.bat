@echo off
title App Monitor
:loop
timeout /t 5 /nobreak > nul
netstat -an | find "3000" | find "ESTABLISHED" > nul
if errorlevel 1 (
    rem No active connections to frontend, wait a bit to confirm
    timeout /t 10 /nobreak > nul
    netstat -an | find "3000" | find "ESTABLISHED" > nul
    if errorlevel 1 (
        rem Still no connections, clean up
        for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
        for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
        del "C:\Users\USER\Documents\IMAi\app_running.flag"
        exit
    )
)
if not exist "C:\Users\USER\Documents\IMAi\app_running.flag" exit
goto loop
