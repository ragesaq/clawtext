$out='C:\Windows\Temp\wgserver_run_out.txt'
$err='C:\Windows\Temp\wgserver_run_err.txt'
if(Test-Path $out){ Remove-Item $out -Force }
if(Test-Path $err){ Remove-Item $err -Force }
Write-Output "Starting wgserver.exe and capturing stdout/stderr to $out / $err"
$p = Start-Process -FilePath 'C:\BBSV10\wgserver.exe' -WorkingDirectory 'C:\BBSV10' -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
Start-Sleep -Seconds 6
if($p.HasExited){
    Write-Output "wgserver exited with code: $($p.ExitCode)"
    if(Test-Path $out){ Write-Output '=== STDOUT ==='; Get-Content -Path $out -ErrorAction SilentlyContinue }
    if(Test-Path $err){ Write-Output '=== STDERR ==='; Get-Content -Path $err -ErrorAction SilentlyContinue }
} else {
    Write-Output "wgserver still running (Id=$($p.Id)). Stopping it now."
    Stop-Process -Id $p.Id -Force
}
