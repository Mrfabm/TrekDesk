Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' Kill any existing processes on ports 3000 and 8000
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| find "":3000"" ^| find ""LISTENING""') do taskkill /f /pid %a >nul 2>&1", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| find "":8000"" ^| find ""LISTENING""') do taskkill /f /pid %a >nul 2>&1", 0, True

' Start backend with SQLite (no Docker needed)
backendDir = currentDir & "\backend"
WshShell.CurrentDirectory = backendDir
WshShell.Run "cmd /c call venv\Scripts\activate.bat && python run_sqlite.py", 0, False

' Wait for backend to start
WScript.Sleep 5000

' Start frontend
frontendDir = currentDir & "\frontend"
WshShell.CurrentDirectory = frontendDir
WshShell.Run "cmd /c set BROWSER=none&& set NODE_OPTIONS=--max-old-space-size=4096&& npm start --no-open", 0, False

' Wait for frontend to start
WScript.Sleep 8000

' Open browser
WshShell.Run "cmd /c start http://localhost:3000", 0, False
