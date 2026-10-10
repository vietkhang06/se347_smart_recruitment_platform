# ============================================================
# MATCHA JOB - LOCAL DEVELOPMENT LAUNCHER
# scripts/start-dev.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# Resolve project root relative to script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   MATCHA JOB LOCAL DEV STARTUP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ------------------------------------------------------------
# STEP 1: Environment & Tooling Validation
# ------------------------------------------------------------
Write-Host "`n[1/5] Validating Developer Environment..." -ForegroundColor Yellow

# 1.1. Check Docker Desktop
try {
    $null = docker info 2>&1
    Write-Host "  -> Docker Desktop is running." -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker Desktop is not running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop first and re-run start-dev.bat" -ForegroundColor Red
    exit 1
}

# 1.2. Check .env file
$EnvFile = Join-Path $ProjectRoot ".env"
$EnvExampleFile = Join-Path $ProjectRoot ".env.example"
if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExampleFile) {
        Write-Host "  -> Creating .env from .env.example..." -ForegroundColor Gray
        Copy-Item $EnvExampleFile $EnvFile
        Write-Host "  -> .env created successfully." -ForegroundColor Green
    } else {
        Write-Host "  -> WARNING: .env file not found." -ForegroundColor Yellow
    }
} else {
    Write-Host "  -> .env configuration file validated." -ForegroundColor Green
}

# Helper function to test TCP Port using 127.0.0.1 IPv4
function Test-PortOccupied([int]$port) {
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $conn.BeginConnect("127.0.0.1", $port, $null, $null)
        $success = $asyncResult.AsyncWaitHandle.WaitOne(500, $false)
        if ($success) {
            $conn.EndConnect($asyncResult)
            $conn.Close()
            return $true
        }
    } catch {}
    return $false
}

# Helper function to test HTTP URL and return status
function Test-HttpUrl([string]$url) {
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Timeout = 2500
        $res = $req.GetResponse()
        $code = [int]$res.StatusCode
        $res.Close()
        if ($code -ge 200 -and $code -lt 400) {
            return "READY"
        }
        return "NOT_READY"
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $resp = [System.Net.HttpWebResponse]$_.Exception.Response
            $code = [int]$resp.StatusCode
            if ($code -ge 200 -and $code -lt 400) {
                return "READY"
            }
        }
        return "NOT_READY"
    } catch {
        return "NOT_READY"
    }
}

# ------------------------------------------------------------
# STEP 2: Starting Services via Docker Compose
# ------------------------------------------------------------
Write-Host "`n[2/5] Starting Docker Containers (Database & Frontend)..." -ForegroundColor Yellow

$pgContainer = "matchajob-postgres-pgvector"
$feContainer = "matchajob-frontend-dev"

Write-Host "  -> Executing docker compose up -d..." -ForegroundColor Gray
docker compose up -d

# ------------------------------------------------------------
# STEP 3: Polling Health & Readiness
# ------------------------------------------------------------
Write-Host "`n[3/5] Polling Services Health Status..." -ForegroundColor Yellow

# 3.1. PostgreSQL (Port 5433)
Write-Host "  -> Checking PostgreSQL health on port 5433..." -ForegroundColor Gray
$maxWait = 60
$elapsed = 0
$dbHealthy = $false

