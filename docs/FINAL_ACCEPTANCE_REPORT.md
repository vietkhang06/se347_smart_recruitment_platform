# Tiểu pro — Final Acceptance Report

Ngày kiểm chứng: 16/11/2026. Branch: `ja-gnahk/Cong-Nghe-Web`.

## GAP analysis

| Hạng mục | Hiện trạng ban đầu | Bằng chứng | Thiếu sót | Hành động / kết quả |
|---|---|---|---|---|
| Docker/Compose | Có 4 service và volume riêng | `compose.yaml` | Backend build từng fail; migration sạch fail | Sửa source/migration; build và `up --wait` PASS |
| Environment | Có `.env.example` | Compose config PASS | Secret demo phải được thay ngoài local | Runbook cảnh báo, không commit `.env` |
| Health check | Có healthcheck từng service | 4/4 healthy, smoke PASS | Không | Tái sử dụng |
| Migration | Flyway V1–V7 | DB rỗng và DB có V7 đều PASS | V7 tạo lại index của V4 | Dùng `IF NOT EXISTS` |
| Seed/Reset | Có seed/reset ban đầu | Hai lượt seed, reset và seed lại | Seed từng truncate; script gắn container cứng | Seed idempotent; reset có guard và Compose labels |
| PostgreSQL backup | Chưa có flow hoàn chỉnh | custom dump + SHA-256 | Thiếu | Thêm backup script |
| CV backup | Chưa có flow hoàn chỉnh | 5 file, 3 reference, checksum archive | Thiếu kiểm tra tham chiếu | Backup từ volume và đối chiếu DB |
| Recovery | Chưa có restore cô lập | Restore project riêng PASS | Thiếu | Thêm restore guard/checksum/count |
| README/Runbook | README có quick start | Lệnh thực thi thực tế | Thiếu quy trình đầy đủ | Thêm runbook |
| Smoke test | Có script | Chạy trước/sau restart và restore PASS | PowerShell lỗi parsing ở một máy | Thêm `UseBasicParsing` |

## Thay đổi và phần tái sử dụng

Tạo `scripts/backup-demo.ps1`, `scripts/restore-demo.ps1`, fixture CV tổng hợp, runbook và báo cáo này. Chỉnh migration V7, seed/reset/smoke scripts, `.gitignore` và liên kết README. Tái sử dụng Compose, health endpoints, Flyway migrations, API thật, named volumes và test suites hiện có; không đổi API contract.

## Lỗi phát hiện và khắc phục

1. Backend Docker build lỗi tại `mvn package`: source có merge marker chưa xử lý; các file Java/test liên quan đã được sửa trong worktree.
2. Database rỗng fail Flyway V7 vì `idx_job_skills_skill_id` đã được V4 tạo: đổi sang `CREATE INDEX IF NOT EXISTS`.
3. Seed có nguy cơ xóa dữ liệu: bỏ `TRUNCATE`, chỉ seed DB trống và skip ổn định khi chạy lại.
4. Reset dùng container name cố định và có thể nguy hiểm: giới hạn demo/test, xác nhận rõ project, resolve volume bằng Compose labels.
5. Backup checksum trên Windows dính CRLF và liệt kê file chưa portable: chuẩn hóa chuỗi và dùng đường dẫn tương đối POSIX trong container.
6. Smoke PowerShell có thể lỗi parser legacy: dùng `UseBasicParsing`.

## Bằng chứng thực thi

