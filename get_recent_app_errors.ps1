$start = (Get-Date).AddHours(-1)
Write-Output "Getting Application errors since: $start"
$events = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2; StartTime=$start} -ErrorAction SilentlyContinue
if($events){
    foreach($e in $events){
        if($e.Message -match 'wgserver|wbtrv32|wgsapp|wgserver.exe|Major'){
            $e | Select-Object TimeCreated,Id,LevelDisplayName,ProviderName,Message | Format-List
        }
    }
} else { Write-Output 'No recent application errors' }
