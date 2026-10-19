# MatchaJob – Thiết kế Cơ sở dữ liệu

## Tổng quan

PostgreSQL 16+ | 23 bảng | 3 roles | UUID v7 PK | Soft-delete | Audit trail

---

## ERD – Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION & IDENTITY                              │
│                                                                                     │
│  ┌──────────────┐      ┌────────────────────┐      ┌──────────────────────┐         │
│  │    users      │─────▷│ admin_permissions   │      │ password_reset_tokens│         │
│  │──────────────│      │────────────────────│      │──────────────────────│         │
│  │ id (PK)      │      │ user_id (FK)       │      │ id (PK)             │         │
│  │ email (UQ)   │      │ permission         │      │ user_id (FK)        │         │
│  │ password_hash│      └────────────────────┘      │ token_hash          │         │
│  │ full_name    │                                   │ expires_at          │         │
│  │ role ────────┼──── 'candidate' | 'employer' | 'admin'                  │         │
│  │ status       │                                   └──────────────────────┘         │
│  │ is_verified  │                                                                   │
│  └──────┬───────┘                                                                   │
│         │                                                                           │
└─────────┼───────────────────────────────────────────────────────────────────────────┘
          │
          │ role = 'candidate'          role = 'employer'
          ▼                             ▼
┌──────────────────────┐      ┌──────────────────────┐
│ candidate_profiles   │      │     companies         │
│──────────────────────│      │──────────────────────│
│ id (PK)              │      │ id (PK)              │
│ user_id (FK, UQ)     │      │ owner_id (FK)        │
│ headline             │      │ name                 │
│ bio                  │      │ industry             │
│ experience           │      │ size                 │
│ education            │      │ tax_code (UQ)        │
│ cv_url               │      │ is_verified          │
│ ai_cv_score          │      │ about                │
└──────┬───────────────┘      └──────┬──┬────────────┘
       │                             │  │
       │  ┌──────────────────┐       │  │  ┌──────────────────┐
       ├─▷│ candidate_skills │       │  ├─▷│  company_perks   │
       │  │──────────────────│       │  │  │──────────────────│
       │  │ candidate_id(FK) │       │  │  │ company_id (FK)  │
       │  │ skill            │       │  │  │ perk             │
       │  └──────────────────┘       │  │  └──────────────────┘
       │                             │  │
       │  ┌────────────────────────┐ │  │  ┌──────────────────────┐
       └─▷│ candidate_work_history │ │  └─▷│ company_subscriptions│
          │────────────────────────│ │     │──────────────────────│
          │ candidate_id (FK)      │ │     │ company_id (FK)      │
          │ role_title             │ │     │ plan_id (FK) ────────┼──▷ billing_plans
          │ period                 │ │     │ status               │
          │ description            │ │     │ jobs_used            │
          └────────────────────────┘ │     └──────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────┐
