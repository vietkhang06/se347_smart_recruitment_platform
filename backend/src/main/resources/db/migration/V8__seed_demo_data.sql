-- ============================================================================
-- V8: Seed demo data for Categories, Skills, and Jobs
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
-- ============================================================================

-- 1. Categories (diverse industries)
INSERT INTO categories (id, name, icon, status, sort_order) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'IT / Software',       'bi-code-slash',      'visible', 1),
    ('a0000000-0000-0000-0000-000000000002', 'Marketing',            'bi-megaphone',       'visible', 2),
    ('a0000000-0000-0000-0000-000000000003', 'Sales',                'bi-graph-up-arrow',  'visible', 3),
    ('a0000000-0000-0000-0000-000000000004', 'Design',               'bi-palette',         'visible', 4),
    ('a0000000-0000-0000-0000-000000000005', 'Human Resources',      'bi-people',          'visible', 5),
    ('a0000000-0000-0000-0000-000000000006', 'Finance / Accounting', 'bi-calculator',      'visible', 6),
    ('a0000000-0000-0000-0000-000000000007', 'Customer Service',     'bi-headset',         'visible', 7),
    ('a0000000-0000-0000-0000-000000000008', 'Data / Analytics',     'bi-bar-chart-line',  'visible', 8)
ON CONFLICT (name) DO NOTHING;

-- 2. Skills (linked to categories where relevant)
INSERT INTO skills (id, name, category_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Java',           'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', 'Spring Boot',    'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000003', 'React',          'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000004', 'PostgreSQL',     'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000005', 'Docker',         'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000006', 'Kubernetes',     'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000007', 'Python',         'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000008', 'TypeScript',     'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000009', 'Node.js',        'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000010', 'AWS',            'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000011', 'SEO',            'a0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000012', 'Google Ads',     'a0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000013', 'Content Writing','a0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000014', 'Figma',          'a0000000-0000-0000-0000-000000000004'),
    ('b0000000-0000-0000-0000-000000000015', 'Adobe XD',       'a0000000-0000-0000-0000-000000000004'),
    ('b0000000-0000-0000-0000-000000000016', 'CRM',            'a0000000-0000-0000-0000-000000000003'),
    ('b0000000-0000-0000-0000-000000000017', 'Excel',          'a0000000-0000-0000-0000-000000000006'),
    ('b0000000-0000-0000-0000-000000000018', 'SQL',            'a0000000-0000-0000-0000-000000000008'),
    ('b0000000-0000-0000-0000-000000000019', 'Power BI',       'a0000000-0000-0000-0000-000000000008'),
    ('b0000000-0000-0000-0000-000000000020', 'Tableau',        'a0000000-0000-0000-0000-000000000008')
ON CONFLICT (name) DO NOTHING;

-- 3. Seed users required for jobs (employer + admin)
-- Using a deterministic UUID so re-runs are idempotent
INSERT INTO users (id, email, password_hash, full_name, role, status, is_verified) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'employer-seed@matchajob.vn',
     '$2a$10$dummyHashForSeedDataOnly000000000000000000000000000000',
     'Seed Employer', 'employer', 'active', true)
ON CONFLICT (email) DO NOTHING;

