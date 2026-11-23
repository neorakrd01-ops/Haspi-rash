# Creates "Aspi Rash" and "Stop Aspi Rash" shortcuts on the desktop.
$root = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

foreach ($s in @(
    @{ Name = 'Aspi Rash';      Script = 'start.ps1'; Icon = 'imageres.dll,170' },
    @{ Name = 'Stop Aspi Rash'; Script = 'stop.ps1';  Icon = 'imageres.dll,93' }
)) {
    $lnk = $shell.CreateShortcut((Join-Path $desktop "$($s.Name).lnk"))
    $lnk.TargetPath = $ps
    $lnk.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot $s.Script)`""
    $lnk.WorkingDirectory = $root
    $lnk.IconLocation = Join-Path $env:SystemRoot "System32\$($s.Icon)"
    $lnk.Save()
    Write-Output "Created: $($s.Name)"
}
