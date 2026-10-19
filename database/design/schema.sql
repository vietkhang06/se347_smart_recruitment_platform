-- ============================================================================
-- MatchaJob – Smart Recruitment Platform
-- Database Schema Design (PostgreSQL 16+)
-- ============================================================================
-- Quy ước:
--   • snake_case cho tất cả identifiers
--   • UUID v7 (time-ordered) làm PK mặc định → index-friendly, không lộ volume
--   • TIMESTAMPTZ cho mọi cột thời gian
--   • Soft-delete qua cột deleted_at (NULL = active)
--   • Audit columns (created_at, updated_at) trên mọi bảng
--   • ENUM dùng CHECK constraint (dễ migrate hơn PostgreSQL ENUM type)
-- ============================================================================

-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- trigram index cho full-text search

-- ============================================================================
-- 1. USERS – Bảng trung tâm xác thực
-- ============================================================================
-- Mọi role (candidate, employer, admin) đều là 1 row trong users.
-- Profile data tách sang bảng riêng (candidate_profiles, companies) → SRP.
-- ============================================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    avatar_url      VARCHAR(500),
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('candidate', 'employer', 'admin')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending_verification'
                        CHECK (status IN ('active', 'pending_verification', 'suspended')),
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    timezone        VARCHAR(50)  DEFAULT 'Asia/Ho_Chi_Minh',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Index: tìm user theo role + status (admin panel)
CREATE INDEX idx_users_role_status ON users (role, status) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. ADMIN_PERMISSIONS – Phân quyền chi tiết cho admin
-- ============================================================================
-- Tách riêng vì chỉ admin có, tránh nullable columns trên users.
-- ============================================================================
CREATE TABLE admin_permissions (
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission  VARCHAR(50) NOT NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id, permission)
);

-- ============================================================================
-- 3. COMPANIES – Hồ sơ doanh nghiệp
-- ============================================================================
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name            VARCHAR(255) NOT NULL,
    short_name      VARCHAR(50),
    logo_url        VARCHAR(500),
    cover_image_url VARCHAR(500),
    industry        VARCHAR(100),
    size            VARCHAR(50)  CHECK (size IN (
                        '1-49', '50-150', '150-500', '500-1000', '1000+'
                    )),
    location        VARCHAR(255),
    address         TEXT,
    website         VARCHAR(500),
    email           VARCHAR(255),
    phone           VARCHAR(20),
    tax_code        VARCHAR(30),
    established     SMALLINT,
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    about           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT uq_companies_tax_code UNIQUE (tax_code)
);

CREATE INDEX idx_companies_owner    ON companies (owner_id);
CREATE INDEX idx_companies_industry ON companies (industry) WHERE deleted_at IS NULL;
-- Trigram index cho search by name
CREATE INDEX idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);

-- ============================================================================
-- 4. COMPANY_PERKS – Phúc lợi (M2M tự tham chiếu đơn giản)
-- ============================================================================
CREATE TABLE company_perks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    perk        VARCHAR(255) NOT NULL,
    sort_order  SMALLINT     NOT NULL DEFAULT 0,

    CONSTRAINT uq_company_perk UNIQUE (company_id, perk)
);

-- ============================================================================
-- 4b. COMPANY_MEMBERS – Thành viên quản lý công ty (nhiều HR cùng 1 company)
-- ============================================================================
-- ponytail: bảng đơn giản, mở rộng thêm permissions per-member khi cần
-- ============================================================================
CREATE TABLE company_members (
    company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member')),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (company_id, user_id)
);

CREATE INDEX idx_company_members_user ON company_members (user_id);

-- ============================================================================
-- 5. CANDIDATE_PROFILES – Hồ sơ ứng viên
-- ============================================================================
CREATE TABLE candidate_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    headline    VARCHAR(255),               -- "Senior Frontend Developer"
    bio         TEXT,
    experience_years SMALLINT,              -- số năm kinh nghiệm (NULL = chưa điền)
    education   VARCHAR(500),
    location    VARCHAR(255),
    address     TEXT,
    cv_url      VARCHAR(500),               -- link to uploaded CV
    ai_cv_score SMALLINT CHECK (ai_cv_score BETWEEN 0 AND 100),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,

    CONSTRAINT uq_candidate_user UNIQUE (user_id)
);

