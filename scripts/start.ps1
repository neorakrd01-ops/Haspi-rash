# Starts Aspi Rash in the background (if it isn't already running) and opens it
# in the browser. Used by the "Aspi Rash" desktop shortcut.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$url  = 'http://127.0.0.1:3210'

function Test-Running {
    try { Invoke-WebRequest "$url/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true }
    catch { return $false }
}

function Show-Error($msg) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($msg, 'Aspi Rash', 'OK', 'Error') | Out-Null
}

try {
    if (-not (Test-Running)) {
        $node = 'C:\Program Files\nodejs\node.exe'
        if (-not (Test-Path $node)) { $node = (Get-Command node -ErrorAction Stop).Source }
        $next = Join-Path $root 'node_modules\next\dist\bin\next'
        $logDir = Join-Path $root 'data'
        New-Item -ItemType Directory -Force $logDir | Out-Null

        # First run (or after an update): build the app once.
        if (-not (Test-Path (Join-Path $root '.next\BUILD_ID'))) {
            & $node $next build *> (Join-Path $logDir 'build.log')
            if ($LASTEXITCODE -ne 0) { throw "Building Aspi Rash failed. See $logDir\build.log" }
        }

        Start-Process -FilePath $node `
            -ArgumentList "`"$next`" start -H 127.0.0.1 -p 3210" `
            -WorkingDirectory $root -WindowStyle Hidden `
            -RedirectStandardOutput (Join-Path $logDir 'server.log') `
            -RedirectStandardError (Join-Path $logDir 'server-error.log')

        $deadline = (Get-Date).AddSeconds(60)
        while (-not (Test-Running)) {
            if ((Get-Date) -gt $deadline) { throw "Aspi Rash did not start within 60 seconds. See $logDir\server-error.log" }
            Start-Sleep -Milliseconds 500
        }
    }
    Start-Process $url
} catch {
    Show-Error $_.Exception.Message
    exit 1
}
