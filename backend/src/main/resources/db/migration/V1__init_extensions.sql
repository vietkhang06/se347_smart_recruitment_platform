-- ==============================================================================
-- Migration: V1__init_extensions.sql
-- Project: MatchaJob Backend (SE347)
-- Phase: Phase 2 (Foundation)
-- Description: Enable required PostgreSQL extensions for pgvector.
-- Note: UUID generation uses PostgreSQL 16 core built-in gen_random_uuid();
--       uuid-ossp is not required.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