│                         JOB LIFECYCLE                                           │
│                                    │                                            │
│  ┌──────────────┐    ┌─────────────┴──┐    ┌───────────────┐                    │
│  │  categories  │◁───┤     jobs       ├───▷│   job_tags    │                    │
│  │──────────────│    │───────────────│    │───────────────│                    │
│  │ id (PK)      │    │ id (PK)       │    │ job_id (FK)   │                    │
│  │ name (UQ)    │    │ company_id(FK)│    │ tag_type      │                    │
│  │ status       │    │ category_id   │    │ tag           │                    │
│  └──────────────┘    │ title         │    └───────────────┘                    │
│                      │ work_type     │                                          │
│                      │ salary_mode   │    ┌───────────────┐                     │
│                      │ salary_min    │    │  saved_jobs   │                     │
│                      │ salary_max    │◁───┤───────────────│                     │
│                      │ status        │    │ user_id (FK)  │                     │
│                      │ deadline      │    │ job_id  (FK)  │                     │
│                      └───────┬───────┘    └───────────────┘                     │
│                              │                                                  │
└──────────────────────────────┼──────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────────────┐
│                    RECRUITMENT PIPELINE                                          │
│                              │                                                  │
│  candidate_profiles ────────▷│◁──── jobs                                        │
│                       ┌──────┴───────┐                                          │
│                       │ applications │                                          │
│                       │──────────────│                                          │
│                       │ id (PK)      │                                          │
│                       │ candidate_id │     stage flow:                           │
│                       │ job_id       │     ┌─────┐   ┌──────────┐   ┌────────┐  │
│                       │ cover_letter │     │ new │──▷│screening │──▷│testing │  │
│                       │ stage ───────┼──▷                                │       │
│                       │ reject_reason│     ┌──────────┐  ┌───────┐      │       │
│                       │ match_score  │     │ rejected │◁─┤ offer │◁─────┘       │
│                       └──────┬───────┘     └──────────┘  └───────┘   via        │
│                              │                 ▲                   interview     │
│                       ┌──────┴───────┐         │                                │
│                       │  interviews  │─────────┘ (if rejected)                  │
│                       │──────────────│                                           │
│                       │ id (PK)      │                                           │
│                       │ application_id│                                          │
│                       │ scheduled_at │                                           │
│                       │ interview_type│                                          │
│                       │ meeting_link │                                           │
│                       │ status       │                                           │
│                       └──────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ADMIN & OPERATIONS                                      │
│                                                                                 │
│  ┌─────────────────────┐    ┌──────────────────┐    ┌────────────────────┐       │
│  │ moderation_reviews  │    │     reports       │    │   audit_logs       │       │
│  │─────────────────────│    │──────────────────│    │────────────────────│       │
│  │ id (PK)             │    │ id (PK)          │    │ id (PK, BIGINT)   │       │
│  │ review_type         │    │ reporter_id (FK) │    │ actor_id (FK)     │       │
│  │ job_id (FK)         │    │ target_type      │    │ actor_type        │       │
│  │ company_id (FK)     │    │ target_*_id (FK) │    │ action            │       │
│  │ risk_level          │    │ severity         │    │ target_type       │       │
│  │ status              │    │ status           │    │ target_id         │       │
│  │ reviewer_id (FK)    │    │ action_taken     │    │ ip_address        │       │
│  └─────────────────────┘    │ resolver_id (FK) │    │ metadata (JSONB)  │       │
│                              └──────────────────┘    └────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────┐    ┌──────────────────┐    ┌────────────────────┐       │
│  │  notifications      │    │ system_settings  │    │   billing_plans    │       │
│  │─────────────────────│    │──────────────────│    │────────────────────│       │
│  │ id (PK)             │    │ key (PK)         │    │ id (PK)           │       │
│  │ user_id (FK)        │    │ label            │    │ name              │       │
│  │ title               │    │ value (JSONB)    │    │ price             │       │
│  │ tone                │    │ updated_by (FK)  │    │ quota             │       │
│  │ is_read             │    └──────────────────┘    │ features (JSONB)  │       │
│  └─────────────────────┘                             └────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────┐                                                        │
│  │     guides          │                                                        │
│  │─────────────────────│                                                        │
│  │ id (PK)             │                                                        │
│  │ title               │                                                        │
│  │ category            │                                                        │
│  │ author_id (FK)      │                                                        │
│  └─────────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Danh sách bảng & mục đích

