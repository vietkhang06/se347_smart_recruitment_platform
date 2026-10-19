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

Write-Host "`nResetting database container & volumes..." -ForegroundColor Yellow
docker compose down -v
docker compose up -d database

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
}
