$target = 'wbtrv32.dll'
$found = $false
Get-Process | ForEach-Object {
    $p = $_
    try{
        foreach($m in $p.Modules){
            if($m.FileName -like "*${target}"){
                Write-Output "Process: $($p.ProcessName) Id=$($p.Id) Module=$($m.FileName)"
                $found = $true
            }
        }
    } catch { }
}
if(-not $found){ Write-Output 'NO_MODULE_OWNERS_FOUND' }
