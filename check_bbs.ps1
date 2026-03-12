Write-Output '=== tasklist /m wbtrv32.dll ==='
cmd /c 'tasklist /m wbtrv32.dll'
Write-Output '=== processes with majorbbs keywords ==='
Get-Process | Where-Object { $_.ProcessName -match 'bbs|mbbs|major|molt|synchron' } | Select-Object ProcessName,Id,CPU,StartTime | Format-Table -AutoSize
Write-Output '=== scheduled tasks containing BBS or Major ==='
schtasks /query /fo LIST /v | Select-String -Pattern 'BBS','Major','Molt' -SimpleMatch | ForEach-Object { $_.Line }
