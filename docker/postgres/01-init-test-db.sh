#!/bin/bash
set -e

# ==============================================================================
# Script: 01-init-test-db.sh
# Purpose: Initialize empty test database for backend integration tests.
# Scope: Creates ONLY the empty database 'matchajob_test'.
# Schema Ownership: 100% owned by Spring Boot Flyway. Zero application tables
#                   or extensions are created here.
# ==============================================================================

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE matchajob_test OWNER $POSTGRES_USER'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'matchajob_test')\gexec
EOSQL
