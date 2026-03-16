@echo off
echo Building Booking App Launcher...

REM Install PyInstaller if not already installed
pip install pyinstaller psutil

REM Create executable using Python module execution
python -m PyInstaller --clean app_launcher.spec

REM Create shortcut on desktop using absolute path
echo Creating desktop shortcut...
powershell "$WS = New-Object -ComObject WScript.Shell; $SC = $WS.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Booking App.lnk'); $SC.TargetPath = '%CD%\dist\BookingApp.exe'; $SC.WorkingDirectory = '%CD%\dist'; $SC.Save()"

echo Build complete! 
echo A shortcut has been created on your desktop named "Booking App"
pause 