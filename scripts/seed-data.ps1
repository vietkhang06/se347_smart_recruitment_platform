[CmdletBinding()]
param(
    [string]$ProjectName = 'matchajob-demo',
    [string]$EnvFile = '.env',
    [string]$SqlFile = 'scripts/seed-data.sql'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $ProjectRoot
$SqlPath = Resolve-Path $SqlFile
$CvFixture = Resolve-Path 'scripts/fixtures/demo-cv.pdf'

if (-not (Test-Path $EnvFile)) { throw "Environment file '$EnvFile' does not exist." }
$databaseId = docker compose --env-file $EnvFile -p $ProjectName ps -q database
if ($LASTEXITCODE -ne 0 -or -not $databaseId) { throw "Database service for '$ProjectName' is not running." }
$health = docker inspect --format '{{.State.Health.Status}}' $databaseId
if ($health -ne 'healthy') { throw "Database service is not healthy (status: $health)." }

docker compose --env-file $EnvFile -p $ProjectName cp $SqlPath database:/tmp/seed-data.sql
if ($LASTEXITCODE -ne 0) { throw 'Could not copy seed SQL into the database container.' }
docker compose --env-file $EnvFile -p $ProjectName exec -T database `
    sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/seed-data.sql'
if ($LASTEXITCODE -ne 0) { throw 'Seed failed; PostgreSQL rolled back the transaction.' }

$backendId = docker compose --env-file $EnvFile -p $ProjectName ps -q backend
if (-not $backendId) { throw 'Backend service must be running to seed CV objects.' }
$cvNames = @(
    'cv_pham_duy_khanh_2026.pdf',
    'cv_pham_nhat_thong_2026.pdf',
    'cv_nguyen_dai_hung_2026.pdf',
    'cv_vo_quynh_mai_2026.pdf',
    'cv_nguyen_an_khang.pdf'
)
foreach ($name in $cvNames) {
    docker compose --env-file $EnvFile -p $ProjectName cp $CvFixture "backend:/data/cv/$name" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not seed CV object '$name'." }
}

$dbUser = docker compose --env-file $EnvFile -p $ProjectName exec -T database printenv POSTGRES_USER
$dbName = docker compose --env-file $EnvFile -p $ProjectName exec -T database printenv POSTGRES_DB
$hash = (Get-FileHash $CvFixture -Algorithm SHA256).Hash.ToLowerInvariant()
$size = (Get-Item $CvFixture).Length
docker compose --env-file $EnvFile -p $ProjectName exec -T database psql -v ON_ERROR_STOP=1 `
    -U $dbUser -d $dbName -c "UPDATE cv_versions SET sha256_hash='$hash', file_size_bytes=$size WHERE id IN ('88888888-7777-4777-8777-777777777701','88888888-7777-4777-8777-777777777702','88888888-7777-4777-8777-777777777703')"
if ($LASTEXITCODE -ne 0) { throw 'Seed verification query failed.' }
$userCount = docker compose --env-file $EnvFile -p $ProjectName exec -T database psql -At -U $dbUser -d $dbName -c 'SELECT count(*) FROM users'
Write-Output "PASS seed for project $ProjectName (users=$userCount, cv_files=$($cvNames.Count))"
