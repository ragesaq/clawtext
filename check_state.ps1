Write-Output '=== Process list (wgserver/wgs* etc) ==='
Get-Process | Where-Object { $_.ProcessName -match 'wgserver|wgs|majormud|wccmmud|wgsapp' } | Select-Object ProcessName,Id,CPU,StartTime | Format-Table -AutoSize
Write-Output '=== wgserver.exe file info ==='
if(Test-Path 'C:\BBSV10\\wgserver.exe'){ Get-Item 'C:\BBSV10\\wgserver.exe' | Format-List * } else { Write-Output 'wgserver.exe not found' }
Write-Output '=== tail wbtrv32.log if exists ==='
if(Test-Path 'C:\BBSV10\\wbtrv32.log'){ Get-Content -Path 'C:\BBSV10\\wbtrv32.log' -Tail 200 } else { Write-Output 'wbtrv32.log not found' }
Write-Output '=== Application events 1:00-1:20 ==='
$st=(Get-Date '2026-03-11T01:00:00'); $en=(Get-Date '2026-03-11T01:20:00');
Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=$st; EndTime=$en} | Where-Object { $_.Message -match 'wgserver|wbtrv32|wgs' } | Select-Object TimeCreated,Id,LevelDisplayName,ProviderName,Message | Format-List
