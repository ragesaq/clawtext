$files = @(
  'C:\\BBSV10\\wgserver.out',
  'C:\\BBSV10\\wgsserver.out',
  'C:\\BBSV10\\wccmmud.log',
  'C:\\BBSV10\\wgserver.err',
  'C:\\BBSV10\\wgsapp.log'
)
foreach($f in $files){
  if(Test-Path $f){
    Write-Output "=== TAIL $f ==="
    Get-Content -Path $f -Tail 300
  } else {
    Write-Output "NOT_FOUND: $f"
  }
}
