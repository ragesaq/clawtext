$hours = 2
Write-Output "=== Recent files in C:\\MUD-Scripts (last $hours h) ==="
if(Test-Path 'C:\MUD-Scripts'){
  Get-ChildItem -Path 'C:\MUD-Scripts' -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-$hours) } | Sort-Object LastWriteTime -Descending | Select-Object FullName,Length,LastWriteTime -First 80 | Format-Table -AutoSize
} else { Write-Output 'C:\MUD-Scripts not found' }
Write-Output "=== Recent files in C:\\BBSV10 (last $hours h) ==="
if(Test-Path 'C:\BBSV10'){
  Get-ChildItem -Path 'C:\BBSV10' -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-$hours) } | Sort-Object LastWriteTime -Descending | Select-Object FullName,Length,LastWriteTime -First 80 | Format-Table -AutoSize
} else { Write-Output 'C:\BBSV10 not found' }
