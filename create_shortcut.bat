@echo off
echo Creating Booking App shortcut with custom icon...

REM Create the shortcut using PowerShell
powershell -Command ^
$WshShell = New-Object -comObject WScript.Shell; ^
$Shortcut = $WshShell.CreateShortcut($WshShell.SpecialFolders('Desktop') + '\Booking App.lnk'); ^
$Shortcut.TargetPath = '%CD%\run_hidden.vbs'; ^
$Shortcut.IconLocation = '%CD%\icons\app_icon.ico'; ^
$Shortcut.Save()

echo Shortcut created on your desktop with custom icon!
pause 