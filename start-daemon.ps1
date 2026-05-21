$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$daemonScript = Join-Path $repoRoot 'dist\daemon.js'

if (-not (Test-Path $daemonScript)) {
    throw "opencli daemon script not found at $daemonScript"
}

try {
    $nodeCommand = Get-Command node -ErrorAction Stop
    $nodeExe = $nodeCommand.Source
} catch {
    throw "Node.js was not found in PATH. Please install Node.js or add it to PATH."
}

try {
    $status = Invoke-WebRequest 'http://127.0.0.1:19825/status' -UseBasicParsing -TimeoutSec 2
} catch {
    $status = $null
}

if ($status -and $status.StatusCode -eq 200) {
    Write-Host 'opencli daemon is already running on http://127.0.0.1:19825' -ForegroundColor Yellow
    exit 0
}

Write-Host 'Starting opencli daemon...' -ForegroundColor Green
Write-Host "node:   $nodeExe"
Write-Host "daemon: $daemonScript"
Write-Host ''

& $nodeExe $daemonScript
