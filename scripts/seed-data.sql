-- ============================================================================
-- MatchaJob Smart Recruitment Platform
-- Seed Data Script: scripts/seed-data.sql
-- Description: Khởi tạo dữ liệu mẫu toàn diện cho môi trường thử nghiệm và kết nối.
-- Đảm bảo:
--   1. Thỏa mãn 100% các ràng buộc khóa chính, ngoại, UNIQUE và CHECK constraints.
--   2. Bao quát đầy đủ các vai trò (admin, employer, candidate) với mật khẩu chuẩn.
--   3. Đầy đủ vòng đời Job (draft, pending, active, paused, closed).
--   4. Đầy đủ các giai đoạn ứng tuyển (new, screening, testing, interview, offer, hired, rejected).
--   5. Idempotent: Có thể chạy nhiều lần mà không bị lỗi trùng lặp khóa.
-- Mật khẩu mặc định cho tất cả tài khoản test: Password123!
-- ============================================================================

BEGIN;

-- 0. XÓA DỮ LIỆU CŨ TRONG CÁC BẢNG (CASCADE THEO THỨ TỰ PHỤ THUỘC)
TRUNCATE TABLE
    audit_logs,
    reports,
    moderation_reviews,
    match_results,
    interviews,
    application_status_histories,
    application_cv_snapshots,
    applications,
    saved_jobs,
    job_tags,
    job_skills,
    processing_jobs,
    embeddings,
    cv_versions,
    jobs,
    candidate_work_history,
    candidate_skills,
    candidate_profiles,
    company_perks,
    company_members,
    companies,
    admin_permissions,
    skills,
    categories,
    users
CASCADE;

