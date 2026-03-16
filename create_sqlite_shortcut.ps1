$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("$desktop\TrekDesk Lite.lnk")
$shortcut.TargetPath = 'wscript.exe'
$shortcut.Arguments = '"C:\Users\USER\Documents\IMAi\start_sqlite.vbs"'
$shortcut.WorkingDirectory = 'C:\Users\USER\Documents\IMAi'
$shortcut.IconLocation = 'C:\Users\USER\Documents\IMAi\icons\app_icon.ico'
$shortcut.Description = 'TrekDesk Lite - SQLite version (no Docker required)'
$shortcut.Save()
Write-Host "SUCCESS: TrekDesk Lite shortcut created on desktop"