-- ============================================================================
-- 6. CANDIDATE_SKILLS – Kỹ năng ứng viên
-- ============================================================================
-- Tách bảng riêng để query/filter hiệu quả (GIN index trên skill array
-- chỉ tốt cho containment, không tốt cho aggregation).
-- ============================================================================
CREATE TABLE candidate_skills (
    candidate_id UUID         NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    skill        VARCHAR(100) NOT NULL,

    PRIMARY KEY (candidate_id, skill)
);

CREATE INDEX idx_candidate_skills_skill ON candidate_skills (skill);

-- ============================================================================
-- 7. CANDIDATE_WORK_HISTORY – Lịch sử làm việc
-- ============================================================================
CREATE TABLE candidate_work_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID         NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    company_name    VARCHAR(255),
    role_title      VARCHAR(255) NOT NULL,
    started_at      DATE,
    ended_at        DATE,                    -- NULL = đang làm việc
    description     TEXT,
    sort_order      SMALLINT     NOT NULL DEFAULT 0
);

CREATE INDEX idx_work_history_candidate ON candidate_work_history (candidate_id);

-- ============================================================================
-- 8. CATEGORIES – Danh mục ngành nghề (admin quản lý)
-- ============================================================================
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(100),                -- Bootstrap icon class
    status      VARCHAR(20)  NOT NULL DEFAULT 'visible'
                    CHECK (status IN ('visible', 'draft')),
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,

    CONSTRAINT uq_categories_name UNIQUE (name)
);

-- ============================================================================
-- 9. JOBS – Tin tuyển dụng
-- ============================================================================
CREATE TABLE jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    category_id     UUID          REFERENCES categories(id) ON DELETE SET NULL,
    created_by      UUID          NOT NULL REFERENCES users(id)     ON DELETE RESTRICT,

    title           VARCHAR(300)  NOT NULL,
    slug            VARCHAR(350) UNIQUE,      -- SEO-friendly URL
    department      VARCHAR(100),
    level           VARCHAR(80),              -- JOB_LEVELS enum
    work_type       VARCHAR(60)   NOT NULL CHECK (work_type IN (
                        'full_time', 'part_time', 'hybrid', 'remote', 'contract'
                    )),
    location        VARCHAR(255),
    address         TEXT,
    map_link        VARCHAR(500),

    -- Lương: lưu số để query range, format ở application layer
    salary_mode     VARCHAR(10)   NOT NULL DEFAULT 'range'
                        CHECK (salary_mode IN ('range', 'single', 'negotiable')),
    salary_min      BIGINT,                   -- VND, NULL nếu negotiable
    salary_max      BIGINT,                   -- VND, NULL nếu single/negotiable
    salary_currency VARCHAR(3)    NOT NULL DEFAULT 'VND',

    experience      VARCHAR(50),              -- "1-3 năm", "Không yêu cầu"
    description     TEXT,                     -- HTML
    requirements    TEXT,                     -- HTML
    benefits        TEXT,                     -- HTML
    schedule        TEXT,                     -- HTML

    -- Tóm tắt AI
    summary_industry   VARCHAR(200),
    summary_required   TEXT,
    summary_preferred  TEXT,

    -- Metrics (denormalized counters, cập nhật bằng trigger/app)
    applicant_count INTEGER      NOT NULL DEFAULT 0,
    view_count      INTEGER      NOT NULL DEFAULT 0,

    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('active', 'pending', 'paused', 'closed')),
    posted_at       TIMESTAMPTZ,
    deadline        DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_salary_range CHECK (
        salary_mode = 'negotiable'
        OR (salary_mode = 'single' AND salary_min IS NOT NULL)
        OR (salary_mode = 'range'  AND salary_min IS NOT NULL AND salary_max IS NOT NULL
            AND salary_max >= salary_min)
    )
);