| Quality gate | Kết quả | Bằng chứng |
|---|---|---|
| Compose config | PASS | `docker compose --env-file .env.example config -q` exit 0 |
| Build/start | PASS | frontend, backend, database, ai-worker healthy |
| Migration DB rỗng | PASS | Flyway áp dụng V1–V7 |
| Migration DB hiện có | PASS | schema v7 up-to-date, dữ liệu còn nguyên |
| Seed lần 1 / lần 2 | PASS | `11 users, 7 jobs, 6 applications, 3 cv_versions`; lần 2 SKIP, counts không đổi |
| Reset / seed lại | PASS | chỉ volume DB project audit bị tạo lại; CV volume giữ nguyên; seed lại PASS |
| Quan hệ | PASS | 0 foreign key chưa validate; 0 CV snapshot orphan |
| Restart/persistence | PASS | 11 users sau restart; smoke PASS |
| PostgreSQL backup | PASS | pg_dump custom, SHA-256 `77ad7a4e…a9ad3` |
| CV backup | PASS | 5 file, 3 DB reference hợp lệ; SHA-256 archive `93110f7f…65aa9` |
| Restore cô lập | PASS | counts và file count khớp manifest |
| API sau restore | PASS | login, list CV và download CV thật; checksum fixture khớp |
| AI Worker tests | PASS | 82 passed |
| Frontend tests/build | PASS | 19 files, 131 tests; production build PASS; lint exit 0 với warning có sẵn |
| Backend verify | FAIL | 392 unit tests PASS; integration: 199/204 PASS, 5 pipeline AI recovery tests FAIL vì trạng thái còn `PROCESSING` |
| Clean-machine bởi thành viên khác | BLOCKED | Chưa có máy/người thứ hai; checklist đã chuẩn bị |

Các lệnh chính đã chạy: Compose `config`, `build`, `up --wait`, `restart`; `smoke-demo.ps1`; seed hai lần; reset và seed lại; backup; restore vào `matchajob-restore-test`; API login/CV download; `pytest`; `npm ci`, lint, test, build; Maven verify với PostgreSQL test cô lập.

## Đánh giá task trên Google Sheet

- Các nhiệm vụ Tiểu pro tuần trước ở các dòng được đối chiếu đã đánh dấu hoàn thành; phần tuần cuối “Deployment Runbook + Seed/Reset + Backup/Recovery” chưa được tự động sửa trạng thái trên Sheet.
- Deployment, Docker, integration, migration, seed, reset, backup, restore, persistence, smoke test và documentation: PASS theo bằng chứng trên.
- Clean-machine verification: BLOCKED cho đến khi thành viên khác chạy checklist và xác nhận.
- Toàn bộ task tuần cuối chưa thể kết luận PASS tuyệt đối khi backend integration còn FAIL và clean-machine còn BLOCKED. Lỗi integration thuộc pipeline AI hiện hữu, không nằm trong các file deployment/backup được thay đổi, nhưng vẫn phải được owner module xử lý trước nghiệm thu chung.

## Áp dụng prompt kiểm thử độc lập

Prompt tại `docs/CLEAN_MACHINE_VERIFICATION_PROMPT.md` được áp dụng lại ngày 16/11/2026 trên Windows NT 10.0.26300, Docker 29.7.2, Compose v5.5.0, commit `7cac212`, project cô lập `matchajob-audit-test`.

| Hạng mục | Bằng chứng lần chạy lại | Kết quả |
|---|---|---|
| Compose build/start | 4 service healthy | PASS |
| Smoke | frontend HTTP/API URL, backend DB/pgvector, AI readiness | PASS |
| Seed idempotency | hai lượt đều SKIP DB đã seed; counts giữ `11/7/6/3` | PASS |
| Restart/persistence | restart 4 service, smoke lại PASS | PASS |
| Backup mới | `backups/20261116-180125`; 5 CV file, 3 reference | PASS |
| PostgreSQL checksum | `607da047cf124a0943140fac2035fe39e666488ce15d317ad018244dabb6c1fa` | PASS |
| CV archive checksum | `778d54fbbea7f6e65244cf91da6b47d2e6b968e8c578199473c0b1ae452c47a7` | PASS |
| Backend integration | dùng kết quả quality gate ngay trước đó: 5/204 FAIL | FAIL |
| Thành viên/máy thứ hai | chưa có | BLOCKED |
