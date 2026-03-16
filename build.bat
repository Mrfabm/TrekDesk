@echo off
echo Building Booking App...

REM Install PyInstaller and required tools
pip install pyinstaller psutil

REM Build frontend
cd frontend
echo Installing frontend dependencies...
call npm install
echo Building frontend...
call npm run build
cd ..

REM Install backend dependencies globally (they will be collected by PyInstaller)
echo Installing backend dependencies...
pip install -r backend/requirements.txt

REM Create executable
echo Creating executable...
pyinstaller --clean booking_app.spec

echo Build complete! Executable is in the dist folder.
echo Note: The executable contains all dependencies and will run without Python or Node.js installed. 