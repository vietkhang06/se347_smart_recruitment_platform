param(
    [string]$ProjectName = 'matchajob-demo',
    [string]$EnvFile = '.env',
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'
$services = @('database', 'ai-worker', 'backend', 'frontend')
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$failed = $false

foreach ($service in $services) {
    $healthy = $false
    do {
        $id = docker compose --env-file $EnvFile -p $ProjectName ps -q $service
        if ($LASTEXITCODE -eq 0 -and $id) {
            $state = docker inspect --format '{{.State.Health.Status}}' $id
            if ($LASTEXITCODE -eq 0 -and $state -eq 'healthy') { $healthy = $true; break }
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    if ($healthy) { Write-Output "PASS $service healthy" }
    else { Write-Output "FAIL $service healthy"; $failed = $true }
}

if (-not $failed) {
    try {
        $frontPort = ((docker compose --env-file $EnvFile -p $ProjectName port frontend 5173) -split ':')[-1]
        $backPort = ((docker compose --env-file $EnvFile -p $ProjectName port backend 8080) -split ':')[-1]
        if (-not $frontPort -or -not $backPort) { throw 'published ports not found' }
        $front = Invoke-WebRequest -Uri "http://127.0.0.1:$frontPort/" -TimeoutSec 5
        if ($front.StatusCode -ne 200 -or $front.Content -notmatch '<html') { throw 'frontend response invalid' }
        Write-Output 'PASS frontend HTTP'
        $mode = docker compose --env-file $EnvFile -p $ProjectName exec -T frontend printenv VITE_DATA_SOURCE
        $apiBase = docker compose --env-file $EnvFile -p $ProjectName exec -T frontend printenv VITE_API_BASE_URL
        if ($mode -ne 'api' -or -not $apiBase) { throw 'frontend API configuration invalid' }
        $browserApi = Invoke-RestMethod -Uri "$($apiBase.TrimEnd('/'))/actuator/health/readiness" -TimeoutSec 5
        if ($browserApi.status -ne 'UP') { throw 'frontend API URL cannot reach backend' }
        Write-Output 'PASS frontend API URL'
        $back = Invoke-RestMethod -Uri "http://127.0.0.1:$backPort/api/actuator/health/readiness" -TimeoutSec 5
        if ($back.status -ne 'UP') { throw 'backend not ready' }
        Write-Output 'PASS backend readiness (DB/pgvector)'
        $ai = docker compose --env-file $EnvFile -p $ProjectName exec -T ai-worker python -c "import json,urllib.request; print(json.load(urllib.request.urlopen('http://127.0.0.1:8000/health/ready',timeout=5))['status'])"
        if ($LASTEXITCODE -ne 0 -or $ai -ne 'ready') { throw 'AI not ready' }
        Write-Output 'PASS AI readiness'
        docker compose --env-file $EnvFile -p $ProjectName exec -T database pg_isready -h 127.0.0.1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'database not ready' }
        Write-Output 'PASS database readiness'
    } catch {
        Write-Output "FAIL HTTP/readiness: $($_.Exception.Message)"
        $failed = $true
    }
}

if ($failed) { exit 1 }
Write-Output 'PASS smoke demo'