| # | Bảng | Mục đích | Rows ước tính |
|---|------|----------|---------------|
| 1 | `users` | Xác thực, phân quyền cho cả 3 role | 10K–100K |
| 2 | `admin_permissions` | Quyền chi tiết admin (RBAC) | ~50 |
| 3 | `password_reset_tokens` | OTP / forgot-password flow | Transient |
| 4 | `companies` | Hồ sơ doanh nghiệp | 1K–10K |
| 5 | `company_perks` | Phúc lợi công ty | 5K–50K |
| 5b | `company_members` | Thành viên quản lý công ty (nhiều HR/1 company) | 1K–10K |
| 6 | `candidate_profiles` | Hồ sơ ứng viên (tách khỏi users) | 10K–100K |
| 7 | `candidate_skills` | Kỹ năng ứng viên (searchable) | 50K–500K |
| 8 | `candidate_work_history` | Kinh nghiệm làm việc | 30K–300K |
| 9 | `categories` | Danh mục ngành nghề (admin quản lý) | ~50 |
| 10 | `jobs` | Tin tuyển dụng | 5K–50K |
| 11 | `job_tags` | Tags yêu cầu / chuyên môn | 25K–250K |
| 12 | `saved_jobs` | Ứng viên bookmark tin | 20K–200K |
| 13 | `applications` | Hồ sơ ứng tuyển | 20K–200K |
| 14 | `interviews` | Lịch phỏng vấn | 5K–50K |
| 15 | `moderation_reviews` | Duyệt tin / xác minh công ty | 5K–50K |
| 16 | `reports` | Báo cáo vi phạm | 500–5K |
| 17 | `system_settings` | Cấu hình hệ thống (key-value) | ~10 |
| 18 | `audit_logs` | Nhật ký hoạt động (append-only) | 100K–10M |
| 19 | `notifications` | Thông báo cho user | 50K–500K |
| 20 | `billing_plans` | Gói dịch vụ | ~5 |
| 21 | `company_subscriptions` | Đăng ký gói dịch vụ | 1K–10K |
| 22 | `guides` | Bài viết hướng dẫn nghề nghiệp | ~100 |

---

## Quyết định thiết kế chuyên sâu

### 1. Single `users` table vs Role-specific tables
**Chọn: Single table + profile tables tách riêng.**
- `users` chứa auth data chung (email, password, role, status)
- `candidate_profiles` và `companies` chứa domain-specific data
- Tránh nullable columns explosion, giữ SRP (Single Responsibility Principle)
- Admin permissions tách bảng riêng vì chỉ ~1% users là admin

### 2. UUID v7 vs Auto-increment ID
**Chọn: UUID (`gen_random_uuid()`).**
- Không lộ business volume (INT lộ "bạn là user thứ 47")
- Distributed-safe, không conflict khi merge data
- UUID v7 (time-ordered) giữ B-tree performance gần bằng BIGINT
- Ngoại lệ: `audit_logs` dùng BIGINT IDENTITY (append-only, cần sequential, volume cao)

### 3. Salary storage
**Chọn: BIGINT (VND) + CHECK constraint.**
- Lưu số nguyên VND, format ở application layer
- `salary_mode` phân biệt range/single/negotiable
- CHECK constraint đảm bảo `salary_max >= salary_min` khi mode = range
- Index trên `(salary_min, salary_max)` cho filter "lương từ X đến Y"

### 4. Soft Delete
**Chọn: `deleted_at TIMESTAMPTZ` trên bảng chính (users, companies, jobs, categories).**
- Partial index `WHERE deleted_at IS NULL` → queries không bị slow
- Audit compliance: không mất data
- Bảng phụ (skills, tags, perks) dùng CASCADE → xóa theo parent

### 5. Audit Logs
**Chọn: Append-only table + BRIN index.**
- BRIN index trên `created_at`: cực hiệu quả cho time-series data (100x nhỏ hơn B-tree)
- `metadata JSONB`: flexible extra context không cần schema change
- `actor_type`: phân biệt user/system/ai actions
- Không có UPDATE/DELETE trên bảng này

### 6. Application Stage Pipeline
**Chọn: VARCHAR CHECK constraint thay vì PostgreSQL ENUM.**
- ENUM type khó ALTER (cần migration phức tạp)
- CHECK constraint dễ thêm/bớt stage
- Stage flow được enforce ở application layer, không ở DB
  (vì business rules phức tạp: skip stage, reject từ bất kỳ stage nào)

### 7. Full-text Search
**Chọn: pg_trgm trigram index.**
- Tốt cho partial match, typo-tolerant search ("Reac" → "React")
- Không cần external search engine (Elasticsearch) ở giai đoạn này
- ponytail: upgrade lên Elasticsearch/Meilisearch khi >100K jobs

