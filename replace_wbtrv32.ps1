$time = Get-Date -Format yyyyMMdd_HHmm
$backupDir = 'C:\docs\BBSV10'
if (-not (Test-Path $backupDir)) { New-Item -Path $backupDir -ItemType Directory -Force }
Copy-Item -Path 'C:\BBSV10\wbtrv32.dll' -Destination (Join-Path $backupDir ("wbtrv32.dll.$time.bak")) -Force
$home = $env:USERPROFILE
$src = Join-Path $home 'wbtrv32.dll'
if (-not (Test-Path $src)) { Write-Output "SRC_NOT_FOUND: $src"; exit 2 }
try {
  Move-Item -Path $src -Destination 'C:\BBSV10\wbtrv32.dll' -Force
  Get-Item 'C:\BBSV10\wbtrv32.dll' | Select-Object Name,Length,LastWriteTime
} catch {
  Write-Output "MOVE_FAILED: $_"
  exit 3
}
