@echo off
echo Starting Booking App...

REM Kill any existing processes on ports 3000 and 8000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

REM Start backend
cd backend
start cmd /c "env\Scripts\activate && python run.py"

REM Wait a bit for backend to start
timeout /t 5 /nobreak > nul

REM Start frontend
cd ../frontend
start cmd /c "npm start"

REM Wait a bit for frontend to start
timeout /t 5 /nobreak > nul

REM Open in default browser
start http://localhost:3000 