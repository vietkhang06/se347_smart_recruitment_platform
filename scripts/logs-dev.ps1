# MATCHA JOB - COMPOSE LOG VIEWER
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

$allowedServices = @("database", "frontend", "backend", "ai-worker")
$service = $args | Select-Object -First 1

if ($service -and $service -notin $allowedServices) {
    Write-Host "Unknown service '$service'. Allowed: $($allowedServices -join ', ')" -ForegroundColor Red
    exit 1
}

if ($service) {
    docker compose logs --tail 200 -f $service
} else {
    docker compose logs --tail 200 -f
}

exit $LASTEXITCODE
