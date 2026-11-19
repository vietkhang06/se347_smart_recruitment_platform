-- ============================================================================
-- MatchaJob Smart Recruitment Platform
-- Large Scale Demo & Performance Benchmark Seed Script
-- scripts/seed-large-demo-jobs.sql
--
-- Sinh 50,000+ jobs phân bổ chuẩn xác cho mục đích:
--   1. Kiểm thử search, filter, sort, pagination ở quy mô lớn
--   2. Kiểm chứng loại bỏ tin đóng, tin hết hạn (expired), tin nháp
--   3. Đối chiếu số liệu thống kê quản trị viên (Admin Statistics)
--   4. Đo lường hiệu năng và xác minh index (Execution Plan)
-- ============================================================================

DO $$
DECLARE
    fpt_company_id UUID := '44444444-4444-4444-8444-444444444441';
    vng_company_id UUID := '44444444-4444-4444-8444-444444444442';
    fpt_recruiter_id UUID := '22222222-2222-4222-8222-222222222221';

    cat_it UUID := '55555555-5555-4555-8555-555555555551';
    cat_design UUID := '55555555-5555-4555-8555-555555555552';
    cat_mkt UUID := '55555555-5555-4555-8555-555555555553';
    cat_finance UUID := '55555555-5555-4555-8555-555555555554';
    cat_sales UUID := '55555555-5555-4555-8555-555555555555';
    cat_hr UUID := '55555555-5555-4555-8555-555555555556';

    categories_arr UUID[] := ARRAY[cat_it, cat_design, cat_mkt, cat_finance, cat_sales, cat_hr];
    companies_arr UUID[] := ARRAY[fpt_company_id, vng_company_id];
    levels_arr VARCHAR[] := ARRAY['intern', 'fresher', 'junior', 'middle', 'senior', 'lead', 'director'];
    work_types_arr VARCHAR[] := ARRAY['full_time', 'part_time', 'hybrid', 'remote', 'contract'];
    locations_arr VARCHAR[] := ARRAY['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Toàn quốc'];

    titles_arr VARCHAR[] := ARRAY[
        'Kỹ sư Lập trình Java Backend',
        'Frontend React TypeScript Developer',
        'Chuyên viên Thiết kế UI/UX',
        'Senior DevOps & Cloud Infrastructure',
        'Chuyên viên Marketing Tăng trưởng',
        'Chuyên viên Tuyển dụng Nhân sự Tech',
        'Product Manager Nền tảng E-commerce',
        'Chuyên viên Phân tích Dữ liệu Data Analyst',
        'Mobile Flutter App Engineer',
        'Chuyên viên Kiểm thử Tự động QA Automation'
    ];
BEGIN
    -- 1. Xóa các job benchmark cũ nếu có (bắt đầu bằng slug 'perf-job-')
    DELETE FROM job_skills WHERE job_id IN (SELECT id FROM jobs WHERE slug LIKE 'perf-job-%');
    DELETE FROM jobs WHERE slug LIKE 'perf-job-%';

    -- 2. Sinh 50,000 jobs mẫu với vòng đời đa dạng
    INSERT INTO jobs (
        id, company_id, category_id, created_by, title, slug, department, level, work_type,
        location, address, salary_mode, salary_min, salary_max, salary_currency,
        experience, applicant_count, view_count, status, posted_at, deadline, created_at, updated_at
    )
    SELECT
        gen_random_uuid() AS id,
        companies_arr[1 + (s % 2)] AS company_id,
        categories_arr[1 + (s % 6)] AS category_id,
        fpt_recruiter_id AS created_by,
        titles_arr[1 + (s % 10)] || ' #' || s AS title,
        'perf-job-' || s AS slug,
        'Bộ phận ' || ((s % 5) + 1) AS department,
        levels_arr[1 + (s % 7)] AS level,
        work_types_arr[1 + (s % 5)] AS work_type,
        locations_arr[1 + (s % 5)] AS location,
        'Địa chỉ văn phòng số ' || s || ', Việt Nam' AS address,
        CASE
            WHEN s % 3 = 0 THEN 'range'
            WHEN s % 3 = 1 THEN 'single'
            ELSE 'negotiable'
        END AS salary_mode,
        CASE
            WHEN s % 3 = 0 THEN 15000000 + (s % 20) * 1000000
            WHEN s % 3 = 1 THEN 20000000 + (s % 15) * 1000000
            ELSE NULL
        END AS salary_min,
        CASE
            WHEN s % 3 = 0 THEN 30000000 + (s % 25) * 1000000
            ELSE NULL
        END AS salary_max,
        'VND' AS salary_currency,
        ((s % 5) + 1) || ' năm' AS experience,
        ((s * 3) % 65) AS applicant_count,
        ((s * 19) % 1200) AS view_count,
        -- Status phân bổ:
        -- s <= 35000: ACTIVE còn hạn
        -- 35001..40000: ACTIVE HẾT HẠN (expired)
        -- 40001..44000: CLOSED
        -- 44001..47000: PAUSED
        -- 47001..50000: DRAFT
        CASE
            WHEN s <= 40000 THEN 'active'
            WHEN s <= 44000 THEN 'closed'
            WHEN s <= 47000 THEN 'paused'
            ELSE 'draft'
        END AS status,
        now() - ((s % 40) + 1) * INTERVAL '1 day' AS posted_at,
        CASE
            -- active còn hạn (+7 đến +60 ngày)
            WHEN s <= 35000 THEN CURRENT_DATE + (7 + (s % 53)) * INTERVAL '1 day'
            -- active hết hạn (-1 đến -30 ngày)
            WHEN s <= 40000 THEN CURRENT_DATE - (1 + (s % 30)) * INTERVAL '1 day'
            -- closed
            WHEN s <= 44000 THEN CURRENT_DATE - 30 * INTERVAL '1 day'
            -- paused
            WHEN s <= 47000 THEN CURRENT_DATE + 15 * INTERVAL '1 day'
            -- draft
            ELSE CURRENT_DATE + 30 * INTERVAL '1 day'
        END AS deadline,
        now() - ((s % 60) + 2) * INTERVAL '1 day' AS created_at,
        now() AS updated_at
    FROM generate_series(1, 50000) AS s;

    -- 3. Gắn kỹ năng mẫu vào job_skills
    INSERT INTO job_skills (job_id, skill_id, is_required)
    SELECT
        j.id,
        s.id,
        (random() > 0.3)
    FROM jobs j
    CROSS JOIN LATERAL (
        SELECT id FROM skills
        ORDER BY random()
        LIMIT 3
    ) s
    WHERE j.slug LIKE 'perf-job-%';

    RAISE NOTICE 'Nạp thành công 50,000 jobs hiệu năng cao cho demo & benchmark!';
END $$;
