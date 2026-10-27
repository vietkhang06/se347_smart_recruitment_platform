-- ============================================================================
-- V4: Standardize Job-Category-Skill-Level & Indexes
-- MatchaJob Smart Recruitment Platform
-- ============================================================================

-- 1. Status CHECK: Thêm 'draft' vào tập trạng thái cho phép của jobs
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS chk_jobs_status;
ALTER TABLE jobs ADD CONSTRAINT chk_jobs_status
    CHECK (status IN ('draft', 'pending', 'active', 'paused', 'closed'));

-- 2. Level CHECK: Ràng buộc 7 cấp bậc chuẩn hóa (khớp UI)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS chk_jobs_level;
ALTER TABLE jobs ADD CONSTRAINT chk_jobs_level
    CHECK (level IS NULL OR level IN ('intern', 'fresher', 'junior', 'middle', 'senior', 'lead', 'director'));

-- 3. Bảng danh mục kỹ năng chuẩn hóa (quản trị tập trung, autocomplete)
CREATE TABLE IF NOT EXISTS skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT uq_skills_name UNIQUE (name)
);

-- 4. Bảng nối job_skills (M2M giữa job và skill)
CREATE TABLE IF NOT EXISTS job_skills (
    job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
    is_required BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (job_id, skill_id)
);

-- 5. Indexes tối ưu cho Search, Filter, Sort, Pagination
CREATE INDEX IF NOT EXISTS idx_jobs_filter_composite
    ON jobs (status, category_id, level, work_type, posted_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_salary_filter
    ON jobs (status, salary_min, salary_max)
    WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_job_skills_skill_id
    ON job_skills (skill_id);

CREATE INDEX IF NOT EXISTS idx_skills_name_trgm
    ON skills USING gin (name gin_trgm_ops);