CREATE INDEX idx_jobs_company     ON jobs (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_category    ON jobs (category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_status      ON jobs (status, posted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_salary      ON jobs (salary_min, salary_max) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_jobs_deadline    ON jobs (deadline) WHERE deleted_at IS NULL AND status = 'active';
-- Full-text search
CREATE INDEX idx_jobs_title_trgm  ON jobs USING gin (title gin_trgm_ops);
CREATE INDEX idx_jobs_location_trgm ON jobs USING gin (location gin_trgm_ops);

-- Composite cho browse: status + category + location
CREATE INDEX idx_jobs_browse ON jobs (status, category_id, location) WHERE deleted_at IS NULL;

-- ============================================================================
-- 10. JOB_TAGS – Tags cho requirements / specializations
-- ============================================================================
-- tag_type: 'requirement' hoặc 'specialization' (reqTags vs specTags trong mock)
-- ============================================================================
CREATE TABLE job_tags (
    job_id      UUID         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tag_type    VARCHAR(15)  NOT NULL CHECK (tag_type IN ('requirement', 'specialization')),
    tag         VARCHAR(100) NOT NULL,

    PRIMARY KEY (job_id, tag_type, tag)
);

CREATE INDEX idx_job_tags_tag ON job_tags (tag);

-- ============================================================================
-- 11. SAVED_JOBS – Ứng viên lưu tin yêu thích
-- ============================================================================
CREATE TABLE saved_jobs (
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id      UUID        NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
    saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id, job_id)
);

-- ============================================================================
-- 12. APPLICATIONS – Hồ sơ ứng tuyển
-- ============================================================================
CREATE TABLE applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID         NOT NULL REFERENCES candidate_profiles(id) ON DELETE RESTRICT,
    job_id          UUID         NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,

    cover_letter    TEXT,
    cv_snapshot_url VARCHAR(500),             -- snapshot CV tại thời điểm nộp

    stage           VARCHAR(30)  NOT NULL DEFAULT 'new'
                        CHECK (stage IN (
                            'new',           -- Mới
                            'screening',     -- Sàng lọc
                            'testing',       -- Bài kiểm tra
                            'interview',     -- Phỏng vấn
                            'offer',         -- Đề nghị
                            'rejected'       -- Không phù hợp / Đã từ chối
                        )),
    reject_reason   TEXT,
    match_score     SMALLINT     CHECK (match_score BETWEEN 0 AND 100),

    applied_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Mỗi ứng viên chỉ ứng tuyển 1 job 1 lần (có thể nộp lại sau reject → xóa constraint này nếu cần)
    CONSTRAINT uq_application UNIQUE (candidate_id, job_id)
);

CREATE INDEX idx_applications_job       ON applications (job_id, stage);
CREATE INDEX idx_applications_candidate ON applications (candidate_id);

-- ============================================================================
-- 13. INTERVIEWS – Lịch phỏng vấn
-- ============================================================================
CREATE TABLE interviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID         NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

    interview_type  VARCHAR(100),             -- "Phỏng vấn chuyên môn", "Portfolio review", etc.
    interview_mode  VARCHAR(20)  NOT NULL DEFAULT 'online'
                        CHECK (interview_mode IN ('online', 'onsite')),
    scheduled_at    TIMESTAMPTZ  NOT NULL,
    duration_min    SMALLINT     DEFAULT 60,
    meeting_link    VARCHAR(500),             -- NULL nếu onsite
    location        VARCHAR(255),             -- NULL nếu online
    participants    TEXT,                     -- comma-separated hoặc JSON

    status          VARCHAR(20)  NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'confirmed', 'pending_confirm', 'completed', 'cancelled')),
    note            TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_interviews_application ON interviews (application_id);
CREATE INDEX idx_interviews_schedule    ON interviews (scheduled_at) WHERE status NOT IN ('completed', 'cancelled');

-- ============================================================================
-- 14. MODERATION_REVIEWS – Duyệt tin / xác minh công ty (Admin)
-- ============================================================================
CREATE TABLE moderation_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_type     VARCHAR(10)  NOT NULL CHECK (review_type IN ('job', 'company')),
    job_id          UUID         REFERENCES jobs(id) ON DELETE CASCADE,
    company_id      UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    risk_level      VARCHAR(15)  NOT NULL DEFAULT 'low'
                        CHECK (risk_level IN ('low', 'medium', 'high')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'needs_review', 'pending_verification',
                                          'approved', 'rejected')),
    details         TEXT,
    reviewer_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    review_note     TEXT,
    submitted_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    reviewed_at     TIMESTAMPTZ,

    -- Job review phải có job_id
    CONSTRAINT chk_review_job CHECK (review_type != 'job' OR job_id IS NOT NULL)
);

