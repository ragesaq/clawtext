$patterns = 'error|fail|exception|unable|fatal|traceback|segfault|access is denied|access denied'
$paths = @('C:\BBSV10','C:\MUD-Scripts','C:\BBSV10\\logs')
foreach($p in $paths){
  if(Test-Path $p){
    Write-Output "=== Searching logs in $p ==="
    Get-ChildItem -Path $p -Include *.log,*.out,*.txt,*.err -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) } | ForEach-Object {
      $f = $_.FullName
      try{
        $matches = Select-String -Path $f -Pattern $patterns -CaseSensitive:$false -AllMatches -Context 2 -ErrorAction Stop
        if($matches){
          Write-Output "--- Matches in $f ---"
          $matches | ForEach-Object { Write-Output "[Line $($_.LineNumber)] $_.Line"; if($_.Context.PreContext){ $_.Context.PreContext | ForEach-Object { Write-Output "PRE: $_" } }; if($_.Context.PostContext){ $_.Context.PostContext | ForEach-Object { Write-Output "POST: $_" } } }
        }
      } catch { }
    }
  }
}

# Also search the big wbtrv32.log specifically for 'Error' with context
$f = 'C:\BBSV10\\wbtrv32.log'
if(Test-Path $f){
  Write-Output "=== Scanning wbtrv32.log for ERROR keywords ==="
  Select-String -Path $f -Pattern $patterns -CaseSensitive:$false -AllMatches -Context 3 | ForEach-Object { Write-Output "[File:$($_.Path) Line:$($_.LineNumber)] $_.Line"; if($_.Context.PreContext){ $_.Context.PreContext | ForEach-Object { Write-Output "PRE: $_" } }; if($_.Context.PostContext){ $_.Context.PostContext | ForEach-Object { Write-Output "POST: $_" } } }
}
Write-Output '=== SEARCH COMPLETE ==='