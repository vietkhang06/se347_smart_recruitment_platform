[CmdletBinding()]
param(
    [ValidateSet('demo', 'test')]
    [Parameter(Mandatory = $true)]
    [string]$Environment,
    [string]$ProjectName = 'matchajob-demo',
    [string]$EnvFile = '.env',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $ProjectRoot

if ($ProjectName -match '(?i)prod|production|live') {
    throw "Refusing to reset production-like project '$ProjectName'."
}
if (-not (Test-Path $EnvFile)) { throw "Environment file '$EnvFile' does not exist." }

$volume = docker volume ls `
    --filter "label=com.docker.compose.project=$ProjectName" `
    --filter 'label=com.docker.compose.volume=postgres_data' `
    --format '{{.Name}}'
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Docker volumes.' }
$volumes = @($volume | Where-Object { $_ })
if ($volumes.Count -gt 1) { throw "Expected at most one PostgreSQL volume; found $($volumes.Count)." }

if (-not $Force) {
    $confirmation = Read-Host "Type RESET $ProjectName to delete its $Environment PostgreSQL data"
    if ($confirmation -cne "RESET $ProjectName") {
        Write-Output 'Reset cancelled; no data changed.'
        exit 0
    }
}

docker compose --env-file $EnvFile -p $ProjectName down
if ($LASTEXITCODE -ne 0) { throw 'Could not stop the Compose project.' }
if ($volumes.Count -eq 1) {
    docker volume rm $volumes[0]
    if ($LASTEXITCODE -ne 0) { throw "Could not remove volume '$($volumes[0])'." }
}

docker compose --env-file $EnvFile -p $ProjectName up -d --wait database
if ($LASTEXITCODE -ne 0) { throw 'Could not recreate a healthy database.' }

Write-Output "PASS reset $Environment database for project $ProjectName"
Write-Output 'CV storage volume was preserved.'
