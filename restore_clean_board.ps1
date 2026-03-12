$ts = Get-Date -Format yyyyMMdd_HHmmss
$srcBackup = 'C:\docs\BBSV10'
$snapDest = "C:\docs\BBSV10-snap-$ts"
$bbsDir = 'C:\BBSV10'
$log = "C:\Windows\Temp\restore_clean_board_$ts.log"
Start-Transcript -Path $log -Force
Write-Output "Snapshot current C:\BBSV10 -> $snapDest"
if(-not (Test-Path $srcBackup)){
    Write-Output "ERROR: source backup $srcBackup not found. Aborting."; Stop-Transcript; exit 2
}
# Create snapshot of current live BBS
Write-Output "Creating snapshot of current C:\BBSV10 to $snapDest (robocopy)"
robocopy.exe $bbsDir $snapDest /MIR /COPYALL /R:1 /W:1 | Out-String | Write-Output

# Stop known BBS processes if running
$procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match 'wgserver|wgsapp|majormud|wccmmud|wgs' }
if($procs){
    Write-Output "Stopping processes: $($procs | ForEach-Object { $_.ProcessName + ':' + $_.Id } -join ', ')"
    foreach($p in $procs){
        try{ Stop-Process -Id $p.Id -Force -ErrorAction Stop; Write-Output "Stopped $($p.ProcessName) ($($p.Id))" } catch { Write-Output "Failed to stop $($p.ProcessName) ($($p.Id)): $_" }
    }
} else { Write-Output "No matching BBS processes found." }

# Ensure no handle owners for wbtrv32.dll
Write-Output "Checking for wbtrv32.dll handles (Get-Process modules)"
$found = $false
Get-Process | ForEach-Object {
    $p = $_
    try{
        foreach($m in $p.Modules){
            if($m.FileName -like "*wbtrv32.dll"){
                Write-Output "Module owner: $($p.ProcessName) Id=$($p.Id) -> $($m.FileName)"
                $found = $true
            }
        }
    } catch { }
}
if($found){ Write-Output "Warning: wbtrv32.dll still has owners. Proceeding may fail." }

# Remove current BBS dir contents
Write-Output "Deleting contents of $bbsDir"
try{
    Get-ChildItem -Path $bbsDir -Force | Remove-Item -Recurse -Force -ErrorAction Stop
    Write-Output "Deleted contents of $bbsDir"
} catch { Write-Output "Failed to delete some files: $_" }

# Copy backup -> BBS dir using robocopy
Write-Output "Copying $srcBackup -> $bbsDir (robocopy)"
robocopy.exe $srcBackup $bbsDir /MIR /COPYALL /R:1 /W:1 | Out-String | Write-Output

# Verify key files exist
$checkFiles = @('C:\BBSV10\wbtrv32.dll','C:\BBSV10\wgsmenu2.dat')
foreach($f in $checkFiles){ if(Test-Path $f){ Write-Output "OK: $f exists" } else { Write-Output "MISSING: $f" } }

# Start the board
Write-Output "Starting board via C:\MUD-Scripts\start-majormud.ps1"
try{
    & powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\MUD-Scripts\start-majormud.ps1' 2>&1 | ForEach-Object { Write-Output $_ }
} catch { Write-Output "Start script returned error: $_" }

Start-Sleep -Seconds 8
# Check port 23 listening
Write-Output "Checking port 23 listener"
try{
    $tn = Test-NetConnection -ComputerName 127.0.0.1 -Port 23 -InformationLevel Detailed
    $tn | Format-List | Out-String | Write-Output
} catch { Write-Output "Port test failed: $_" }

# Tail primary logs
$tailFiles = @('C:\BBSV10\wbtrv32.log','C:\BBSV10\wgserver.out','C:\BBSV10\wccmmud.log')
foreach($f in $tailFiles){ if(Test-Path $f){ Write-Output "=== TAIL $f ==="; Get-Content -Path $f -Tail 200 } else { Write-Output "$f not found" } }

# Attempt graceful shutdown if script exists
if(Test-Path 'C:\MUD-Scripts\graceful-shutdown.ps1'){
    Write-Output "Running graceful-shutdown.ps1"
    try{ & powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\MUD-Scripts\graceful-shutdown.ps1' 2>&1 | ForEach-Object { Write-Output $_ } } catch { Write-Output "graceful shutdown error: $_" }
} else { Write-Output "No graceful-shutdown.ps1 found" }

# If some processes remain, kill them
$remaining = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match 'wgserver|wgsapp|majormud|wccmmud|wgs' }
if($remaining){ Write-Output "Killing remaining processes: $($remaining | ForEach-Object { $_.ProcessName + ':' + $_.Id } -join ', ')"
    foreach($r in $remaining){
        try{ Stop-Process -Id $r.Id -Force; Write-Output "Killed $($r.ProcessName):$($r.Id)" } catch { Write-Output "Failed to kill $($r.ProcessName):$($r.Id) - $_" }
    }
}

Write-Output 'Restore complete.'
Stop-Transcript
