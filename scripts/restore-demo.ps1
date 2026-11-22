[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupDirectory,
    [string]$ProjectName = 'matchajob-restore-test',
    [string]$EnvFile = '.env.example'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $ProjectRoot
$BackupDirectory = (Resolve-Path $BackupDirectory).Path
if ($ProjectName -notmatch '(?i)test|restore') { throw 'Restore project name must contain test or restore.' }
if (-not (Test-Path $EnvFile)) { throw "Environment file '$EnvFile' does not exist." }

$manifest = Get-Content "$BackupDirectory/manifest.json" -Raw | ConvertFrom-Json
if ((Get-FileHash "$BackupDirectory/postgres.dump" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.postgresSha256) {
    throw 'PostgreSQL backup checksum mismatch.'
}
if ((Get-FileHash "$BackupDirectory/cv-storage.tar.gz" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.cvArchiveSha256) {
    throw 'CV backup checksum mismatch.'
}

$existing = docker volume ls --filter "label=com.docker.compose.project=$ProjectName" --format '{{.Name}}'
if ($existing) { throw "Restore target '$ProjectName' already has volumes; refusing to overwrite it." }

docker compose --env-file $EnvFile -p $ProjectName up -d --wait database
if ($LASTEXITCODE -ne 0) { throw 'Could not start isolated restore database.' }
$dbUser = docker compose --env-file $EnvFile -p $ProjectName exec -T database printenv POSTGRES_USER
$dbName = docker compose --env-file $EnvFile -p $ProjectName exec -T database printenv POSTGRES_DB
docker compose --env-file $EnvFile -p $ProjectName cp "$BackupDirectory/postgres.dump" database:/tmp/matchajob.dump
docker compose --env-file $EnvFile -p $ProjectName exec -T database sh -c `
    'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/matchajob.dump'
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL restore failed.' }

docker volume create --label "com.docker.compose.project=$ProjectName" `
    --label 'com.docker.compose.volume=cv_storage' "${ProjectName}_cv_storage" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not create the isolated CV restore volume.' }
$cvVolume = docker volume ls `
    --filter "label=com.docker.compose.project=$ProjectName" `
    --filter 'label=com.docker.compose.volume=cv_storage' `
    --format '{{.Name}}'
if (-not $cvVolume -or @($cvVolume).Count -ne 1) { throw 'Could not resolve isolated CV restore volume.' }
docker run --rm -v "${cvVolume}:/target" -v "${BackupDirectory}:/backup:ro" `
    pgvector/pgvector:pg16 tar -xzf /backup/cv-storage.tar.gz -C /target
if ($LASTEXITCODE -ne 0) { throw 'CV storage restore failed.' }

$countSql = "SELECT json_build_object('users',(SELECT count(*) FROM users),'jobs',(SELECT count(*) FROM jobs),'applications',(SELECT count(*) FROM applications),'cv_versions',(SELECT count(*) FROM cv_versions))"
$countsJson = docker compose --env-file $EnvFile -p $ProjectName exec -T database `
    psql -At -U $dbUser -d $dbName -c $countSql
$counts = $countsJson | ConvertFrom-Json
foreach ($name in @('users', 'jobs', 'applications', 'cv_versions')) {
    if ($counts.$name -ne $manifest.databaseCounts.$name) { throw "Restored count mismatch for $name." }
}
$cvFiles = @(docker run --rm -v "${cvVolume}:/source:ro" pgvector/pgvector:pg16 find /source -type f -printf '%P\n' |
    Where-Object { $_ } | ForEach-Object { $_.Trim() })
if ($cvFiles.Count -ne $manifest.cvFileCount) { throw 'Restored CV file count mismatch.' }

Write-Output "PASS isolated restore: $ProjectName"
Write-Output "Run docker compose --env-file $EnvFile -p $ProjectName down when verification is complete."
