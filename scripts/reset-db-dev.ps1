# ============================================================
# MATCHA JOB - RESET DATABASE SCRIPT
# scripts/reset-db-dev.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

Write-Host "`n**********************************************************" -ForegroundColor Red
Write-Host " WARNING: THIS WILL DELETE ALL LOCAL DATABASE DATA." -ForegroundColor Red
Write-Host " ALL POSTGRESQL VOLUMES & STORED RECORDS (matchajob_db)" -ForegroundColor Red
Write-Host " WILL BE PURGED AND REINITIALIZED." -ForegroundColor Red
Write-Host "**********************************************************`n" -ForegroundColor Red

$confirmation = Read-Host "Are you sure you want to reset local database? (Y/N)"

if ($confirmation -notin @("Y", "y", "YES", "yes")) {
    Write-Host "Database reset cancelled. Data is safe." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nStopping the Compose project while preserving CV storage..." -ForegroundColor Yellow
docker compose down
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not stop the Compose project." -ForegroundColor Red
    exit 1
}

Write-Host "Removing only the PostgreSQL volume (matchajob_postgres_data)..." -ForegroundColor Yellow
docker volume rm matchajob_postgres_data
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not remove matchajob_postgres_data." -ForegroundColor Red
    exit 1
}

docker compose up -d database
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not recreate the database service." -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for PostgreSQL container to become healthy on port 5433..." -ForegroundColor Gray
$pgContainer = "matchajob-postgres-pgvector"
$maxWait = 60
$elapsed = 0
$healthy = $false

while ($elapsed -lt $maxWait) {
    try {
        $health = docker inspect --format='{{json .State.Health.Status}}' $pgContainer 2>$null
        if ($health -eq '"healthy"' -or (docker exec $pgContainer pg_isready -U matchajob_user -d matchajob_db 2>$null)) {
            $healthy = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 2
    $elapsed += 2
}

if ($healthy) {
    Write-Host "`nSUCCESS: Database recreated cleanly on port 5433." -ForegroundColor Green
    Write-Host "PostgreSQL + pgvector is ready for fresh data." -ForegroundColor Green
} else {
    Write-Host "`nERROR: Database container failed to become healthy within $maxWait seconds." -ForegroundColor Red
    exit 1
}

Write-Host "CV volume matchajob_cv_storage was preserved." -ForegroundColor Green
