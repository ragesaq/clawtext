# Inspect BBS directory and common logs
Write-Output "=== Listing top files in C:\BBSV10 (sorted by LastWriteTime desc) ==="
Get-ChildItem -Path 'C:\BBSV10' -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object FullName,Length,LastWriteTime -First 60 | Format-Table -AutoSize

$logPaths = @('C:\BBSV10','C:\BBSV10\\logs','C:\MUD-Scripts')
foreach($p in $logPaths){
    if(Test-Path $p){
        Write-Output "=== Recent log-like files in $p ==="
        Get-ChildItem -Path $p -Include *.log,*.txt,*.out,*.err,*.log.*,*.log? -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-3) } | Sort-Object LastWriteTime -Descending | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize
    } else {
        Write-Output "Path not found: $p"
    }
}

# Tail recent logs
$tailFiles = Get-ChildItem -Path 'C:\BBSV10' -Include *.log,*.txt,*.out,*.err -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) } | Sort-Object LastWriteTime -Descending | Select-Object -First 8
foreach($f in $tailFiles){
    Write-Output "=== TAIL: $($f.FullName) (LastWrite: $($f.LastWriteTime)) ==="
    try{ Get-Content -Path $f.FullName -Tail 300 -ErrorAction Stop } catch { Write-Output "(failed to read $($f.FullName): $_)" }
}

# Check MUD scripts output folder
if(Test-Path 'C:\MUD-Scripts'){
    Write-Output "=== MUD-Scripts directory contents ==="
    Get-ChildItem -Path 'C:\MUD-Scripts' -Recurse -ErrorAction SilentlyContinue | Select-Object FullName,Length,LastWriteTime | Sort-Object LastWriteTime -Descending | Format-Table -AutoSize
}

# Search Application event log for recent errors mentioning wbtrv32, wgsapp, Major, Molt
Write-Output "=== Recent Application events (24h) mentioning keywords ==="
$events = Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=(Get-Date).AddDays(-1)} -ErrorAction SilentlyContinue | Where-Object { ($_.Message -match 'wbtrv32' -or $_.Message -match 'wgsapp' -or $_.Message -match 'Major' -or $_.Message -match 'Molt' -or $_.Message -match 'wbtrv32.dll') }
if($events){
    $events | Select-Object TimeCreated,Id,LevelDisplayName,ProviderName,Message -First 40 | Format-List
} else { Write-Output 'No matching Application events found in the last 24h.' }

# List processes that look like BBS components
Write-Output "=== Processes potentially related to BBS ==="
Get-Process | Where-Object { $_.ProcessName -match 'wgs|maj|mud|molt|bbs|wbtrv' } | Select-Object ProcessName,Id,CPU,StartTime | Format-Table -AutoSize

# Done
Write-Output '=== CHECK COMPLETE ==='