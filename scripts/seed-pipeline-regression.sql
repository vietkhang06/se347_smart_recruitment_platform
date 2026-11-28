-- ============================================================================
-- MatchaJob Smart Recruitment Platform
-- Regression Seed Data: scripts/seed-pipeline-regression.sql
-- Description: Deterministic, reproducible seed data specifically designed for
--              CV -> Application -> ProcessingJob -> AI -> MatchResult -> Ranking
--              pipeline regression and failure recovery scenarios.
--
-- Features:
--   1. Processing jobs in all 4 key lifecycle states:
--      - PENDING (QUEUED)
--      - PROCESSING (with active lease token & expiry timestamp)
--      - COMPLETED (with successful match output)
--      - FAILED (with attempt_count = 3, max_attempts = 3, and realistic last_error)
--   2. Multiple application stages (new, screening, interview, offer, hired, rejected).
--   3. Deterministic candidate ranking scenario for Job 101:
--      - Rank 1: High match score (92)
--      - Rank 2: Medium match score (78), applied earlier (Tie-breaker winner)
--      - Rank 3: Medium match score (78), applied later (Tie-breaker runner-up)
--      - Rank 4: Pending AI evaluation (Score NULL) -> NULLS LAST
--      - Failed AI: ProcessingJob FAILED
--      - Rejected candidate: Stage 'rejected' with formal reject_reason
--   4. Edge-case Jobs for boundary tests:
--      - Job 101: Active Senior Java Engineer (accepting applications)
--      - Job 102: Closed React Frontend Engineer (status = 'closed')
--      - Job 103: Expired Deadline Job (status = 'active', deadline < now())
--
-- Idempotency: Uses ON CONFLICT DO UPDATE / DO NOTHING so it can be re-run safely.
-- All UUIDs strictly use valid hex digits [0-9a-f].
-- ============================================================================

BEGIN;

