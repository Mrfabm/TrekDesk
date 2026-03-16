Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = "C:\Users\USER\Documents\IMAi"
backendDir = rootDir & "\backend"
WshShell.CurrentDirectory = rootDir

' Launch the tray scraper (shows gorilla icon in notification area)
WshShell.Run "cmd /c cd /d " & rootDir & " && call backend\venv\Scripts\activate.bat && pythonw tray_scraper.py", 0, False
