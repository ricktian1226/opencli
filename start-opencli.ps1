$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeDir = Get-ChildItem $repoRoot -Directory |
    Where-Object { $_.Name -like 'node-v*-win-x64' } |
    Sort-Object Name -Descending |
    Select-Object -First 1 -ExpandProperty FullName

if (-not $nodeDir) {
    throw "Node.js runtime not found under $repoRoot"
}

$opencliDir = Join-Path $repoRoot '.opencli-global'
$opencliCmd = Join-Path $opencliDir 'opencli.cmd'
$nodeExe = Join-Path $nodeDir 'node.exe'
$daemonScript = Join-Path $opencliDir 'node_modules\@jackwener\opencli\dist\daemon.js'

if (-not (Test-Path $opencliCmd)) {
    throw "opencli executable not found at $opencliCmd"
}

if (-not (Test-Path $daemonScript)) {
    throw "opencli daemon script not found at $daemonScript"
}

$env:PATH = "$nodeDir;$opencliDir;$env:PATH"
$env:NPM_CONFIG_CACHE = Join-Path $repoRoot '.npm-cache'

try {
    $status = Invoke-WebRequest 'http://127.0.0.1:19825/status' -UseBasicParsing -TimeoutSec 2
} catch {
    $status = $null
}

if (-not $status) {
    Start-Process -FilePath $nodeExe `
        -ArgumentList $daemonScript `
        -WorkingDirectory $repoRoot `
        -WindowStyle Hidden | Out-Null
    Start-Sleep -Seconds 2
}

Write-Host 'opencli environment is ready.' -ForegroundColor Green
Write-Host "node:    $nodeExe"
Write-Host "opencli: $opencliCmd"
Write-Host ''
& $opencliCmd doctor
