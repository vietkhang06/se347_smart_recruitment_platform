[CmdletBinding()]
param(
    [string]$ProjectName = 'matchajob-demo',
    [string]$EnvFile = '.env',
    [string]$OutputDirectory = "backups/$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $ProjectRoot
if (-not (Test-Path $EnvFile)) { throw "Environment file '$EnvFile' does not exist." }

$databaseId = docker compose --env-file $EnvFile -p $ProjectName ps -q database
if (-not $databaseId) { throw "Database service for '$ProjectName' is not running." }
$dbUser = docker compose --env-file $EnvFile -p $ProjectName exec -T database printenv POSTGRES_USER
$dbName = docker compose --env-file $EnvFile -p $ProjectName exec -T database printenv POSTGRES_DB
$cvVolume = docker volume ls `
    --filter "label=com.docker.compose.project=$ProjectName" `
    --filter 'label=com.docker.compose.volume=cv_storage' `
    --format '{{.Name}}'
if (-not $cvVolume -or @($cvVolume).Count -ne 1) { throw 'Expected exactly one Compose CV volume.' }

New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
$OutputDirectory = (Resolve-Path $OutputDirectory).Path
$backendWasRunning = [bool](docker compose --env-file $EnvFile -p $ProjectName ps -q backend)

try {
    if ($backendWasRunning) { docker compose --env-file $EnvFile -p $ProjectName stop backend | Out-Null }

    docker compose --env-file $EnvFile -p $ProjectName exec -T database sh -c `
        'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/matchajob.dump'
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL backup failed.' }
    docker compose --env-file $EnvFile -p $ProjectName cp database:/tmp/matchajob.dump "$OutputDirectory/postgres.dump"
    if ($LASTEXITCODE -ne 0) { throw 'Could not copy PostgreSQL backup to host.' }

    docker run --rm -v "${cvVolume}:/source:ro" -v "${OutputDirectory}:/backup" `
        pgvector/pgvector:pg16 tar -czf /backup/cv-storage.tar.gz -C /source .
    if ($LASTEXITCODE -ne 0) { throw 'CV storage backup failed.' }

    $countSql = "SELECT json_build_object('users',(SELECT count(*) FROM users),'jobs',(SELECT count(*) FROM jobs),'applications',(SELECT count(*) FROM applications),'cv_versions',(SELECT count(*) FROM cv_versions))"
    $dbCounts = docker compose --env-file $EnvFile -p $ProjectName exec -T database `
        psql -At -U $dbUser -d $dbName -c $countSql
    $cvReferences = @(docker compose --env-file $EnvFile -p $ProjectName exec -T database `
        psql -At -U $dbUser -d $dbName -c 'SELECT file_path FROM cv_versions ORDER BY file_path' |
        Where-Object { $_ } | ForEach-Object { $_.Trim() })
    $cvFiles = @(docker run --rm -v "${cvVolume}:/source:ro" pgvector/pgvector:pg16 `
        find /source -type f -printf '%P\n' | Where-Object { $_ } | ForEach-Object { $_.Trim() })
    $missing = @($cvReferences | ForEach-Object { $_ -replace '^/data/cv/', '' } | Where-Object { $_ -notin $cvFiles })
    if ($missing.Count) { throw "Backup consistency failed; missing CV objects: $($missing -join ', ')" }

    $manifest = [ordered]@{
        createdAt = (Get-Date).ToUniversalTime().ToString('o')
        projectName = $ProjectName
        databaseCounts = ($dbCounts | ConvertFrom-Json)
        cvReferenceCount = $cvReferences.Count
        cvFileCount = $cvFiles.Count
        postgresSha256 = (Get-FileHash "$OutputDirectory/postgres.dump" -Algorithm SHA256).Hash.ToLowerInvariant()
        cvArchiveSha256 = (Get-FileHash "$OutputDirectory/cv-storage.tar.gz" -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    $manifest | ConvertTo-Json -Depth 4 | Set-Content "$OutputDirectory/manifest.json" -Encoding UTF8
    Write-Output "PASS consistent backup: $OutputDirectory"
} finally {
    if ($backendWasRunning) { docker compose --env-file $EnvFile -p $ProjectName start backend | Out-Null }
}