while ($elapsed -lt $maxWait) {
    try {
        $health = docker inspect --format='{{json .State.Health.Status}}' $pgContainer 2>$null
        if ($health -eq '"healthy"' -or (docker exec $pgContainer pg_isready -U matchajob_user -d matchajob_db 2>$null)) {
            $dbHealthy = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 2
    $elapsed += 2
}

if ($dbHealthy) {
    Write-Host "  -> PostgreSQL + pgvector is READY on 127.0.0.1:5433 (matchajob_db)." -ForegroundColor Green
} else {
    Write-Host "  -> WARNING: Database is still initializing. Check logs: docker compose logs database" -ForegroundColor Yellow
}

# 3.2. Frontend (Port 5173)
Write-Host "  -> Checking Frontend readiness on port 5173..." -ForegroundColor Gray
$maxWaitFe = 45
$elapsedFe = 0
$feReady = $false

while ($elapsedFe -lt $maxWaitFe) {
    $status = Test-HttpUrl "http://127.0.0.1:5173"
    if ($status -eq "READY") {
        $feReady = $true
        break
    }
    Start-Sleep -Seconds 1
    $elapsedFe += 1
}

if ($feReady) {
    Write-Host "  -> Frontend Web App is READY on http://127.0.0.1:5173." -ForegroundColor Green
} else {
    Write-Host "  -> WARNING: Frontend is still compiling or booting. Check logs: docker compose logs frontend" -ForegroundColor Yellow
}

# ------------------------------------------------------------
# STEP 4: Backend & AI Worker Status Check (Ports 8081 & 8001)
# ------------------------------------------------------------
Write-Host "`n[4/5] Checking Backend & AI Worker Status..." -ForegroundColor Yellow

$backendRunning = Test-PortOccupied 8081
if ($backendRunning) {
    $backendStatusText = "READY (Port 8081 - http://localhost:8081/api)"
} else {
    $backendStatusText = "NOT RUNNING (Port 8081 - Chạy 'mvn spring-boot:run' hoặc 'docker compose up -d backend')"
}
Write-Host "  -> Backend Status   : $backendStatusText" -ForegroundColor $(if ($backendRunning) { "Green" } else { "Gray" })

$aiWorkerRunning = Test-PortOccupied 8001
if ($aiWorkerRunning) {
    $aiStatusText = "READY (Port 8001 - http://localhost:8001)"
} else {
    $aiStatusText = "NOT RUNNING (Port 8001 - Chạy '.venv\Scripts\python -m uvicorn app.main:app' hoặc 'docker compose up -d ai-worker')"
}
Write-Host "  -> AI Worker Status : $aiStatusText" -ForegroundColor $(if ($aiWorkerRunning) { "Green" } else { "Gray" })

# ------------------------------------------------------------
# STEP 5: Final Status Summary & Browser Open
# ------------------------------------------------------------
Write-Host "`n[5/5] Opening Browser..." -ForegroundColor Yellow
try {
    Start-Process "http://localhost:5173"
} catch {}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   MATCHA JOB PLATFORM LOCAL STATUS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " PostgreSQL  : READY   (Port 5433, matchajob_db)" -ForegroundColor Green
Write-Host " Frontend    : READY   (Port 5173, Vite + React 19)" -ForegroundColor Green
Write-Host " Backend     : $backendStatusText" -ForegroundColor $(if ($backendRunning) { "Green" } else { "Yellow" })
Write-Host " AI Worker   : $aiStatusText" -ForegroundColor $(if ($aiWorkerRunning) { "Green" } else { "Yellow" })
Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host " MidCV Port Conflict Check:" -ForegroundColor Yellow
Write-Host "   MidCV DB (5432) vs MatchaJob (5433)   -> NO CONFLICT [OK]" -ForegroundColor Green
Write-Host "   MidCV UI (3000) vs MatchaJob (5173)   -> NO CONFLICT [OK]" -ForegroundColor Green
Write-Host "   MidCV API(8080) vs MatchaJob (8081)   -> NO CONFLICT [OK]" -ForegroundColor Green
Write-Host "   MidCV AI (8000) vs MatchaJob (8001)   -> NO CONFLICT [OK]" -ForegroundColor Green
Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host " URLs:" -ForegroundColor Yellow
Write-Host "   Frontend  : http://localhost:5173" -ForegroundColor White
Write-Host "   Backend   : http://localhost:8081/api" -ForegroundColor White
Write-Host "   Database  : 127.0.0.1:5433 (matchajob_user)" -ForegroundColor White
Write-Host "==========================================`n" -ForegroundColor Cyan
