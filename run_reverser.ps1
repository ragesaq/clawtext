$dllPath = 'C:\Users\mud-admin.CRUSTSERV\wbtrv32.dll'
if(-not (Test-Path $dllPath)){
    Write-Output "DLL_NOT_FOUND: $dllPath"
    exit 2
}
$code = @'
using System;
using System.Runtime.InteropServices;
public static class NativeExports {
    [DllImport("C:\\Users\\mud-admin.CRUSTSERV\\wbtrv32.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    public static extern int WBTRV32_EXPORT_ALL_DB_TO_DAT(string directoryPathUtf8, out uint exportedCount);
    [DllImport("C:\\Users\\mud-admin.CRUSTSERV\\wbtrv32.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    public static extern int WBTRV32_EXPORT_DB_TO_DAT(string dbPathUtf8);
}
'@
Add-Type -TypeDefinition $code -Language CSharp
try{
    [uint32]$count = 0
    $res = [NativeExports]::WBTRV32_EXPORT_ALL_DB_TO_DAT('C:\BBSV10', [ref]$count)
    Write-Output "EXPORT_ALL_RESULT=$res"
    Write-Output "EXPORT_ALL_COUNT=$count"
    # Also run a single DB export for wgsmenu2.db as smoke test
    $res2 = [NativeExports]::WBTRV32_EXPORT_DB_TO_DAT('C:\BBSV10\wgsmenu2.db')
    Write-Output "EXPORT_WGSMENU2_RESULT=$res2"
} catch {
    Write-Output "EXCEPTION: $_"
    exit 3
}
