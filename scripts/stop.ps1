# Stops the Aspi Rash server (whatever is listening on port 3210 on this PC).
$conns = Get-NetTCPConnection -LocalPort 3210 -State Listen -ErrorAction SilentlyContinue
$pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) {
    $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq 'node') { Stop-Process -Id $p -Force }
}
Add-Type -AssemblyName PresentationFramework
$msg = if ($pids) { 'Aspi Rash has been stopped.' } else { 'Aspi Rash was not running.' }
[System.Windows.MessageBox]::Show($msg, 'Aspi Rash', 'OK', 'Information') | Out-Null
