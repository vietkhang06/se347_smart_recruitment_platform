# ==============================================================================
# MATCHA JOB - DATABASE SEED RUNNER SCRIPT
# scripts/seed-data.ps1
# ==============================================================================
# Nạp dữ liệu mẫu vào cơ sở dữ liệu PostgreSQL cho môi trường dev/thử nghiệm.
# Hỗ trợ cả hai chế độ:
#   1. Thực thi trực tiếp qua Docker container (matchajob-postgres-pgvector)
#   2. Hoặc thực thi qua công cụ psql cục bộ trên cổng 5433
# ==============================================================================

[CmdletBinding()]
param(
    [string]$ContainerName = "matchajob-postgres-pgvector",
    [string]$DbName = "matchajob_db",
    [string]$DbUser = "matchajob_user",
    [string]$DbPassword = "matchajob_password",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5433,
    [string]$SqlFile = "scripts/seed-data.sql"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

$SqlPath = Join-Path $ProjectRoot $SqlFile
if (-not (Test-Path $SqlPath)) {
    Write-Host "LỖI: Không tìm thấy tệp SQL tại '$SqlPath'" -ForegroundColor Red
    exit 1
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "   MATCHA JOB - NẠP DỮ LIỆU MẪU DATABASE (SEED DATA)        " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Tệp nguồn: $SqlPath" -ForegroundColor Gray
Write-Host "Cơ sở dữ liệu đích: $DbName | User: $DbUser" -ForegroundColor Gray

$executed = $false

# 1. Thử thực thi qua Docker container nếu container đang chạy
Write-Host "`n[1/3] Kiểm tra Docker container '$ContainerName'..." -ForegroundColor Yellow

$containerRunning = $false
try {
    $inspect = docker inspect --format='{{.State.Running}}' $ContainerName 2>$null
    if ($inspect -eq "true") {
        $containerRunning = $true
    }
} catch {
    $containerRunning = $false
}

if ($containerRunning) {
    Write-Host "Đang nạp dữ liệu qua Docker container '$ContainerName'..." -ForegroundColor Green
    try {
        # Sao chép tệp SQL trực tiếp vào container để giữ nguyên encoding UTF-8 (tránh lỗi font tiếng Việt trên Windows)
        docker cp $SqlPath "${ContainerName}:/tmp/seed-data.sql"
        docker exec -i -e PGCLIENTENCODING=UTF8 $ContainerName psql -U $DbUser -d $DbName -f /tmp/seed-data.sql
        $executed = $true
        Write-Host "Thực thi kịch bản SQL qua Docker thành công với chuẩn UTF-8!" -ForegroundColor Green
    } catch {
        Write-Host "LỖI khi chạy trong Docker: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Docker container '$ContainerName' chưa chạy hoặc Docker Desktop đang tắt." -ForegroundColor Yellow
}

# 2. Nếu Docker chưa chạy, thử dùng psql cục bộ kết nối qua cổng 5433
if (-not $executed) {
    Write-Host "`n[2/3] Kiểm tra công cụ 'psql' cục bộ kết nối tới ${DbHost}:${DbPort}..." -ForegroundColor Yellow
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue

    if ($psqlCmd) {
        Write-Host "Tìm thấy psql tại $($psqlCmd.Source). Đang kết nối..." -ForegroundColor Cyan
        $env:PGPASSWORD = $DbPassword
        try {
            & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $SqlPath
            $executed = $true
            Write-Host "Thực thi kịch bản SQL qua psql cục bộ thành công!" -ForegroundColor Green
        } catch {
            Write-Host "LỖI khi chạy psql: $_" -ForegroundColor Red
        } finally {
            Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "Không tìm thấy công cụ psql trên máy cục bộ." -ForegroundColor Gray
    }
}

# 3. Kết quả và Hướng dẫn
if (-not $executed) {
    Write-Host "`n------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "CHƯA THỂ KẾT NỐI TỚI DATABASE ĐỂ THỰC THI NGAY:" -ForegroundColor Yellow
    Write-Host "1. Hãy khởi động Docker Desktop hoặc dịch vụ PostgreSQL." -ForegroundColor White
    Write-Host "2. Khởi chạy database bằng lệnh:" -ForegroundColor White
    Write-Host "   docker compose up -d database" -ForegroundColor Cyan
    Write-Host "3. Sau đó chạy lại lệnh seed này:" -ForegroundColor White
    Write-Host "   powershell -File .\scripts\seed-data.ps1" -ForegroundColor Green
    Write-Host "------------------------------------------------------------`n" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n[3/3] XÁC NHẬN SỐ LƯỢNG BẢN GHI ĐÃ NẠP:" -ForegroundColor Cyan
$verifySql = @"
SELECT 'users' AS table_name, count(*) AS count FROM users
UNION ALL SELECT 'companies', count(*) FROM companies
UNION ALL SELECT 'categories', count(*) FROM categories
UNION ALL SELECT 'skills', count(*) FROM skills
UNION ALL SELECT 'jobs', count(*) FROM jobs
UNION ALL SELECT 'applications', count(*) FROM applications
UNION ALL SELECT 'interviews', count(*) FROM interviews;
"@

if ($containerRunning) {
    docker exec -i $ContainerName psql -U $DbUser -d $DbName -c $verifySql
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "   DANH SÁCH TÀI KHOẢN MẪU DÙNG THỬ (Mật khẩu: Password123!) " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "1. ADMIN:       admin@matchajob.com        (Toàn quyền quản trị)" -ForegroundColor White
Write-Host "2. EMPLOYER:    employer@fpt.com           (FPT Digital Talent - Owner)" -ForegroundColor White
Write-Host "3. RECRUITER:   recruiter@fpt.com          (FPT Digital Talent - HR Admin)" -ForegroundColor White
Write-Host "4. VNG HR:      talent@vng.com.vn          (VNG Corporation - Owner)" -ForegroundColor White
Write-Host "5. CANDIDATE 1: khanh.candidate@gmail.com  (Frontend React - Đang phỏng vấn)" -ForegroundColor White
Write-Host "6. CANDIDATE 2: thong.candidate@gmail.com  (Backend Java - Nhận Offer)" -ForegroundColor White
Write-Host "7. CANDIDATE 3: hung.candidate@gmail.com   (QA Automation - Sàng lọc)" -ForegroundColor White
Write-Host "8. CANDIDATE 4: mai.candidate@gmail.com    (Product Designer - Mới nộp)" -ForegroundColor White
Write-Host "============================================================`n" -ForegroundColor Green