CREATE INDEX idx_moderation_status ON moderation_reviews (status) WHERE status IN ('pending', 'needs_review');
CREATE INDEX idx_moderation_job    ON moderation_reviews (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_moderation_company ON moderation_reviews (company_id);

-- ============================================================================
-- 15. REPORTS – Báo cáo vi phạm
-- ============================================================================
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     UUID         REFERENCES users(id) ON DELETE SET NULL,  -- NULL = ẩn danh
    target_type     VARCHAR(20)  NOT NULL CHECK (target_type IN ('company', 'job', 'user', 'external')),
    target_job_id   UUID         REFERENCES jobs(id) ON DELETE SET NULL,
    target_company_id UUID       REFERENCES companies(id) ON DELETE SET NULL,
    target_user_id  UUID         REFERENCES users(id) ON DELETE SET NULL,

    subject         VARCHAR(300) NOT NULL,
    description     TEXT,
    severity        VARCHAR(15)  NOT NULL DEFAULT 'medium'
                        CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'investigating', 'resolved', 'dismissed')),

    -- Resolution
    resolver_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    resolution      TEXT,
    action_taken    VARCHAR(30)  CHECK (action_taken IN ('none', 'warning', 'close_job',
                                        'suspend_company', 'suspend_user')),
    resolved_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status   ON reports (status) WHERE status IN ('new', 'investigating');
CREATE INDEX idx_reports_severity ON reports (severity, status);