-- ============================================================================
-- 1. USERS (Mật khẩu: Password123! -> BCrypt hash chuẩn)
-- ============================================================================
-- $2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy
INSERT INTO users (id, email, phone, password_hash, full_name, avatar_url, role, status, is_verified, created_at, updated_at) VALUES
    -- Admin
    ('11111111-1111-4111-8111-111111111111', 'admin@matchajob.com', '0909000001', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Quản trị viên Hệ thống', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'admin', 'active', true, now(), now()),
    ('11111111-1111-4111-8111-111111111112', 'admin@matchajob.vn', '0909000002', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Quản trị viên MatchaJob', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'admin', 'active', true, now(), now()),
    
    -- Employers (FPT & VNG)
    ('22222222-2222-4222-8222-222222222221', 'employer@fpt.com', '0901234567', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Nguyễn Hoàng Long', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'employer', 'active', true, now(), now()),
    ('22222222-2222-4222-8222-222222222222', 'recruiter@fpt.com', '0912345678', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Trần Thị Mai', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'employer', 'active', true, now(), now()),
    ('22222222-2222-4222-8222-222222222224', 'talent@fpt.com', '0901234568', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Nguyễn Lan Anh', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'employer', 'active', true, now(), now()),
    ('22222222-2222-4222-8222-222222222223', 'talent@vng.com.vn', '0988776655', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Lê Quốc Bảo', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'employer', 'active', true, now(), now()),

    -- Candidates
    ('33333333-3333-4333-8333-333333333331', 'khanh.candidate@gmail.com', '0933112233', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Phạm Duy Khánh', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'candidate', 'active', true, now(), now()),
    ('33333333-3333-4333-8333-333333333332', 'thong.candidate@gmail.com', '0944223344', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Phạm Nhật Thông', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'candidate', 'active', true, now(), now()),
    ('33333333-3333-4333-8333-333333333333', 'hung.candidate@gmail.com', '0955334455', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Nguyễn Đại Hưng', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'candidate', 'active', true, now(), now()),
    ('33333333-3333-4333-8333-333333333334', 'mai.candidate@gmail.com', '0966445566', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Võ Quỳnh Mai', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'candidate', 'active', true, now(), now()),
    ('33333333-3333-4333-8333-333333333335', 'ankhang@example.com', '0909123456', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Nguyễn An Khang', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'candidate', 'active', true, now(), now());

-- ============================================================================
-- 2. ADMIN PERMISSIONS
-- ============================================================================
INSERT INTO admin_permissions (user_id, permission, granted_at) VALUES
    ('11111111-1111-4111-8111-111111111111', 'SUPER_ADMIN', now()),
    ('11111111-1111-4111-8111-111111111111', 'MANAGE_USERS', now()),
    ('11111111-1111-4111-8111-111111111111', 'MODERATE_JOBS', now()),
    ('11111111-1111-4111-8111-111111111111', 'MANAGE_CATEGORIES', now()),
    ('11111111-1111-4111-8111-111111111111', 'VIEW_LOGS', now()),
    ('11111111-1111-4111-8111-111111111111', 'MANAGE_SETTINGS', now()),
    ('11111111-1111-4111-8111-111111111112', 'SUPER_ADMIN', now()),
    ('11111111-1111-4111-8111-111111111112', 'MANAGE_USERS', now()),
    ('11111111-1111-4111-8111-111111111112', 'MODERATE_JOBS', now());

-- ============================================================================
-- 3. COMPANIES (FPT Digital Talent & VNG Corporation)
-- ============================================================================
INSERT INTO companies (id, owner_id, name, short_name, logo_url, cover_image_url, industry, size, location, address, website, email, phone, tax_code, established, is_verified, about, created_at, updated_at) VALUES
    ('44444444-4444-4444-8444-444444444441', '22222222-2222-4222-8222-222222222221', 'FPT Digital Talent', 'FPT', 'https://placehold.co/120x120/0f172a/ffffff?text=FP', 'https://placehold.co/1200x350/10b981/ffffff?text=FPT+Digital+Talent+Banner', 'Công nghệ thông tin & Sản phẩm số', '500-1000', 'TP. Hồ Chí Minh', 'Tòa nhà FPT Tân Thuận, Đường số 8, KCX Tân Thuận, Quận 7, TP.HCM', 'https://fptsoftware.com', 'talent@fpt.com', '02873007373', '0101248141', 1999, true, 'Đội ngũ công nghệ phát triển các sản phẩm số có tác động tích cực đến hàng triệu người dùng. Môi trường làm việc năng động, tôn trọng sáng tạo và khuyến khích học hỏi liên tục.', now(), now()),
    ('44444444-4444-4444-8444-444444444442', '22222222-2222-4222-8222-222222222223', 'VNG Corporation', 'VNG', 'https://placehold.co/120x120/0f172a/ffffff?text=VNG', 'https://placehold.co/1200x350/f97316/ffffff?text=VNG+Campus+Banner', 'Nền tảng số & Trò chơi trực tuyến', '1000+', 'TP. Hồ Chí Minh', 'Z06, Đường số 13, KCX Tân Thuận, Phường Tân Thuận Đông, Quận 7, TP.HCM', 'https://vng.com.vn', 'recruitment@vng.com.vn', '02839623888', '0303541485', 2004, true, 'VNG là doanh nghiệp công nghệ hàng đầu Việt Nam với hệ sinh thái đa dạng từ Zalo, ZaloPay đến phát hành trò chơi quốc tế.', now(), now());

-- ============================================================================
-- 4. COMPANY MEMBERS & PERKS
-- ============================================================================
INSERT INTO company_members (company_id, user_id, role, joined_at) VALUES
    ('44444444-4444-4444-8444-444444444441', '22222222-2222-4222-8222-222222222221', 'owner', now()),
    ('44444444-4444-4444-8444-444444444441', '22222222-2222-4222-8222-222222222222', 'admin', now()),
    ('44444444-4444-4444-8444-444444444441', '22222222-2222-4222-8222-222222222224', 'member', now()),
    ('44444444-4444-4444-8444-444444444442', '22222222-2222-4222-8222-222222222223', 'owner', now());

INSERT INTO company_perks (id, company_id, perk, sort_order) VALUES
    (gen_random_uuid(), '44444444-4444-4444-8444-444444444441', 'Làm việc Hybrid linh hoạt (2 ngày remote/tuần)', 1),
    (gen_random_uuid(), '44444444-4444-4444-8444-444444444441', 'Bảo hiểm sức khỏe FPT Care toàn diện cho bản thân & gia đình', 2),
    (gen_random_uuid(), '44444444-4444-4444-8444-444444444441', 'Ngân sách tài trợ học tập & chứng chỉ quốc tế định kỳ', 3),
    (gen_random_uuid(), '44444444-4444-4444-8444-444444444441', 'Thưởng hiệu suất kinh doanh & Lương tháng 13', 4),
    (gen_random_uuid(), '44444444-4444-4444-8444-444444444441', 'Teambuilding hàng quý, du lịch nghỉ dưỡng hàng năm', 5),
    (gen_random_uuid(), '44444444-4444-4444-8444-444444444442', 'Campus chuẩn công nghệ quốc tế với hồ bơi, gym & rạp chiếu phim', 1),
    (gen_random_uuid(), '44444444-4444-4444-8444-444444444442', 'Gói thưởng cổ phiếu ESOP hấp dẫn', 2),
    (gen_random_uuid(), '44444444-4444-4444-8444-444444444442', 'Cơm trưa và đồ uống miễn phí tại căng-tin công ty', 3);

-- ============================================================================
-- 5. CATEGORIES & SKILLS (Taxonomy)
-- ============================================================================
INSERT INTO categories (id, name, icon, status, sort_order, created_at, updated_at) VALUES
    ('55555555-5555-4555-8555-555555555551', 'Công nghệ thông tin', 'bi-laptop', 'visible', 1, now(), now()),
    ('55555555-5555-4555-8555-555555555552', 'Thiết kế & Sáng tạo', 'bi-palette', 'visible', 2, now(), now()),
    ('55555555-5555-4555-8555-555555555553', 'Marketing & Truyền thông', 'bi-megaphone', 'visible', 3, now(), now()),
    ('55555555-5555-4555-8555-555555555554', 'Tài chính & Ngân hàng', 'bi-cash-coin', 'visible', 4, now(), now()),
    ('55555555-5555-4555-8555-555555555555', 'Bán hàng & CSKH', 'bi-headset', 'visible', 5, now(), now()),
    ('55555555-5555-4555-8555-555555555556', 'Nhân sự & Tuyển dụng', 'bi-people', 'visible', 6, now(), now());

INSERT INTO skills (id, name, category_id, created_at, updated_at) VALUES
    ('66666666-5555-4555-8555-555555555501', 'Java', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555502', 'Spring Boot', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555503', 'React', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555504', 'TypeScript', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555505', 'PostgreSQL', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555506', 'Docker', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555507', 'Python', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555508', 'Playwright', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555509', 'Kubernetes', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555510', 'Flutter', '55555555-5555-4555-8555-555555555551', now(), now()),
    ('66666666-5555-4555-8555-555555555511', 'Figma', '55555555-5555-4555-8555-555555555552', now(), now()),
    ('66666666-5555-4555-8555-555555555512', 'UI/UX Research', '55555555-5555-4555-8555-555555555552', now(), now()),
    ('66666666-5555-4555-8555-555555555513', 'Design System', '55555555-5555-4555-8555-555555555552', now(), now()),
    ('66666666-5555-4555-8555-555555555514', 'SEO Marketing', '55555555-5555-4555-8555-555555555553', now(), now()),
    ('66666666-5555-4555-8555-555555555515', 'Google Ads', '55555555-5555-4555-8555-555555555553', now(), now()),
    ('66666666-5555-4555-8555-555555555516', 'B2B Sales', '55555555-5555-4555-8555-555555555555', now(), now());

-- ============================================================================
-- 6. CANDIDATE PROFILES & WORK HISTORY & CV VERSIONS
-- ============================================================================
INSERT INTO candidate_profiles (id, user_id, headline, bio, experience_years, education, location, address, cv_url, ai_cv_score, created_at, updated_at) VALUES
    ('77777777-7777-4777-8777-777777777771', '33333333-3333-4333-8333-333333333331', 'Senior Frontend Engineer (React / TypeScript)', 'Kỹ sư Frontend với 4+ năm kinh nghiệm phát triển các nền tảng web quy mô lớn, tối ưu hóa trải nghiệm người dùng và hiệu năng ứng dụng SPA/SSR.', 4, 'Đại học Khoa học Tự nhiên TP.HCM - Kỹ thuật Phần mềm', 'TP. Hồ Chí Minh', 'Quận Bình Thạnh, TP.HCM', '/data/cv/cv_pham_duy_khanh_2026.pdf', 94, now(), now()),
    ('77777777-7777-4777-8777-777777777772', '33333333-3333-4333-8333-333333333332', 'Backend Engineer (Java / Spring Boot & Microservices)', 'Chuyên môn sâu về kiến trúc Microservices, Clean Architecture, High-throughput APIs và cơ sở dữ liệu PostgreSQL/Redis.', 3, 'Đại học Bách Khoa TP.HCM - Khoa học Máy tính', 'TP. Hồ Chí Minh', 'Thành phố Thủ Đức, TP.HCM', '/data/cv/cv_pham_nhat_thong_2026.pdf', 91, now(), now()),
    ('77777777-7777-4777-8777-777777777773', '33333333-3333-4333-8333-333333333333', 'QA Automation Engineer (Playwright & Postman)', 'Kỹ sư kiểm thử tự động với niềm đam mê xây dựng hệ thống CI/CD test pipeline tự động, kiểm thử API và UI end-to-end.', 2, 'Đại học Công nghệ Thông tin ĐHQG-HCM', 'Đà Nẵng', 'Quận Hải Châu, TP. Đà Nẵng', '/data/cv/cv_nguyen_dai_hung_2026.pdf', 82, now(), now()),
    ('77777777-7777-4777-8777-777777777774', '33333333-3333-4333-8333-333333333334', 'UI/UX Designer & Design System Specialist', 'Nhà thiết kế sản phẩm số tập trung vào xây dựng Design System nhất quán, Prototype tương tác cao và nghiên cứu hành vi người dùng.', 3, 'Đại học Kiến trúc TP.HCM - Thiết kế Đồ họa', 'Hà Nội', 'Quận Cầu Giấy, Hà Nội', '/data/cv/cv_vo_quynh_mai_2026.pdf', 88, now(), now()),
    ('77777777-7777-4777-8777-777777777775', '33333333-3333-4333-8333-333333333335', 'Fullstack Developer (React & Node.js)', 'Lập trình viên nhiệt huyết với khả năng xây dựng ứng dụng toàn diện từ giao diện tới dịch vụ phía máy chủ.', 2, 'Đại học Bách Khoa TP.HCM', 'TP. Hồ Chí Minh', 'Quận 10, TP.HCM', '/data/cv/cv_nguyen_an_khang.pdf', 85, now(), now());

INSERT INTO candidate_skills (candidate_id, skill) VALUES
    ('77777777-7777-4777-8777-777777777771', 'React'),
    ('77777777-7777-4777-8777-777777777771', 'TypeScript'),
    ('77777777-7777-4777-8777-777777777771', 'Bootstrap'),
    ('77777777-7777-4777-8777-777777777771', 'Figma'),
    ('77777777-7777-4777-8777-777777777772', 'Java'),
    ('77777777-7777-4777-8777-777777777772', 'Spring Boot'),
    ('77777777-7777-4777-8777-777777777772', 'PostgreSQL'),
    ('77777777-7777-4777-8777-777777777772', 'Docker'),
    ('77777777-7777-4777-8777-777777777773', 'Playwright'),
    ('77777777-7777-4777-8777-777777777773', 'Postman'),
    ('77777777-7777-4777-8777-777777777774', 'Figma'),
    ('77777777-7777-4777-8777-777777777774', 'UI/UX Research'),
    ('77777777-7777-4777-8777-777777777774', 'Design System'),
    ('77777777-7777-4777-8777-777777777775', 'React'),
    ('77777777-7777-4777-8777-777777777775', 'Node.js'),
    ('77777777-7777-4777-8777-777777777775', 'JavaScript');

INSERT INTO candidate_work_history (id, candidate_id, company_name, role_title, started_at, ended_at, description, sort_order) VALUES
    (gen_random_uuid(), '77777777-7777-4777-8777-777777777771', 'Tiki Corporation', 'Senior Frontend Developer', '2022-01-01', NULL, 'Chịu trách nhiệm thiết kế kiến trúc Frontend nền tảng E-commerce web checkout.', 1),
    (gen_random_uuid(), '77777777-7777-4777-8777-777777777772', 'MoMo Fintech', 'Backend Engineer', '2023-03-01', NULL, 'Xây dựng dịch vụ ví điện tử và microservices thanh toán bảo mật cao.', 1),
    (gen_random_uuid(), '77777777-7777-4777-8777-777777777773', 'KMS Technology', 'QC Engineer', '2024-02-01', NULL, 'Viết và thực thi automation test script cho khách hàng tài chính Bắc Mỹ.', 1);

INSERT INTO cv_versions (id, candidate_id, file_path, file_name, file_size_bytes, mime_type, sha256_hash, raw_text, status, created_at, updated_at) VALUES
    ('88888888-7777-4777-8777-777777777701', '77777777-7777-4777-8777-777777777771', '/data/cv/cv_pham_duy_khanh_2026.pdf', 'CV_PhamDuyKhanh_SeniorFrontend.pdf', 256400, 'application/pdf', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Pham Duy Khanh. Senior Frontend Engineer. Skills: React, TypeScript, Vite, SPA.', 'extracted', now(), now()),
    ('88888888-7777-4777-8777-777777777702', '77777777-7777-4777-8777-777777777772', '/data/cv/cv_pham_nhat_thong_2026.pdf', 'CV_PhamNhatThong_BackendJava.pdf', 312500, 'application/pdf', 'a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866', 'Pham Nhat Thong. Backend Java Engineer. Skills: Spring Boot, PostgreSQL, Docker.', 'extracted', now(), now()),
    ('88888888-7777-4777-8777-777777777703', '77777777-7777-4777-8777-777777777773', '/data/cv/cv_nguyen_dai_hung_2026.pdf', 'CV_NguyenDaiHung_QA.pdf', 189200, 'application/pdf', 'b3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b877', 'Nguyen Dai Hung. QA Automation. Skills: Playwright, Postman, CI/CD testing.', 'extracted', now(), now());

-- ============================================================================
-- 7. JOBS (Đầy đủ vòng đời: active, paused, closed, draft, pending)
-- ============================================================================
INSERT INTO jobs (
    id, company_id, category_id, created_by, title, slug, department, level, work_type,
    location, address, map_link, salary_mode, salary_min, salary_max, salary_currency,
    experience, description, requirements, benefits, schedule,
    summary_industry, summary_required, summary_preferred,
    applicant_count, view_count, status, posted_at, deadline, created_at, updated_at
) VALUES
    -- Job 1: ACTIVE (Senior Product Designer) - Range salary
    ('88888888-8888-4888-8888-888888888881', '44444444-4444-4444-8444-444444444441', '55555555-5555-4555-8555-555555555552', '22222222-2222-4222-8222-222222222221',
     'Senior Product Designer', 'senior-product-designer-fpt-01', 'Product & Design', 'senior', 'full_time',
     'TP. Hồ Chí Minh', 'Tòa nhà FPT Tân Thuận, Đường số 8, KCX Tân Thuận, Quận 7, TP.HCM', 'https://maps.google.com/?q=FPT+Tan+Thuan',
     'range', 35000000, 50000000, 'VND',
     '4+ năm',
     '<ul><li>Dẫn dắt định hướng thiết kế UI/UX cho các sản phẩm chiến lược của FPT Software.</li><li>Xây dựng và hoàn thiện Design System đa nền tảng cho hệ sinh thái doanh nghiệp.</li></ul>',
     '<ul><li>Tối thiểu 4 năm kinh nghiệm thiết kế UI/UX ứng dụng Web/Mobile.</li><li>Thành thạo công cụ Figma, Prototyping và UX Research bài bản.</li></ul>',
     '<ul><li>Thu nhập cạnh tranh 35 - 50 Triệu VNĐ kèm thưởng hiệu suất dự án.</li><li>Gói bảo hiểm FPT Care toàn diện cho bản thân và gia đình.</li></ul>',
     '<ul><li>Thứ Hai – Thứ Sáu (08:30 – 17:30). Nghỉ Thứ Bảy & Chủ Nhật.</li></ul>',
     'Công nghệ thông tin, Thiết kế sản phẩm số', 'Figma, UX Research, Design System', 'Tiếng Anh lưu loát, Tư duy hệ thống SaaS',
     48, 1284, 'active', now() - INTERVAL '15 days', '2026-11-30', now() - INTERVAL '15 days', now()),

    -- Job 2: ACTIVE (Frontend Engineer React / TypeScript) - Range salary
    ('88888888-8888-4888-8888-888888888882', '44444444-4444-4444-8444-444444444441', '55555555-5555-4555-8555-555555555551', '22222222-2222-4222-8222-222222222221',
     'Frontend Engineer (React / TypeScript)', 'frontend-engineer-react-typescript-fpt-02', 'Engineering', 'middle', 'hybrid',
     'Hà Nội', 'Tòa nhà FPT Cầu Giấy, Duy Tân, Hà Nội', 'https://maps.google.com/?q=FPT+Cau+Giay',
     'range', 25000000, 40000000, 'VND',
     '2-4 năm',
     '<ul><li>Phát triển Single Page Application hiện đại với React 19, TypeScript và Vite.</li><li>Phối hợp cùng Backend Team để tích hợp RESTful API theo chuẩn hợp đồng.</li></ul>',
     '<ul><li>2+ năm kinh nghiệm làm việc với React.js, TypeScript và CSS hiện đại.</li><li>Hiểu biết tốt về State Management và tối ưu Web Performance.</li></ul>',
     '<ul><li>Lương 25 - 40 Triệu VNĐ. Chế độ làm việc Hybrid (2 ngày WFH/tuần).</li><li>Được tài trợ 100% chi phí thi các chứng chỉ quốc tế uy tín.</li></ul>',
     '<ul><li>Thứ Hai – Thứ Sáu (08:30 – 17:30). Linh hoạt giờ giấc.</li></ul>',
     'Công nghệ thông tin & Lập trình Web', 'React, TypeScript, Responsive Web', 'Kinh nghiệm với Vite, REST API, Chart.js',
     36, 972, 'active', now() - INTERVAL '10 days', '2026-11-25', now() - INTERVAL '10 days', now()),

    -- Job 3: ACTIVE (Backend Engineer Java / Spring Boot) - Single salary
    ('88888888-8888-4888-8888-888888888883', '44444444-4444-4444-8444-444444444441', '55555555-5555-4555-8555-555555555551', '22222222-2222-4222-8222-222222222222',
     'Backend Engineer (Java / Spring Boot)', 'backend-engineer-java-spring-boot-fpt-03', 'Engineering', 'junior', 'full_time',
     'TP. Hồ Chí Minh', 'Tòa nhà FPT Tân Thuận, Quận 7, TP.HCM', 'https://maps.google.com/?q=FPT+Tan+Thuan',
     'single', 22000000, NULL, 'VND',
     '1-2 năm',
     '<ul><li>Xây dựng microservices backend hiệu năng cao trên nền Spring Boot 3 & PostgreSQL.</li><li>Viết unit/integration tests với JUnit 5 & Mockito.</li></ul>',
     '<ul><li>1+ năm làm việc với Java, Spring Boot, Spring Security và JPA/Hibernate.</li><li>Nắm chắc kiến thức RDBMS (PostgreSQL) và RESTful API.</li></ul>',
     '<ul><li>Lương cứng từ 22 Triệu VNĐ + Lương tháng 13 & thưởng hiệu quả.</li><li>Môi trường phát triển công nghệ cao, được mentor bởi các Tech Lead lâu năm.</li></ul>',
     '<ul><li>Thứ Hai – Thứ Sáu.</li></ul>',
     'Backend Development & Microservices', 'Java 21, Spring Boot 3, PostgreSQL', 'pgvector, Docker, Redis Cache',
     22, 650, 'active', now() - INTERVAL '7 days', '2026-11-20', now() - INTERVAL '7 days', now()),

    -- Job 4: PAUSED (Junior QA / Automation Tester) - Negotiable salary
    ('88888888-8888-4888-8888-888888888884', '44444444-4444-4444-8444-444444444441', '55555555-5555-4555-8555-555555555551', '22222222-2222-4222-8222-222222222222',
     'Junior QA / Automation Tester', 'junior-qa-automation-tester-fpt-04', 'Quality Assurance', 'junior', 'full_time',
     'Đà Nẵng', 'FPT Complex, Ngũ Hành Sơn, Đà Nẵng', 'https://maps.google.com/?q=FPT+Complex+Da+Nang',
     'negotiable', NULL, NULL, 'VND',
     '1-2 năm',
     '<ul><li>Xây dựng và vận hành test script tự động hóa với Playwright & Postman.</li><li>Tham gia kiểm thử chất lượng các đợt release định kỳ.</li></ul>',
     '<ul><li>1+ năm kinh nghiệm kiểm thử tự động web/API.</li><li>Tư duy logic tốt, cẩn thận và có trách nhiệm cao với sản phẩm.</li></ul>',
     '<ul><li>Lương thỏa thuận theo năng lực. Xe đưa đón nội bộ tại Đà Nẵng.</li></ul>',
     '<ul><li>Thứ Hai – Thứ Sáu.</li></ul>',
     'Software Testing & Automation', 'Automation Testing, Playwright, API Testing', 'CI/CD GitHub Actions',
     19, 512, 'paused', now() - INTERVAL '25 days', '2026-10-31', now() - INTERVAL '25 days', now()),

    -- Job 5: CLOSED (DevSecOps Engineer) - Đã đóng tuyển
    ('88888888-8888-4888-8888-888888888885', '44444444-4444-4444-8444-444444444441', '55555555-5555-4555-8555-555555555551', '22222222-2222-4222-8222-222222222221',
     'DevSecOps Engineer (CI/CD & Cloud)', 'devsecops-engineer-fpt-05', 'Infrastructure', 'senior', 'remote',
     'Toàn quốc', 'Làm việc hoàn toàn từ xa (Remote)', NULL,
     'range', 40000000, 60000000, 'VND',
     '4+ năm',
     '<ul><li>Thiết lập pipeline CI/CD an toàn, quản trị cụm Kubernetes và hạ tầng đám mây.</li></ul>',
     '<ul><li>Có kinh nghiệm thực chiến với Docker, Kubernetes, Terraform và Cloud Security.</li></ul>',
     '<ul><li>Lương 40 - 60 Triệu VNĐ. 100% Remote linh hoạt.</li></ul>',
     '<ul><li>Toàn thời gian từ xa.</li></ul>',
     'Cloud & DevOps Engineering', 'Docker, Kubernetes, CI/CD, Terraform', 'AWS/GCP Security Specialist',
     15, 840, 'closed', now() - INTERVAL '40 days', '2026-09-30', now() - INTERVAL '40 days', now()),

    -- Job 6: DRAFT (AI Research Lead) - Bản nháp đang soạn
    ('88888888-8888-4888-8888-888888888886', '44444444-4444-4444-8444-444444444441', '55555555-5555-4555-8555-555555555551', '22222222-2222-4222-8222-222222222221',
     'AI / Data Research Lead (Agentic AI)', 'ai-data-research-lead-fpt-06', 'AI Research Lab', 'lead', 'hybrid',
     'TP. Hồ Chí Minh', 'Tòa nhà FPT Tân Thuận, Quận 7, TP.HCM', NULL,
     'negotiable', NULL, NULL, 'VND',
     '5+ năm',
     '<ul><li>Nghiên cứu ứng dụng các mô hình LLMs, RAG và Agentic AI vào tự động hóa tuyển dụng thông minh.</li></ul>',
     '<ul><li>Chuyên sâu về Python, Vector Database, LangChain/LlamaIndex và mô hình nhúng.</li></ul>',
     '<ul><li>Đãi ngộ hàng đầu thị trường, tài trợ dự án nghiên cứu và cổ phiếu thưởng.</li></ul>',
     '<ul><li>Linh hoạt.</li></ul>',
     'Artificial Intelligence & Deep Learning', 'Python, LLMs, Vector Embeddings, RAG', 'Kinh nghiệm triển khai Production AI',
     0, 1, 'draft', NULL, '2026-12-31', now() - INTERVAL '1 day', now()),

    -- Job 7: PENDING (Mobile Developer Flutter - VNG) - Chờ duyệt
    ('88888888-8888-4888-8888-888888888887', '44444444-4444-4444-8444-444444444442', '55555555-5555-4555-8555-555555555551', '22222222-2222-4222-8222-222222222223',
     'Mobile Developer (Flutter / Dart)', 'mobile-developer-flutter-dart-vng-07', 'Game Studio', 'middle', 'full_time',
     'TP. Hồ Chí Minh', 'Z06 Đường số 13, KCX Tân Thuận, Quận 7, TP.HCM', NULL,
     'range', 28000000, 42000000, 'VND',
     '2-3 năm',
     '<ul><li>Phát triển các ứng dụng di động đa nền tảng iOS & Android với Flutter.</li></ul>',
     '<ul><li>Thành thạo Flutter, Dart, BLoC Pattern và tối ưu UI Animation.</li></ul>',
     '<ul><li>Lương 28 - 42 Triệu VNĐ. Môi trường công nghệ Campus chuẩn quốc tế.</li></ul>',
     '<ul><li>Thứ Hai – Thứ Sáu.</li></ul>',
     'Mobile App Development', 'Flutter, Dart, Mobile Architecture', 'Native iOS/Android bridge',
     8, 310, 'pending', now() - INTERVAL '2 days', '2026-11-30', now() - INTERVAL '2 days', now());

-- ============================================================================
-- 8. JOB SKILLS (Bắt buộc & Ưu tiên) & JOB TAGS
-- ============================================================================
INSERT INTO job_skills (job_id, skill_id, is_required) VALUES
    ('88888888-8888-4888-8888-888888888881', '66666666-5555-4555-8555-555555555511', true),  -- Figma
    ('88888888-8888-4888-8888-888888888881', '66666666-5555-4555-8555-555555555512', true),  -- UI/UX Research
    ('88888888-8888-4888-8888-888888888881', '66666666-5555-4555-8555-555555555513', false), -- Design System
    ('88888888-8888-4888-8888-888888888882', '66666666-5555-4555-8555-555555555503', true),  -- React
    ('88888888-8888-4888-8888-888888888882', '66666666-5555-4555-8555-555555555504', true),  -- TypeScript
    ('88888888-8888-4888-8888-888888888882', '66666666-5555-4555-8555-555555555506', false), -- Docker
    ('88888888-8888-4888-8888-888888888883', '66666666-5555-4555-8555-555555555501', true),  -- Java
    ('88888888-8888-4888-8888-888888888883', '66666666-5555-4555-8555-555555555502', true),  -- Spring Boot
    ('88888888-8888-4888-8888-888888888883', '66666666-5555-4555-8555-555555555505', true),  -- PostgreSQL
    ('88888888-8888-4888-8888-888888888884', '66666666-5555-4555-8555-555555555508', true),  -- Playwright
    ('88888888-8888-4888-8888-888888888885', '66666666-5555-4555-8555-555555555506', true),  -- Docker
    ('88888888-8888-4888-8888-888888888885', '66666666-5555-4555-8555-555555555509', true),  -- Kubernetes
    ('88888888-8888-4888-8888-888888888886', '66666666-5555-4555-8555-555555555507', true),  -- Python
    ('88888888-8888-4888-8888-888888888887', '66666666-5555-4555-8555-555555555510', true);  -- Flutter

INSERT INTO job_tags (job_id, tag_type, tag) VALUES
    ('88888888-8888-4888-8888-888888888881', 'requirement', 'Figma'),
    ('88888888-8888-4888-8888-888888888881', 'requirement', 'Design System'),
    ('88888888-8888-4888-8888-888888888881', 'specialization', 'UI/UX'),
    ('88888888-8888-4888-8888-888888888882', 'requirement', 'React'),
    ('88888888-8888-4888-8888-888888888882', 'requirement', 'TypeScript'),
    ('88888888-8888-4888-8888-888888888882', 'specialization', 'Frontend SPA'),
    ('88888888-8888-4888-8888-888888888883', 'requirement', 'Java'),
    ('88888888-8888-4888-8888-888888888883', 'requirement', 'Spring Boot'),
    ('88888888-8888-4888-8888-888888888883', 'specialization', 'Backend API');

-- ============================================================================
-- 9. APPLICATIONS (Đầy đủ giai đoạn tuyển dụng theo V5)
-- ============================================================================
-- Stages: 'new', 'screening', 'testing', 'interview', 'offer', 'hired', 'rejected'
INSERT INTO applications (
    id, candidate_id, job_id, cover_letter, cv_snapshot_url, stage, reject_reason, match_score, applied_at, updated_at
) VALUES
    -- App 1: Candidate 1 -> Job 2 (React Frontend) -> Stage: interview
    ('99999999-9999-4999-8999-999999999991', '77777777-7777-4777-8777-777777777771', '88888888-8888-4888-8888-888888888882',
     'Tôi rất ấn tượng với định hướng phát triển sản phẩm công nghệ của FPT Software và tin rằng kinh nghiệm chuyên sâu với React & TypeScript của tôi sẽ đóng góp giá trị cao cho dự án.',
     '/data/cv/cv_pham_duy_khanh_2026.pdf', 'interview', NULL, 94, now() - INTERVAL '8 days', now()),

    -- App 2: Candidate 2 -> Job 3 (Backend Java) -> Stage: offer
    ('99999999-9999-4999-8999-999999999992', '77777777-7777-4777-8777-777777777772', '88888888-8888-4888-8888-888888888883',
     'Hồ sơ ứng tuyển vị trí Backend Engineer. Đã có 3 năm kinh nghiệm với Spring Boot và PostgreSQL.',
     '/data/cv/cv_pham_nhat_thong_2026.pdf', 'offer', NULL, 91, now() - INTERVAL '6 days', now()),

    -- App 3: Candidate 4 -> Job 1 (Product Designer) -> Stage: new
    ('99999999-9999-4999-8999-999999999993', '77777777-7777-4777-8777-777777777774', '88888888-8888-4888-8888-888888888881',
     'Xin gửi quý công ty portfolio thiết kế UI/UX mới nhất và bản tóm tắt quá trình làm việc tại các dự án SaaS.',
     '/data/cv/cv_vo_quynh_mai_2026.pdf', 'new', NULL, 86, now() - INTERVAL '2 days', now()),

    -- App 4: Candidate 3 -> Job 4 (QA Tester) -> Stage: screening
    ('99999999-9999-4999-8999-999999999994', '77777777-7777-4777-8777-777777777773', '88888888-8888-4888-8888-888888888884',
     'Ứng tuyển vị trí Junior QA. Tôi có kinh nghiệm viết Playwright automation test cho web application.',
     '/data/cv/cv_nguyen_dai_hung_2026.pdf', 'screening', NULL, 82, now() - INTERVAL '5 days', now()),

    -- App 5: Candidate 3 -> Job 1 (Product Designer) -> Stage: rejected
    ('99999999-9999-4999-8999-999999999995', '77777777-7777-4777-8777-777777777773', '88888888-8888-4888-8888-888888888881',
     'Ứng tuyển Product Designer.',
     '/data/cv/cv_nguyen_dai_hung_2026.pdf', 'rejected', 'Hồ sơ kinh nghiệm chuyên sâu về QA/Testing, chưa đáp ứng tiêu chuẩn Portfolio UI/UX cấp bậc Senior.', 45, now() - INTERVAL '12 days', now()),

    -- App 6: Candidate 2 -> Job 5 (DevSecOps) -> Stage: hired
    ('99999999-9999-4999-8999-999999999996', '77777777-7777-4777-8777-777777777772', '88888888-8888-4888-8888-888888888885',
     'Ứng tuyển vị trí DevSecOps Engineer.',
     '/data/cv/cv_pham_nhat_thong_2026.pdf', 'hired', NULL, 89, now() - INTERVAL '30 days', now());

-- ============================================================================
-- 10. APPLICATION STATUS HISTORIES (Audit Trail)
-- ============================================================================
INSERT INTO application_status_histories (id, application_id, from_stage, to_stage, changed_by, reason, metadata, created_at) VALUES
    -- App 1: new -> screening -> testing -> interview
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999991', NULL, 'new', '33333333-3333-4333-8333-333333333331', 'Nộp hồ sơ trực tuyến', '{}'::jsonb, now() - INTERVAL '8 days'),
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999991', 'new', 'screening', '22222222-2222-4222-8222-222222222221', 'CV phù hợp yêu cầu vị trí Frontend', '{}'::jsonb, now() - INTERVAL '6 days'),
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999991', 'screening', 'testing', '22222222-2222-4222-8222-222222222221', 'Gửi bài test React / TypeScript trực tuyến', '{}'::jsonb, now() - INTERVAL '4 days'),
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999991', 'testing', 'interview', '22222222-2222-4222-8222-222222222221', 'Đạt 95/100 điểm bài kiểm tra kỹ thuật. Lên lịch phỏng vấn.', '{}'::jsonb, now() - INTERVAL '2 days'),

    -- App 2: new -> screening -> interview -> offer
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999992', NULL, 'new', '33333333-3333-4333-8333-333333333332', 'Nộp hồ sơ trực tuyến', '{}'::jsonb, now() - INTERVAL '6 days'),
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999992', 'new', 'screening', '22222222-2222-4222-8222-222222222222', 'CV Backend đạt chuẩn', '{}'::jsonb, now() - INTERVAL '5 days'),
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999992', 'screening', 'interview', '22222222-2222-4222-8222-222222222222', 'Phỏng vấn kỹ thuật trực tiếp thành công tốt đẹp', '{}'::jsonb, now() - INTERVAL '3 days'),
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999992', 'interview', 'offer', '22222222-2222-4222-8222-222222222222', 'Phát hành thư mời nhận việc (Offer Letter)', '{}'::jsonb, now() - INTERVAL '1 day'),

    -- App 5: new -> screening -> rejected
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999995', NULL, 'new', '33333333-3333-4333-8333-333333333333', 'Nộp hồ sơ trực tuyến', '{}'::jsonb, now() - INTERVAL '12 days'),
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999995', 'new', 'rejected', '22222222-2222-4222-8222-222222222221', 'Kinh nghiệm chưa phù hợp với cấp bậc Senior UI/UX', '{}'::jsonb, now() - INTERVAL '11 days');

-- ============================================================================
-- 11. APPLICATION CV SNAPSHOTS & MATCH RESULTS (AI Screening)
-- ============================================================================
INSERT INTO application_cv_snapshots (id, application_id, cv_version_id, created_at) VALUES
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999991', '88888888-7777-4777-8777-777777777701', now() - INTERVAL '8 days'),
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999992', '88888888-7777-4777-8777-777777777702', now() - INTERVAL '6 days'),
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999994', '88888888-7777-4777-8777-777777777703', now() - INTERVAL '5 days');

INSERT INTO match_results (
    id, application_id, job_id, cv_version_id, overall_score, skills_score, experience_score, breakdown, rationale, created_at
) VALUES
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999991', '88888888-8888-4888-8888-888888888882', '88888888-7777-4777-8777-777777777701',
     94, 96, 90,
     '{"skills": 96, "experience": 90, "education": 95, "culture_fit": 92}'::jsonb,
     'Ứng viên đáp ứng xuất sắc các kỹ năng cốt lõi React, TypeScript và Vite. Có 4 năm kinh nghiệm thực tế tại nền tảng TMĐT.', now() - INTERVAL '8 days'),

    (gen_random_uuid(), '99999999-9999-4999-8999-999999999992', '88888888-8888-4888-8888-888888888883', '88888888-7777-4777-8777-777777777702',
     91, 93, 88,
     '{"skills": 93, "experience": 88, "education": 92, "culture_fit": 90}'::jsonb,
     'Kỹ năng Java và Spring Boot vững vàng. Kiến thức về PostgreSQL và Microservices khớp với nhu cầu dự án.', now() - INTERVAL '6 days');

-- ============================================================================
-- 12. INTERVIEWS (Lịch phỏng vấn mẫu)
-- ============================================================================
INSERT INTO interviews (
    id, application_id, interview_type, interview_mode, scheduled_at, duration_min, meeting_link, location, participants, status, note, created_at, updated_at
) VALUES
    -- Sắp diễn ra (online)
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999991', 'Phỏng vấn chuyên môn Frontend', 'online',
     now() + INTERVAL '1 day' + INTERVAL '3 hours', 60, 'https://meet.google.com/xyz-matchajob-fe', NULL,
     'Nguyễn Hoàng Long (HR), Tech Lead Frontend', 'scheduled', 'Ứng viên chuẩn bị demo portfolio hoặc code sample nếu có.', now(), now()),

    -- Đã hoàn thành (onsite)
    (gen_random_uuid(), '99999999-9999-4999-8999-999999999992', 'Phỏng vấn kiến trúc Microservices', 'onsite',
     now() - INTERVAL '3 days', 75, NULL, 'Phòng họp Lotus - Tầng 4, Tòa nhà FPT Tân Thuận, Quận 7, TP.HCM',
     'Trần Thị Mai (HR), Solution Architect', 'completed', 'Ứng viên trả lời xuất sắc câu hỏi về concurrency và transaction.', now() - INTERVAL '4 days', now() - INTERVAL '3 days');

-- ============================================================================
-- 13. SAVED JOBS (Ứng viên lưu việc)
-- ============================================================================
INSERT INTO saved_jobs (user_id, job_id, saved_at) VALUES
    ('33333333-3333-4333-8333-333333333331', '88888888-8888-4888-8888-888888888881', now() - INTERVAL '3 days'),
    ('33333333-3333-4333-8333-333333333331', '88888888-8888-4888-8888-888888888883', now() - INTERVAL '1 day'),
    ('33333333-3333-4333-8333-333333333332', '88888888-8888-4888-8888-888888888885', now() - INTERVAL '10 days');

-- ============================================================================
-- 14. MODERATION REVIEWS & REPORTS (Admin test)
-- ============================================================================
INSERT INTO moderation_reviews (
    id, review_type, job_id, company_id, risk_level, status, details, reviewer_id, review_note, submitted_at, reviewed_at
) VALUES
    (gen_random_uuid(), 'job', '88888888-8888-4888-8888-888888888887', '44444444-4444-4444-8444-444444444442',
     'low', 'pending', 'Tin đăng vị trí Mobile Developer từ VNG Corporation cần kiểm duyệt trước khi công khai.', NULL, NULL, now() - INTERVAL '2 days', NULL),

    (gen_random_uuid(), 'company', NULL, '44444444-4444-4444-8444-444444444441',
     'low', 'approved', 'Xác minh hồ sơ pháp nhân và giấy phép kinh doanh FPT Digital Talent.', '11111111-1111-4111-8111-111111111111', 'Đã đối soát MST 0101248141 hợp lệ.', now() - INTERVAL '30 days', now() - INTERVAL '29 days');

INSERT INTO reports (
    id, reporter_id, target_type, target_job_id, target_company_id, target_user_id, subject, description, severity, status, resolver_id, resolution, action_taken, resolved_at, created_at, updated_at
) VALUES
    (gen_random_uuid(), '33333333-3333-4333-8333-333333333331', 'job', '88888888-8888-4888-8888-888888888884', '44444444-4444-4444-8444-444444444441', NULL,
     'Hỏi về thời gian phản hồi tin tạm dừng', 'Tin tuyển dụng hiển thị tạm dừng nhưng em muốn biết khi nào mở lại.', 'low', 'resolved', '11111111-1111-4111-8111-111111111111',
     'Đã phản hồi ứng viên: Tin tuyển dụng tạm dừng do đã đủ số lượng vòng 1.', 'none', now() - INTERVAL '5 days', now() - INTERVAL '7 days', now() - INTERVAL '5 days');

-- ============================================================================
-- 15. AUDIT LOGS (Nhật ký mẫu)
-- ============================================================================
INSERT INTO audit_logs (actor_id, actor_type, action, target_type, target_id, ip_address, user_agent, created_at) VALUES
    ('11111111-1111-4111-8111-111111111111', 'user', 'SYSTEM_INIT_SEED', 'database', 'matchajob_db', '127.0.0.1'::inet, 'MatchaJob Seed Script v1.0', now()),
    ('22222222-2222-4222-8222-222222222221', 'user', 'CREATE_JOB', 'job', '88888888-8888-4888-8888-888888888881', '127.0.0.1'::inet, 'Mozilla/5.0 Chrome/120', now() - INTERVAL '15 days'),
    ('22222222-2222-4222-8222-222222222221', 'user', 'PAUSE_JOB', 'job', '88888888-8888-4888-8888-888888888884', '127.0.0.1'::inet, 'Mozilla/5.0 Chrome/120', now() - INTERVAL '25 days');

COMMIT;