-- 4. Seed company
INSERT INTO companies (id, owner_id, name, industry, size, location, is_verified) VALUES
    ('d0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001',
     'MatchaJob Demo Corp', 'Technology', '50-150', 'Ho Chi Minh City', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Jobs: cover ALL 5 statuses (draft, pending, active, paused, closed)
--    with diverse levels, work types, salaries, and deadlines
INSERT INTO jobs (id, company_id, category_id, created_by, title, slug, level, work_type,
                  location, salary_mode, salary_min, salary_max, status, experience,
                  description, requirements, applicant_count, view_count, deadline, posted_at) VALUES

-- ACTIVE jobs (6 jobs, various levels & work types, some expired deadline)
('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
 'Senior Java Developer', 'senior-java-developer', 'senior', 'full_time',
 'Ho Chi Minh City', 'range', 30000000, 50000000, 'active', '3-5 years',
 'Build microservices with Spring Boot', 'Java 17+, Spring Boot, PostgreSQL',
 12, 340, CURRENT_DATE + INTERVAL '30 days', now() - INTERVAL '5 days'),

('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
 'React Frontend Developer', 'react-frontend-developer', 'middle', 'remote',
 'Ha Noi', 'range', 20000000, 35000000, 'active', '2-4 years',
 'Build responsive UIs in React', 'React, TypeScript, REST APIs',
 8, 210, CURRENT_DATE + INTERVAL '15 days', now() - INTERVAL '3 days'),

('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
 'Digital Marketing Specialist', 'digital-marketing-specialist', 'junior', 'hybrid',
 'Da Nang', 'range', 12000000, 20000000, 'active', '1-2 years',
 'Plan and execute digital campaigns', 'SEO, Google Ads, Facebook Ads',
 5, 150, CURRENT_DATE + INTERVAL '20 days', now() - INTERVAL '7 days'),

('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000001',
 'Data Analyst Intern', 'data-analyst-intern', 'intern', 'full_time',
 'Ho Chi Minh City', 'single', 8000000, NULL, 'active', 'No experience required',
 'Assist in data analysis and reporting', 'SQL, Excel, basic Python',
 20, 500, CURRENT_DATE + INTERVAL '45 days', now() - INTERVAL '2 days'),

-- ACTIVE but EXPIRED deadline (for testing countActiveExpiredJobs)
('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001',
 'UI/UX Designer', 'ui-ux-designer', 'middle', 'full_time',
 'Ho Chi Minh City', 'range', 18000000, 30000000, 'active', '2-3 years',
 'Design user interfaces for web and mobile', 'Figma, Adobe XD, User Research',
 3, 90, CURRENT_DATE - INTERVAL '5 days', now() - INTERVAL '40 days'),

('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
 'DevOps Engineer', 'devops-engineer', 'lead', 'remote',
 'Ha Noi', 'range', 40000000, 60000000, 'active', '5+ years',
 'Manage CI/CD pipelines and cloud infrastructure', 'Docker, Kubernetes, AWS, Terraform',
 2, 120, CURRENT_DATE - INTERVAL '1 day', now() - INTERVAL '30 days'),

-- DRAFT jobs (2)
('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
 'Sales Manager', 'sales-manager', 'senior', 'full_time',
 'Ho Chi Minh City', 'negotiable', NULL, NULL, 'draft', '5+ years',
 'Lead sales team', 'B2B sales, CRM, leadership',
 0, 0, NULL, NULL),

('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001',
 'Junior Accountant', 'junior-accountant', 'fresher', 'full_time',
 'Ho Chi Minh City', 'range', 10000000, 15000000, 'draft', '0-1 years',
 'Assist with bookkeeping and financial reports', 'Excel, accounting principles',
 0, 0, NULL, NULL),

-- PENDING jobs (2)
('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001',
 'HR Coordinator', 'hr-coordinator', 'junior', 'hybrid',
 'Da Nang', 'range', 12000000, 18000000, 'pending', '1-2 years',
 'Coordinate recruitment and onboarding processes', 'HR operations, communication',
 0, 0, CURRENT_DATE + INTERVAL '30 days', NULL),

('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000001',
 'Customer Support Agent', 'customer-support-agent', 'fresher', 'remote',
 'Ho Chi Minh City', 'single', 9000000, NULL, 'pending', 'No experience required',
 'Handle customer inquiries via chat and email', 'Communication, patience, basic English',
 0, 0, CURRENT_DATE + INTERVAL '25 days', NULL),

-- PAUSED jobs (2)
('e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
 'Full-Stack Developer', 'full-stack-developer', 'middle', 'full_time',
 'Ho Chi Minh City', 'range', 25000000, 40000000, 'paused', '2-4 years',
 'Develop both frontend and backend features', 'React, Node.js, PostgreSQL',
 7, 200, CURRENT_DATE + INTERVAL '10 days', now() - INTERVAL '20 days'),

('e0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
 'Content Marketing Manager', 'content-marketing-manager', 'senior', 'hybrid',
 'Ha Noi', 'range', 22000000, 35000000, 'paused', '3-5 years',
 'Lead content strategy and content team', 'Content strategy, SEO, team management',
 4, 110, CURRENT_DATE + INTERVAL '5 days', now() - INTERVAL '15 days'),

-- CLOSED jobs (2)
('e0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
 'QA Engineer', 'qa-engineer', 'junior', 'full_time',
 'Ho Chi Minh City', 'range', 15000000, 25000000, 'closed', '1-2 years',
 'Test and ensure quality of software products', 'Manual testing, Selenium, JUnit',
 15, 400, CURRENT_DATE - INTERVAL '10 days', now() - INTERVAL '45 days'),

('e0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001',
 'Graphic Designer', 'graphic-designer', 'fresher', 'contract',
 'Da Nang', 'range', 10000000, 16000000, 'closed', '0-1 years',
 'Create visual assets for marketing campaigns', 'Photoshop, Illustrator, Canva',
 9, 250, CURRENT_DATE - INTERVAL '20 days', now() - INTERVAL '50 days')

ON CONFLICT (slug) DO NOTHING;

-- 6. Job-Skill assignments
INSERT INTO job_skills (job_id, skill_id, is_required) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', true),  -- Java
    ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', true),  -- Spring Boot
    ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', true),  -- PostgreSQL
    ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', true),  -- React
    ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', true),  -- TypeScript
    ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000011', true),  -- SEO
    ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000012', false), -- Google Ads
    ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000018', true),  -- SQL
    ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000007', false), -- Python
    ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000014', true),  -- Figma
    ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000015', false), -- Adobe XD
    ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005', true),  -- Docker
    ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', true),  -- Kubernetes
    ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000010', true),  -- AWS
    ('e0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000003', true),  -- React
    ('e0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000009', true),  -- Node.js
    ('e0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000004', true)   -- PostgreSQL
ON CONFLICT (job_id, skill_id) DO NOTHING;
