$url = 'https://download.sysinternals.com/files/handle.exe'
$out = 'C:\Windows\Temp\handle.exe'
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
Write-Output "Downloaded: $out"
& $out 'wbtrv32.dll' | Write-Output
