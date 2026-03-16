@echo off
echo Starting Booking App...

REM Kill any existing processes on ports 3000 and 8000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

REM Start backend
cd backend
start /min cmd /c "call venv\Scripts\activate.bat && python run.py"

REM Wait a bit for backend to start
timeout /t 5 /nobreak > nul

REM Start frontend
cd ../frontend
start /min cmd /c "set NODE_OPTIONS=--max-old-space-size=4096 && npm start"

REM Wait a bit for frontend to start
timeout /t 5 /nobreak > nul

REM Open in default browser
start http://localhost:3000

echo App started! You can close this window. 