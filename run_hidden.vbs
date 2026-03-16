Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' Kill existing processes
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| find "":3000"" ^| find ""LISTENING""') do taskkill /f /pid %a >nul 2>&1", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| find "":8000"" ^| find ""LISTENING""') do taskkill /f /pid %a >nul 2>&1", 0, True

' Create a flag file to indicate the app is running
flagFile = currentDir & "\app_running.flag"
Set flagStream = fso.CreateTextFile(flagFile, True)
flagStream.Close

' Start Docker Desktop if not already running
WshShell.Run """C:\Program Files\Docker\Docker\Docker Desktop.exe""", 1, False
WScript.Sleep 15000

' Ensure PostgreSQL Docker container is running (fire-and-forget, don't block on Docker API errors)
WshShell.Run "cmd /c docker start imai-postgres >nul 2>&1", 0, False
WScript.Sleep 5000

' Start backend
backendDir = currentDir & "\backend"
WshShell.CurrentDirectory = backendDir
WshShell.Run "cmd /c call venv\Scripts\activate.bat && python run.py", 0, False

' Wait for backend to start
WScript.Sleep 5000

' Start frontend with environment variables to prevent auto-browser-open
frontendDir = currentDir & "\frontend"
WshShell.CurrentDirectory = frontendDir
WshShell.Run "cmd /c set BROWSER=none&& set NODE_OPTIONS=--max-old-space-size=4096&& npm start --no-open", 0, False

' Wait for frontend to start
WScript.Sleep 8000

' Open browser
WshShell.Run "cmd /c start http://localhost:3000", 0, False

' Create a monitoring script
Set monitorFile = fso.CreateTextFile(currentDir & "\monitor.bat", True)
monitorFile.WriteLine "@echo off"
monitorFile.WriteLine "title App Monitor"
monitorFile.WriteLine ":loop"
monitorFile.WriteLine "timeout /t 5 /nobreak > nul"
monitorFile.WriteLine "netstat -an | find ""3000"" | find ""ESTABLISHED"" > nul"
monitorFile.WriteLine "if errorlevel 1 ("
monitorFile.WriteLine "    rem No active connections to frontend, wait a bit to confirm"
monitorFile.WriteLine "    timeout /t 10 /nobreak > nul"
monitorFile.WriteLine "    netstat -an | find ""3000"" | find ""ESTABLISHED"" > nul"
monitorFile.WriteLine "    if errorlevel 1 ("
monitorFile.WriteLine "        rem Still no connections, clean up"
monitorFile.WriteLine "        for /f ""tokens=5"" %%a in ('netstat -aon ^| find "":3000"" ^| find ""LISTENING""') do taskkill /f /pid %%a >nul 2>&1"
monitorFile.WriteLine "        for /f ""tokens=5"" %%a in ('netstat -aon ^| find "":8000"" ^| find ""LISTENING""') do taskkill /f /pid %%a >nul 2>&1"
monitorFile.WriteLine "        del """ & flagFile & """"
monitorFile.WriteLine "        exit"
monitorFile.WriteLine "    )"
monitorFile.WriteLine ")"
monitorFile.WriteLine "if not exist """ & flagFile & """ exit"
monitorFile.WriteLine "goto loop"
monitorFile.Close

' Start the monitor in hidden window
WshShell.Run "cmd /c start /min """ & currentDir & "\monitor.bat""", 0, False 