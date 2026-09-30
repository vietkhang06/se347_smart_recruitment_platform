# ============================================================
# MATCHA JOB - LOCAL STATUS CHECK SCRIPT
# scripts/status-dev.ps1
# ============================================================

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "     MATCHA JOB STATUS CHECK" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Helper function to check TCP Port
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

# Helper function to test HTTP URL
function Test-HttpUrl([string]$url) {
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Timeout = 2000
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

# 1. Check Docker & PostgreSQL
$dockerStatus = "NOT RUNNING"
$pgStatus = "NOT RUNNING"

try {
    $null = docker info 2>&1
    $dockerStatus = "READY"
    
    $containerState = docker inspect --format='{{json .State.Health.Status}}' matchajob-postgres-pgvector 2>$null
    if ($containerState -eq '"healthy"' -or (Test-PortOccupied 5433)) {
        $pgStatus = "READY"
    } else {
        $pgStatus = "NOT RUNNING"
    }
} catch {
    $dockerStatus = "NOT RUNNING"
    $pgStatus = "NOT RUNNING"
}

# 2. Check Frontend (5173)
$frontendStatus = "NOT RUNNING"
if ((Test-HttpUrl "http://127.0.0.1:5173") -eq "READY") {
    $frontendStatus = "READY"
} elseif (Test-PortOccupied 5173) {
    $frontendStatus = "STARTING / NOT READY"
}

# 3. Check Backend (8081)
$backendStatus = "STANDBY (Waiting for code)"
if ((Test-HttpUrl "http://127.0.0.1:8081/api") -eq "READY") {
    $backendStatus = "READY"
} elseif (Test-PortOccupied 8081) {
    $backendStatus = "PORT OCCUPIED / STARTING"
}

# 4. Check AI Worker (8001)
$aiStatus = "STANDBY (Waiting for code)"
if (Test-PortOccupied 8001) {
    $aiStatus = "READY"
}

# Display Status Summary
Write-Host " Docker Desktop : $dockerStatus" -ForegroundColor $(if ($dockerStatus -eq "READY") { "Green" } else { "Red" })
Write-Host " PostgreSQL DB  : $pgStatus (Port 5433, matchajob_db)" -ForegroundColor $(if ($pgStatus -eq "READY") { "Green" } else { "Yellow" })
Write-Host " Frontend       : $frontendStatus (Port 5173, Vite + React 19)" -ForegroundColor $(if ($frontendStatus -eq "READY") { "Green" } else { "Yellow" })
Write-Host " Backend API    : $backendStatus (Port 8081)" -ForegroundColor $(if ($backendStatus -eq "READY") { "Green" } else { "Yellow" })
Write-Host " AI Worker      : $aiStatus (Port 8001)" -ForegroundColor $(if ($aiStatus -eq "READY") { "Green" } else { "Yellow" })

Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host " MidCV Port Conflict Check:" -ForegroundColor Yellow
Write-Host "   MidCV DB (5432) vs MatchaJob (5433)   -> NO CONFLICT [OK]" -ForegroundColor Green
Write-Host "   MidCV UI (3000) vs MatchaJob (5173)   -> NO CONFLICT [OK]" -ForegroundColor Green
Write-Host "   MidCV API(8080) vs MatchaJob (8081)   -> NO CONFLICT [OK]" -ForegroundColor Green
Write-Host "   MidCV AI (8000) vs MatchaJob (8001)   -> NO CONFLICT [OK]" -ForegroundColor Green
Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host " URLs:" -ForegroundColor Yellow
Write-Host "   Frontend    : http://localhost:5173" -ForegroundColor White
Write-Host "   Backend API : http://localhost:8081/api" -ForegroundColor White
Write-Host "   Database    : 127.0.0.1:5433 (matchajob_user)" -ForegroundColor White
Write-Host "==========================================`n" -ForegroundColor Cyan
