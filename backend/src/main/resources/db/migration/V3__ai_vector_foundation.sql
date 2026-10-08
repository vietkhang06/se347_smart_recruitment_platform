-- ============================================================================
-- MatchaJob – Smart Recruitment Platform
-- Flyway Migration: V3__ai_vector_foundation.sql
-- Description: Phase 3 AI, CV processing, async job queue, and vector structures
-- ============================================================================

-- ============================================================================
-- 1. CV_VERSIONS – Lưu trữ phiên bản CV ứng viên và dữ liệu trích xuất
-- ============================================================================
CREATE TABLE cv_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    file_path       VARCHAR(500) NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    sha256_hash     VARCHAR(64) NOT NULL,
    raw_text        TEXT,
    parsed_data     JSONB,
    status          VARCHAR(20) NOT NULL DEFAULT 'uploaded'
                    CHECK (status IN ('uploaded', 'extracted', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cv_versions_candidate ON cv_versions(candidate_id, created_at DESC);
CREATE INDEX idx_cv_versions_sha256 ON cv_versions(sha256_hash);

-- Trigger auto-update updated_at
CREATE TRIGGER trg_cv_versions_updated_at
    BEFORE UPDATE ON cv_versions
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- 2. APPLICATION_CV_SNAPSHOTS – Gắn kết bất biến giữa hồ sơ ứng tuyển và CV version
-- ============================================================================
CREATE TABLE application_cv_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    cv_version_id   UUID NOT NULL REFERENCES cv_versions(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_app_cv_snapshot UNIQUE (application_id)
);

CREATE INDEX idx_app_cv_snapshot_cv ON application_cv_snapshots(cv_version_id);

-- ============================================================================
-- 3. PROCESSING_JOBS – Hàng đợi công việc bất đồng bộ với khả năng phục hồi lỗi
-- ============================================================================
CREATE TABLE processing_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type        VARCHAR(50) NOT NULL
                    CHECK (job_type IN ('CV_TEXT_EXTRACTION', 'CV_EMBEDDING_GENERATION', 'JOB_EMBEDDING_GENERATION', 'APPLICATION_MATCHING')),
    entity_type     VARCHAR(30) NOT NULL
                    CHECK (entity_type IN ('cv_version', 'job', 'application')),
    entity_id       UUID NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    max_attempts    INTEGER NOT NULL DEFAULT 3,
    lease_token     VARCHAR(64),
    lease_expires_at TIMESTAMPTZ,
    retry_after     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error      TEXT,
    idempotency_key VARCHAR(100) NOT NULL,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_processing_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX idx_processing_jobs_ready ON processing_jobs (status, retry_after)
    WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX idx_processing_jobs_lease ON processing_jobs (status, lease_expires_at)
    WHERE status = 'PROCESSING';

-- Trigger auto-update updated_at
CREATE TRIGGER trg_processing_jobs_updated_at
    BEFORE UPDATE ON processing_jobs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- 4. EMBEDDINGS – Vector dense nhúng 1536 chiều với chỉ mục HNSW
-- ============================================================================
CREATE TABLE embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(30) NOT NULL CHECK (entity_type IN ('cv_version', 'job')),
    entity_id       UUID NOT NULL,
    chunk_index     INTEGER NOT NULL DEFAULT 0,
    chunk_text      TEXT NOT NULL,
    embedding       vector(1536) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_entity_chunk UNIQUE (entity_type, entity_id, chunk_index)
);

CREATE INDEX idx_embeddings_lookup ON embeddings(entity_type, entity_id);

-- Chỉ mục Cosine Distance HNSW tối ưu tìm kiếm độ tương đồng
CREATE INDEX idx_embeddings_hnsw ON embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- 5. MATCH_RESULTS – Kết quả chấm điểm khớp giữa ứng tuyển và công việc
-- ============================================================================
CREATE TABLE match_results (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id      UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    cv_version_id       UUID NOT NULL REFERENCES cv_versions(id) ON DELETE CASCADE,
    overall_score       SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    skills_score        SMALLINT CHECK (skills_score BETWEEN 0 AND 100),
    experience_score    SMALLINT CHECK (experience_score BETWEEN 0 AND 100),
    breakdown           JSONB NOT NULL DEFAULT '{}'::jsonb,
    rationale           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_match_application UNIQUE (application_id)
);

CREATE INDEX idx_match_results_job ON match_results(job_id, overall_score DESC);