### 8. Denormalization
**Có chọn lọc:**
- `jobs.applicant_count`, `jobs.view_count`: counter cache, update bằng trigger hoặc app logic
- Không denormalize tên company/candidate vào jobs/applications (JOIN khi cần, data consistency quan trọng hơn)
- `applications` không lưu `company_id` (suy ra từ `jobs.company_id` qua JOIN)
- `interviews` chỉ giữ `application_id`, không denormalize `candidate_id`/`job_id` (tránh inconsistency)
- `match_score` nằm trên `applications` (per candidate × per job), không nằm trên `jobs`
- Mock data có denormalized fields (company name trong job) → chỉ dùng ở frontend display

### 9. Interview ↔ Application relationship
**Chọn: Interview chỉ references Application (không duplicate candidate_id + job_id).**
- Một candidate có thể apply nhiều job → cần biết interview thuộc application nào
- Query candidate/job qua `JOIN applications` — tránh data inconsistency
- `vw_employer_dashboard` dùng LATERAL subquery thay vì cross-product JOIN

### 10. System Settings
**Chọn: Key-value với JSONB value.**
- Linh hoạt: boolean, number, string đều lưu được
- Ít rows (~10), không cần index
- `updated_by`: track ai đã thay đổi setting

---

## Indexes Strategy

| Loại | Bảng | Mục đích |
|------|------|----------|
| **B-tree** | `jobs(status, posted_at)` | Browse active jobs, sorted by newest |
| **B-tree** | `jobs(salary_min, salary_max)` | Filter theo range lương |
| **B-tree** | `applications(job_id, stage)` | Employer xem pipeline |
| **B-tree** | `applications(candidate_id)` | Candidate xem applications |
| **GIN trigram** | `jobs(title)`, `jobs(location)` | Fuzzy search |
| **GIN trigram** | `companies(name)` | Search company |
| **BRIN** | `audit_logs(created_at)` | Time-range queries trên append-only data |
| **Partial** | `notifications(user_id) WHERE is_read = FALSE` | Chỉ index unread |
| **Partial** | `moderation_reviews(status) WHERE status IN ('pending',...)` | Chỉ index queue items |
| **Composite** | `jobs(status, category_id, location)` | Browse page filter combo |

---

## Mapping Mock Data → Schema

| Mock Entity | → DB Table(s) | Ghi chú |
|-------------|---------------|---------|
| `MOCK_USERS` | `users` + `admin_permissions` | Role-specific fields → profile tables |
| `MOCK_JOBS` | `jobs` + `job_tags` | `reqTags`/`specTags` → `job_tags.tag_type` |
| `MOCK_CANDIDATES` | `candidate_profiles` + `candidate_skills` + `candidate_work_history` | Tách normalized |
| `MOCK_COMPANIES` | `companies` + `company_perks` | `perks[]` → bảng riêng |
| `MOCK_APPLICATIONS` | `applications` | `step` tính ở app layer, không lưu DB |
| `MOCK_INTERVIEWS` | `interviews` | Thêm `application_id` FK |
| `MOCK_ADMIN_REVIEWS` | `moderation_reviews` | — |
| `MOCK_ADMIN_REPORTS` | `reports` | `age` tính từ `created_at`, không lưu |
| `MOCK_ADMIN_CATEGORIES` | `categories` | — |
| `MOCK_SYSTEM_SETTINGS` | `system_settings` | `checked` → `value JSONB` |
| `MOCK_AUDIT_LOGS` | `audit_logs` | — |
| `MOCK_ADMIN_NOTIFICATIONS` | `notifications` | — |
| Billing Plans | `billing_plans` + `company_subscriptions` | Tách plan ↔ subscription |
| Guides | `guides` | — |
| Favorites (localStorage) | `saved_jobs` | — |

---

## Files

```
database/design/
├── schema.sql          # DDL đầy đủ, chạy được ngay trên PostgreSQL 16+
└── DATABASE_DESIGN.md  # Tài liệu này
```
