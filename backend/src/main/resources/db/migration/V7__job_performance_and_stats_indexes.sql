-- Migration for job query performance and stats
-- Adding indexes on frequently filtered and sorted columns

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category_id ON jobs(category_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_deleted_at ON jobs(deleted_at);
CREATE INDEX idx_jobs_deadline ON jobs(deadline);
CREATE INDEX idx_jobs_status_deleted_at ON jobs(status, deleted_at);

-- Indexes for JobSkill to optimize skill filtering
CREATE INDEX idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX idx_job_skills_skill_id ON job_skills(skill_id);
