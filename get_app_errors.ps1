Write-Output '=== Application Error events (last 6h) ==='
$start=(Get-Date).AddHours(-6)
$errs = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2; StartTime=$start} -ErrorAction SilentlyContinue
if($errs){
  $errs | Select-Object TimeCreated,Id,LevelDisplayName,ProviderName,Message -First 40 | Format-List
} else { Write-Output 'No Application error events in last 6h.' }

Write-Output '=== System Error events (last 6h) ==='
$syserrs = Get-WinEvent -FilterHashtable @{LogName='System'; Level=2; StartTime=$start} -ErrorAction SilentlyContinue
if($syserrs){ $syserrs | Select-Object TimeCreated,Id,LevelDisplayName,ProviderName,Message -First 40 | Format-List } else { Write-Output 'No System error events in last 6h.' }
