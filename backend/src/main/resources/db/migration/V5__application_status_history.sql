-- ============================================================================
-- V5: Application Status History & Stage Enhancements
-- MatchaJob Smart Recruitment Platform
-- Description: Adds 'hired' stage to applications CHECK constraint and creates
--              application_status_histories table for full audit trail of
--              stage transitions in the recruitment pipeline.
-- ============================================================================

-- 1. Bổ sung trạng thái 'hired' vào CHECK constraint của bảng applications
--    (V2 chỉ có: new, screening, testing, interview, offer, rejected)
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_stage_check;
ALTER TABLE applications ADD CONSTRAINT chk_applications_stage
    CHECK (stage IN ('new', 'screening', 'testing', 'interview', 'offer', 'hired', 'rejected'));

-- 2. Bảng lưu vết lịch sử chuyển đổi trạng thái hồ sơ ứng tuyển
CREATE TABLE IF NOT EXISTS application_status_histories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_stage      VARCHAR(30),
    to_stage        VARCHAR(30) NOT NULL,
    changed_by      UUID NOT NULL REFERENCES users(id),
    reason          TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Chỉ mục tối ưu hóa truy vấn lịch sử theo đơn ứng tuyển
CREATE INDEX IF NOT EXISTS idx_app_status_hist_app_id
    ON application_status_histories (application_id, created_at DESC);
