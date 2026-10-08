# ==============================================================================
# MATCHA JOB - TEST DATABASE INITIALIZATION SCRIPT
# scripts/init-test-db.ps1
# ==============================================================================
# Ensures the isolated test database 'matchajob_test' exists in PostgreSQL.
# Safe to run multiple times (idempotent).
# Creates ONLY an empty database; Spring Boot Flyway owns all schemas and tables.
# ==============================================================================

$ErrorActionPreference = "Stop"

$pgContainer = "matchajob-postgres-pgvector"
$dbUser = "matchajob_user"
$defaultDb = "matchajob_db"
$testDb = "matchajob_test"

Write-Host "Ensuring '$testDb' exists in PostgreSQL container '$pgContainer'..." -ForegroundColor Cyan

$createDbSql = "SELECT 'CREATE DATABASE $testDb OWNER $dbUser' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$testDb')\gexec"

try {
    docker exec $pgContainer psql -U $dbUser -d $defaultDb -c $createDbSql
    Write-Host "Successfully verified/created test database: $testDb" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create test database in container '$pgContainer'." -ForegroundColor Red
    Write-Host "Please ensure the database container is running: docker compose up -d database" -ForegroundColor Yellow
    exit 1
}