-- 1. Deterministic Categories & Skills
INSERT INTO categories (id, name, slug, description, created_at, updated_at)
VALUES 
    ('c0000000-0000-4000-8000-000000000001', 'Công nghệ thông tin', 'cong-nghe-thong-tin', 'Lập trình, QA, DevOps, AI', now(), now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO skills (id, name, slug, category_id, is_verified, created_at, updated_at)
VALUES
    ('da000000-0000-4000-8000-000000000001', 'Java', 'java', 'c0000000-0000-4000-8000-000000000001', true, now(), now()),
    ('da000000-0000-4000-8000-000000000002', 'Spring Boot', 'spring-boot', 'c0000000-0000-4000-8000-000000000001', true, now(), now()),
    ('da000000-0000-4000-8000-000000000003', 'PostgreSQL', 'postgresql', 'c0000000-0000-4000-8000-000000000001', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Deterministic Users & Company (Employer & Admin & Candidates)
-- Password for all seed users is 'Password123!' (BCrypt: $2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy)
INSERT INTO users (id, email, phone, password_hash, full_name, avatar_url, role, status, is_verified, created_at, updated_at)
VALUES
    ('10000000-0000-4000-8000-000000000001', 'reg.admin@matchajob.com', '0909000099', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Regression Admin', null, 'admin', 'active', true, now(), now()),
    ('20000000-0000-4000-8000-000000000001', 'reg.employer@techcorp.com', '0901234599', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'TechCorp Recruiter', null, 'employer', 'active', true, now(), now()),
    ('30000000-0000-4000-8000-000000000001', 'cand1.top@example.com', '0933000001', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Nguyen Van A (Top)', null, 'candidate', 'active', true, now(), now()),
    ('30000000-0000-4000-8000-000000000002', 'cand2.med1@example.com', '0933000002', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Tran Thi B (Med Early)', null, 'candidate', 'active', true, now(), now()),
    ('30000000-0000-4000-8000-000000000003', 'cand3.med2@example.com', '0933000003', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Le Van C (Med Late)', null, 'candidate', 'active', true, now(), now()),
    ('30000000-0000-4000-8000-000000000004', 'cand4.pending@example.com', '0933000004', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Pham Van D (Pending)', null, 'candidate', 'active', true, now(), now()),
    ('30000000-0000-4000-8000-000000000005', 'cand5.failed@example.com', '0933000005', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Hoang Van E (Failed AI)', null, 'candidate', 'active', true, now(), now()),
    ('30000000-0000-4000-8000-000000000006', 'cand6.rejected@example.com', '0933000006', '$2a$10$NxK13O2vghp3yRwpW8wCfOcVgn6pomYs.v.QIZaGKL44flwXQnVyy', 'Vu Thi F (Rejected)', null, 'candidate', 'active', true, now(), now())
ON CONFLICT (id) DO UPDATE SET updated_at = now();

-- Company
INSERT INTO companies (id, owner_id, name, tax_code, email, phone, website, industry, description, address, created_at, updated_at)
VALUES
    ('c0000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001', 'TechCorp Solutions Vietnam', '0319999999', 'contact@techcorp.com', '0283999999', 'https://techcorp.example.com', 'IT Software', 'Leading software enterprise', 'District 1, HCMC', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Candidate Profiles
INSERT INTO candidate_profiles (id, user_id, title, experience_years, bio, city, created_at, updated_at)
VALUES
    ('ca000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Senior Java Developer', 5, '5+ years backend Java', 'Ho Chi Minh', now(), now()),
    ('ca000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Java Backend Engineer', 3, '3 years Spring Boot', 'Ho Chi Minh', now(), now()),
    ('ca000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Backend Engineer', 3, '3 years Spring Boot & SQL', 'Ho Chi Minh', now(), now()),
    ('ca000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'Junior Java Developer', 1, '1 year Java experience', 'Ho Chi Minh', now(), now()),
    ('ca000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Software Engineer', 2, '2 years experience', 'Ho Chi Minh', now(), now()),
    ('ca000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 'Web Developer', 2, 'PHP/NodeJS wanting Java transition', 'Ho Chi Minh', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Deterministic Jobs
INSERT INTO jobs (id, company_id, category_id, created_by, title, slug, level, work_type, location, salary_mode, salary_min, salary_max, description, requirements, status, deadline, created_at, updated_at)
VALUES
    -- Active Job (Ranking Test Target)
    ('ba000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
     'Senior Java Backend Engineer', 'senior-java-backend-engineer-pipeline-reg', 'senior', 'full_time', 'Ho Chi Minh', 'range', 25000000, 45000000,
     'Building high-throughput microservices using Spring Boot and PostgreSQL.', 'Requires 4+ years of Java, Spring Boot, PostgreSQL, Docker, CI/CD.',
     'active', now() + INTERVAL '30 days', now() - INTERVAL '10 days', now()),

    -- Closed Job (Boundary Test: Cannot apply)
    ('ba000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
     'Closed Frontend React Developer', 'closed-frontend-react-pipeline-reg', 'mid', 'full_time', 'Ho Chi Minh', 'negotiable', null, null,
     'Frontend role closed.', 'React, TypeScript.',
     'closed', now() + INTERVAL '30 days', now() - INTERVAL '20 days', now()),

    -- Expired Deadline Job (Boundary Test: Cannot apply)
    ('ba000000-0000-4000-8000-000000000103', 'c0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
     'Expired Deadline DevOps Engineer', 'expired-devops-pipeline-reg', 'senior', 'full_time', 'Ho Chi Minh', 'range', 30000000, 50000000,
     'DevOps role with expired deadline.', 'Kubernetes, AWS.',
     'active', now() - INTERVAL '2 days', now() - INTERVAL '30 days', now())
ON CONFLICT (id) DO NOTHING;

-- 4. CV Versions
INSERT INTO cv_versions (id, candidate_id, file_path, file_name, file_size_bytes, mime_type, sha256Hash, active, raw_text, parsed_data, status, created_at, updated_at)
VALUES
    ('cb000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001', 'target/uploads/cv/cand1.pdf', 'cand1_java_senior.pdf', 204800, 'application/pdf', 'a1b2c3d4e5f60001', true,
     'Nguyen Van A. Senior Java Developer with 5 years experience in Spring Boot, PostgreSQL, Microservices, Docker.', '{"skills":["Java","Spring Boot","PostgreSQL","Docker"]}', 'processed', now() - INTERVAL '5 days', now()),
    ('cb000000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000002', 'target/uploads/cv/cand2.pdf', 'cand2_java_mid.pdf', 184800, 'application/pdf', 'a1b2c3d4e5f60002', true,
     'Tran Thi B. Java Developer with 3 years Spring Boot and relational databases.', '{"skills":["Java","Spring Boot","MySQL"]}', 'processed', now() - INTERVAL '5 days', now()),
    ('cb000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000003', 'target/uploads/cv/cand3.pdf', 'cand3_backend.pdf', 194800, 'application/pdf', 'a1b2c3d4e5f60003', true,
     'Le Van C. Backend Engineer with 3 years Java and cloud platforms.', '{"skills":["Java","Spring Boot","PostgreSQL"]}', 'processed', now() - INTERVAL '5 days', now()),
    ('cb000000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000004', 'target/uploads/cv/cand4.pdf', 'cand4_junior.pdf', 154800, 'application/pdf', 'a1b2c3d4e5f60004', true,
     'Pham Van D. Junior Java developer.', '{"skills":["Java"]}', 'processed', now() - INTERVAL '2 days', now()),
    ('cb000000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000005', 'target/uploads/cv/cand5.pdf', 'cand5_error.pdf', 164800, 'application/pdf', 'a1b2c3d4e5f60005', true,
     'Hoang Van E. Resume data.', '{"skills":["Java"]}', 'uploaded', now() - INTERVAL '1 day', now()),
    ('cb000000-0000-4000-8000-000000000006', 'ca000000-0000-4000-8000-000000000006', 'target/uploads/cv/cand6.pdf', 'cand6_php.pdf', 174800, 'application/pdf', 'a1b2c3d4e5f60006', true,
     'Vu Thi F. Web Developer with PHP and Vue.js.', '{"skills":["PHP","VueJS"]}', 'processed', now() - INTERVAL '4 days', now())
ON CONFLICT (id) DO NOTHING;

-- 5. Applications across various stages for Job 101
INSERT INTO applications (id, candidate_id, job_id, cover_letter, cv_snapshot_url, stage, match_score, applied_at, updated_at)
VALUES
    -- Candidate 1: High Match (Rank 1 expected), Stage = INTERVIEW
    ('aa000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000101',
     'Very excited about this Senior Java opportunity!', 'target/uploads/cv/cand1.pdf', 'interview', 92, now() - INTERVAL '4 days', now()),

    -- Candidate 2: Medium Match 78, applied 3 days ago (Tie-break winner -> Rank 2 expected), Stage = SCREENING
    ('aa000000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000002', 'ba000000-0000-4000-8000-000000000101',
     'Applying for Java Engineer role.', 'target/uploads/cv/cand2.pdf', 'screening', 78, now() - INTERVAL '3 days', now()),

    -- Candidate 3: Medium Match 78, applied 2 days ago (Tie-break runner-up -> Rank 3 expected), Stage = SCREENING
    ('aa000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000003', 'ba000000-0000-4000-8000-000000000101',
     'Strong backend foundations.', 'target/uploads/cv/cand3.pdf', 'screening', 78, now() - INTERVAL '2 days', now()),

    -- Candidate 4: Unscored / In Progress (Rank 4 expected, NULLS LAST), Stage = NEW
    ('aa000000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000004', 'ba000000-0000-4000-8000-000000000101',
     'Recently applied, awaiting AI evaluation.', 'target/uploads/cv/cand4.pdf', 'new', null, now() - INTERVAL '1 day', now()),

    -- Candidate 5: AI Matching Failed, Stage = NEW
    ('aa000000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000005', 'ba000000-0000-4000-8000-000000000101',
     'AI analysis encountered error.', 'target/uploads/cv/cand5.pdf', 'new', null, now() - INTERVAL '12 hours', now()),

    -- Candidate 6: Rejected Candidate, Stage = REJECTED
    ('aa000000-0000-4000-8000-000000000006', 'ca000000-0000-4000-8000-000000000006', 'ba000000-0000-4000-8000-000000000101',
     'Looking for backend position.', 'target/uploads/cv/cand6.pdf', 'rejected', 60, now() - INTERVAL '5 days', now())
ON CONFLICT (id) DO NOTHING;

-- Update reject reason for Candidate 6
UPDATE applications SET reject_reason = 'Candidate lacks required 4+ years Java and Spring Boot experience.' WHERE id = 'aa000000-0000-4000-8000-000000000006';

-- Application CV Snapshots
INSERT INTO application_cv_snapshots (application_id, cv_version_id, created_at)
VALUES
    ('aa000000-0000-4000-8000-000000000001', 'cb000000-0000-4000-8000-000000000001', now() - INTERVAL '4 days'),
    ('aa000000-0000-4000-8000-000000000002', 'cb000000-0000-4000-8000-000000000002', now() - INTERVAL '3 days'),
    ('aa000000-0000-4000-8000-000000000003', 'cb000000-0000-4000-8000-000000000003', now() - INTERVAL '2 days'),
    ('aa000000-0000-4000-8000-000000000004', 'cb000000-0000-4000-8000-000000000004', now() - INTERVAL '1 day'),
    ('aa000000-0000-4000-8000-000000000005', 'cb000000-0000-4000-8000-000000000005', now() - INTERVAL '12 hours'),
    ('aa000000-0000-4000-8000-000000000006', 'cb000000-0000-4000-8000-000000000006', now() - INTERVAL '5 days')
ON CONFLICT (application_id) DO NOTHING;

-- Application Status Histories
INSERT INTO application_status_histories (id, application_id, from_stage, to_stage, changed_by, reason, created_at)
VALUES
    (gen_random_uuid(), 'aa000000-0000-4000-8000-000000000001', null, 'new', '30000000-0000-4000-8000-000000000001', 'Application submitted', now() - INTERVAL '4 days'),
    (gen_random_uuid(), 'aa000000-0000-4000-8000-000000000001', 'new', 'screening', '20000000-0000-4000-8000-000000000001', 'Profile matches required criteria', now() - INTERVAL '3 days'),
    (gen_random_uuid(), 'aa000000-0000-4000-8000-000000000001', 'screening', 'interview', '20000000-0000-4000-8000-000000000001', 'Scheduled technical interview round 1', now() - INTERVAL '2 days'),
    (gen_random_uuid(), 'aa000000-0000-4000-8000-000000000006', null, 'new', '30000000-0000-4000-8000-000000000006', 'Application submitted', now() - INTERVAL '5 days'),
    (gen_random_uuid(), 'aa000000-0000-4000-8000-000000000006', 'new', 'rejected', '20000000-0000-4000-8000-000000000001', 'Candidate lacks required 4+ years Java and Spring Boot experience.', now() - INTERVAL '4 days');

-- 6. Match Results (Completed Evaluations)
INSERT INTO match_results (id, application_id, job_id, cv_version_id, overall_score, skills_score, experience_score, breakdown, rationale, created_at)
VALUES
    -- App 1: Score 92
    ('ea000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000101', 'cb000000-0000-4000-8000-000000000001',
     92, 95, 90,
     '{"skills": {"matched": ["Java", "Spring Boot", "PostgreSQL", "Docker"], "missing": []}, "experience_years": 5, "scoring_mode": "hybrid"}',
     'Candidate possesses deep expertise in Spring Boot, PostgreSQL and meets all requirements.', now() - INTERVAL '4 days'),

    -- App 2: Score 78 (Applied earlier)
    ('ea000000-0000-4000-8000-000000000002', 'aa000000-0000-4000-8000-000000000002', 'ba000000-0000-4000-8000-000000000101', 'cb000000-0000-4000-8000-000000000002',
     78, 80, 75,
     '{"skills": {"matched": ["Java", "Spring Boot"], "missing": ["Docker", "PostgreSQL"]}, "experience_years": 3, "scoring_mode": "hybrid"}',
     'Good Java and Spring foundation, slightly lower experience level.', now() - INTERVAL '3 days'),

    -- App 3: Score 78 (Applied later)
    ('ea000000-0000-4000-8000-000000000003', 'aa000000-0000-4000-8000-000000000003', 'ba000000-0000-4000-8000-000000000101', 'cb000000-0000-4000-8000-000000000003',
     78, 75, 80,
     '{"skills": {"matched": ["Java", "PostgreSQL"], "missing": ["Docker"]}, "experience_years": 3, "scoring_mode": "hybrid"}',
     'Strong SQL and Java skills, lacks Docker containerization.', now() - INTERVAL '2 days'),

    -- App 6: Score 60 (Rejected)
    ('ea000000-0000-4000-8000-000000000006', 'aa000000-0000-4000-8000-000000000006', 'ba000000-0000-4000-8000-000000000101', 'cb000000-0000-4000-8000-000000000006',
     60, 50, 60,
     '{"skills": {"matched": [], "missing": ["Java", "Spring Boot", "PostgreSQL"]}, "experience_years": 2, "scoring_mode": "hybrid"}',
     'Background is predominantly PHP/Vue, lacks enterprise Java experience.', now() - INTERVAL '5 days')
ON CONFLICT (application_id) DO NOTHING;

-- 7. Processing Jobs - ALL 4 CORE STATES
INSERT INTO processing_jobs (id, job_type, entity_type, entity_id, status, attempt_count, max_attempts, lease_token, lease_expires_at, retry_after, last_error, idempotency_key, started_at, completed_at, created_at, updated_at)
VALUES
    -- STATE 1: PENDING (QUEUED) - Waiting in queue for worker to claim
    ('fa000000-0000-4000-8000-000000000001', 'APPLICATION_MATCHING', 'application', 'aa000000-0000-4000-8000-000000000004',
     'PENDING', 0, 3, null, null, now(), null, 'app_match_seed_pending_0004', null, null, now() - INTERVAL '10 minutes', now() - INTERVAL '10 minutes'),

    -- STATE 2: PROCESSING - Currently being processed with active lease
    ('fa000000-0000-4000-8000-000000000002', 'CV_TEXT_EXTRACTION', 'cv_version', 'cb000000-0000-4000-8000-000000000005',
     'PROCESSING', 1, 3, 'seed-active-lease-token-0002', now() + INTERVAL '2 minutes', now(), null, 'cv_extract_seed_proc_0005', now() - INTERVAL '30 seconds', null, now() - INTERVAL '2 minutes', now() - INTERVAL '30 seconds'),

    -- STATE 3: COMPLETED - Successfully finished with results persisted
    ('fa000000-0000-4000-8000-000000000003', 'APPLICATION_MATCHING', 'application', 'aa000000-0000-4000-8000-000000000001',
     'COMPLETED', 1, 3, null, null, now() - INTERVAL '4 days', null, 'app_match_seed_comp_0001', now() - INTERVAL '4 days', now() - INTERVAL '4 days', now() - INTERVAL '4 days', now() - INTERVAL '4 days'),

    -- STATE 4: FAILED - Exhausted maximum retries (3/3) with last_error recorded
    ('fa000000-0000-4000-8000-000000000004', 'APPLICATION_MATCHING', 'application', 'aa000000-0000-4000-8000-000000000005',
     'FAILED', 3, 3, null, null, now() - INTERVAL '10 minutes',
     'AI Worker returned HTTP 504 Gateway Timeout: AI inference model read timed out after 30000ms. Maximum retry attempts exhausted.',
     'app_match_seed_failed_0005', now() - INTERVAL '20 minutes', now() - INTERVAL '10 minutes', now() - INTERVAL '30 minutes', now() - INTERVAL '10 minutes')
ON CONFLICT (idempotency_key) DO NOTHING;

COMMIT;
