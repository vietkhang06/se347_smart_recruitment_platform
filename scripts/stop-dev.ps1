# ============================================================
# MATCHA JOB - LOCAL DEVELOPMENT STOP SCRIPT
# scripts/stop-dev.ps1
# ============================================================

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " STOPPING MATCHA JOB LOCAL DEV ENVIRONMENT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Function to safely kill host processes listening on a port (skipping Docker internal daemons)
function Stop-HostProcessOnPort([int]$port, [string]$name, [string[]]$allowedNames) {
    Write-Host "Checking $name on port $port..." -ForegroundColor Yellow
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $procId = $conn.OwningProcess
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc) {
                    # Protect Docker Desktop and WSL daemons from being terminated
                    if ($proc.ProcessName -in @("com.docker.backend", "wslrelay", "Docker Desktop", "wsl", "dockerd")) {
                        continue
                    }
                    if (-not $allowedNames -or ($proc.ProcessName -in $allowedNames)) {
                        Write-Host "  -> Terminating $name process ($($proc.ProcessName), PID $procId)..." -ForegroundColor Gray
                        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    } catch {
        Write-Host "  -> Could not query port $port." -ForegroundColor Gray
    }
}

# 1. Stop host dev processes if any
Stop-HostProcessOnPort -port 5173 -name "Frontend (Host Vite)" -allowedNames @("node")
Stop-HostProcessOnPort -port 8081 -name "Backend (Host Spring Boot)" -allowedNames @("java")
Stop-HostProcessOnPort -port 8001 -name "AI Worker (Host FastAPI)" -allowedNames @("python")

# 2. Stop Docker containers safely without removing database volume data
Write-Host "`nStopping MatchaJob Docker containers..." -ForegroundColor Yellow
try {
    docker compose stop
    Write-Host "  -> All MatchaJob containers stopped safely (Database data preserved)." -ForegroundColor Green
} catch {
    Write-Host "  -> Docker compose stop finished or Docker is not running." -ForegroundColor Gray
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " ALL MATCHA JOB SERVICES STOPPED SAFELY" -ForegroundColor Cyan
Write-Host " Database volume (matchajob_postgres_data) is preserved." -ForegroundColor Green
Write-Host "==========================================`n" -ForegroundColor Cyan