-- ============================================================================
-- 16. SYSTEM_SETTINGS – Cấu hình hệ thống (key-value)
-- ============================================================================
CREATE TABLE system_settings (
    key         VARCHAR(50)  PRIMARY KEY,
    label       VARCHAR(200) NOT NULL,
    description TEXT,
    value       JSONB        NOT NULL DEFAULT 'false'::jsonb,  -- boolean, number, string
    updated_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Seed initial settings
INSERT INTO system_settings (key, label, description, value) VALUES
    ('auto_approve_verified', 'Tự động duyệt tin từ công ty đã xác minh',
     'Bỏ qua kiểm duyệt thủ công cho các công ty đã được xác minh', 'true'::jsonb),
    ('ai_risk_filter', 'Bộ lọc rủi ro AI',
     'Tự động đánh dấu tin đăng có nội dung đáng ngờ', 'true'::jsonb),
    ('mandatory_salary', 'Bắt buộc hiển thị lương',
     'Yêu cầu tất cả tin tuyển dụng phải công khai mức lương', 'false'::jsonb),
    ('sla_alert_30min', 'Cảnh báo SLA 30 phút',
     'Gửi cảnh báo khi tin chờ duyệt quá 30 phút', 'true'::jsonb),
    ('maintenance_mode', 'Chế độ bảo trì',
     'Tạm ngưng truy cập hệ thống để bảo trì', 'false'::jsonb);

-- ============================================================================
-- 17. AUDIT_LOGS – Nhật ký hệ thống (append-only)
-- ============================================================================
-- Không có UPDATE/DELETE trên bảng này → dùng cho compliance.
-- Partition theo tháng nếu volume lớn.
-- ============================================================================
CREATE TABLE audit_logs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id    UUID         REFERENCES users(id) ON DELETE SET NULL,
    actor_type  VARCHAR(20)  NOT NULL DEFAULT 'user'
                    CHECK (actor_type IN ('user', 'system', 'ai')),
    action      VARCHAR(60)  NOT NULL,       -- 'CREATE_JOB', 'APPROVE_JOB', etc.
    target_type VARCHAR(30),                 -- 'job', 'user', 'company', 'category', etc.
    target_id   VARCHAR(100),                -- entity UUID or description
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB,                       -- extra context
    status      VARCHAR(20)  NOT NULL DEFAULT 'success',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- BRIN index: append-only, time-ordered → BRIN rất hiệu quả
CREATE INDEX idx_audit_logs_time   ON audit_logs USING brin (created_at);
CREATE INDEX idx_audit_logs_actor  ON audit_logs (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

-- ============================================================================
-- 18. NOTIFICATIONS – Thông báo
-- ============================================================================
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(300) NOT NULL,
    detail      TEXT,
    tone        VARCHAR(10)  DEFAULT 'teal'
                    CHECK (tone IN ('red', 'orange', 'green', 'teal')),
    link_tab    VARCHAR(50),                 -- deep-link target: "reports", "moderation", etc.
    link_id     VARCHAR(100),                -- optional entity ID
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- 19. BILLING_PLANS – Gói dịch vụ
-- ============================================================================
CREATE TABLE billing_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)  NOT NULL,
    price       BIGINT       NOT NULL DEFAULT 0,     -- VND/tháng
    period      VARCHAR(20)  NOT NULL DEFAULT 'month',
    quota       INTEGER      NOT NULL DEFAULT 0,     -- số tin đăng / tháng
    features    JSONB        NOT NULL DEFAULT '[]',   -- ["Feature 1", "Feature 2"]
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- 20. COMPANY_SUBSCRIPTIONS – Đăng ký gói dịch vụ
-- ============================================================================
CREATE TABLE company_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id         UUID         NOT NULL REFERENCES billing_plans(id) ON DELETE RESTRICT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,
    jobs_used       INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_company ON company_subscriptions (company_id, status);

-- ============================================================================
-- 21. GUIDES – Bài viết hướng dẫn (public content)
-- ============================================================================
CREATE TABLE guides (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(300) NOT NULL,
    category    VARCHAR(100),
    slug        VARCHAR(350) UNIQUE,          -- SEO-friendly URL
    content     TEXT,
    read_time   VARCHAR(20),
    author_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN     NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_guides_published ON guides (is_published, published_at DESC) WHERE is_published = TRUE;

-- ============================================================================
-- 22. PASSWORD_RESET_TOKENS – OTP / Reset flow
-- ============================================================================
CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,        -- hashed OTP/token
    expires_at  TIMESTAMPTZ  NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_reset_tokens_user ON password_reset_tokens (user_id, expires_at);
-- Lookup active tokens by hash (partial: only unused + not expired checked at app layer)
CREATE INDEX idx_reset_tokens_active ON password_reset_tokens (token_hash) WHERE used_at IS NULL;

-- ============================================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'updated_at'
        GROUP BY table_name
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================================
-- VIEW: Employer dashboard metrics
-- ============================================================================
-- Dùng LATERAL subquery tránh cross-product giữa applications × interviews
-- ============================================================================
CREATE OR REPLACE VIEW vw_employer_dashboard AS
SELECT
    j.company_id,
    COUNT(j.id) FILTER (WHERE j.status = 'active')        AS active_jobs,
    COALESCE(SUM(app.new_count), 0)                        AS new_applications,
    COALESCE(SUM(app.total_count), 0)                      AS total_applications,
    COALESCE(SUM(intv.upcoming), 0)                        AS upcoming_interviews,
    SUM(j.view_count) FILTER (WHERE j.status = 'active')   AS total_views
FROM jobs j
LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE stage = 'new') AS new_count,
           count(*) AS total_count
    FROM applications WHERE job_id = j.id
) app ON TRUE
LEFT JOIN LATERAL (
    SELECT count(*) AS upcoming
    FROM interviews i
    JOIN applications a ON a.id = i.application_id
    WHERE a.job_id = j.id
      AND i.status IN ('scheduled', 'confirmed')
      AND i.scheduled_at > now()
) intv ON TRUE
WHERE j.deleted_at IS NULL
GROUP BY j.company_id;

-- ============================================================================
-- VIEW: Admin moderation queue
-- ============================================================================
CREATE OR REPLACE VIEW vw_moderation_queue AS
SELECT
    mr.id,
    mr.review_type,
    mr.risk_level,
    mr.status,
    mr.submitted_at,
    j.title   AS job_title,
    c.name    AS company_name,
    c.is_verified AS company_verified
FROM moderation_reviews mr
LEFT JOIN jobs j      ON j.id = mr.job_id
JOIN      companies c ON c.id = mr.company_id
WHERE mr.status IN ('pending', 'needs_review', 'pending_verification')
ORDER BY
    CASE mr.risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    mr.submitted_at;
