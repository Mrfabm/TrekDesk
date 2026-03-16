$action = New-ScheduledTaskAction `
    -Execute 'wscript.exe' `
    -Argument '"C:\Users\USER\Documents\IMAi\run_scraper.vbs"' `
    -WorkingDirectory 'C:\Users\USER\Documents\IMAi'

$triggerLogon = New-ScheduledTaskTrigger -AtLogOn

$triggerRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Hours 3)

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RunOnlyIfNetworkAvailable `
    -StartWhenAvailable `
    -Hidden

Register-ScheduledTask `
    -TaskName 'TrekDesk Scraper' `
    -Action $action `
    -Trigger $triggerLogon, $triggerRepeat `
    -Settings $settings `
    -RunLevel Limited `
    -Force

Write-Host "SUCCESS: TrekDesk Scraper task registered"
Write-Host "  - Runs at every logon"
Write-Host "  - Runs every 3 hours"
Write-Host "  - Multiple instances: IgnoreNew (won't run twice at same time)"
