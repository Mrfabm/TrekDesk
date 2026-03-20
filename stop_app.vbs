Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Kill backend and frontend processes silently
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| find "":3000"" ^| find ""LISTENING""') do taskkill /f /pid %a >nul 2>&1", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| find "":8000"" ^| find ""LISTENING""') do taskkill /f /pid %a >nul 2>&1", 0, True

' Remove running flag
flagFile = currentDir & "\app_running.flag"
If fso.FileExists(flagFile) Then fso.DeleteFile flagFile

MsgBox "TrekDesk stopped.", vbInformation, "TrekDesk"
