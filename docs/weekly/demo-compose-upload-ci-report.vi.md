# Kiểm thử Demo Compose + Upload Security + CI (05/11/2026)

Môi trường kiểm thử cô lập: project `matchajob-demo-20261105`, cổng frontend `15173`, backend `18081`, DB/AI không publish. Chạy từ PowerShell trên Windows với Docker Desktop 29.7.2 / Compose 5.5.0. Không chạm các container MatchaJob khác. Hai user tổng hợp và CV của lần thử đã được xóa; `users LIKE 'demo-%@example.invalid' = 0`, số file trong `/data/cv` của project demo = 0. Volume demo còn nguyên.

| Yêu cầu | Cách kiểm tra | Kết quả thực tế | Minh chứng | Phần còn thiếu |
|---|---|---|---|---|
| Compose 4 service | `docker compose --env-file .env.demo.local -p matchajob-demo-20261105 up -d --build --wait` | PASS: database, AI, backend, frontend healthy | Compose trả exit 0; `docker compose ps` hiện 4 healthy | Không |
| Compose config | `docker compose --env-file .env.example config -q` | PASS | Exit 0, `config --services` trả đúng 4 tên | Không |
| Smoke health | `scripts/smoke-demo.ps1 -ProjectName matchajob-demo-20261105 -EnvFile .env.demo.local` | PASS: 4 health, frontend HTTP/API URL, backend/AI/DB readiness | 10 dòng PASS, exit 0 sau restart | Không |
| Smoke báo lỗi | Smoke với project không tồn tại và timeout 1 giây | PASS: 4 dòng FAIL, exit 1 | `matchajob-demo-missing` | Không |
| Upload hợp lệ và tên trùng | Hai lần POST PDF thật cùng tên gốc, GET download | PASS: HTTP 202, ID khác nhau, SHA-256 download đúng | Bài kiểm thử HTTP trên DB/volume cô lập | Không |
| DOCX | POST DOCX thật và DOCX ZIP có XML hỏng | PASS: 202 và 400 tương ứng; không còn file tạm | Fixture DOCX + POST HTTP vào image backend cuối | Không |
| Upload vi phạm | Sai đuôi, PDF giả, rỗng, đuôi kép, >10 MB | PASS: 4 trường hợp HTTP 400, file lớn HTTP 413 | POST thật; file lớn qua `curl.exe` | Không |
| Tên traversal, quyền, file tạm | Upload `../same.pdf`; GET không token và token user khác; `find /data/cv -name '.upload-*'` | PASS: path không thoát volume, HTTP 401/403, không có file tạm | Bài kiểm thử HTTP và container storage | Không |
| Persistence | Recreate backend rồi GET CV, so SHA-256 và đọc metadata DB; restart backend/AI | PASS: dữ liệu và checksum không đổi | Bài kiểm thử HTTP trên volume còn nguyên | Không |
| Mất DB và phục hồi | `compose stop database`, gọi backend readiness, `start database`, polling | PASS: 503 khi DB dừng, UP sau phục hồi, không cần restart backend | Bài kiểm thử HTTP thật | Không |
| Frontend local | `npm ci`, `npm run lint`, `npm test`, `npm run build` | PASS: 89 test, build thành công; lint có warning nhưng exit 0 | Log lệnh local | Warning lint có sẵn chưa xử lý ngoài task |
| Backend local | `mvn -B -q test` | PASS: 355 test, 0 lỗi | 58 Surefire suites | Integration tests cần PostgreSQL riêng chưa chạy |
| AI local | `python -m pytest -q tests` | PASS: 76 test | Pytest summary | Chạy local bằng Python 3.13; CI cấu hình 3.11 |
| CI từ xa | Workflow `.github/workflows/demo-checks.yml` | NOT RUN | Chưa push/PR theo yêu cầu | Chưa có kết quả GitHub Actions |

Lưu ý: Test HTTP trên 4 container đã chạy; CI hiện kiểm tra frontend/backend/AI và cú pháp Compose, chưa chạy container smoke trong runner. Chưa kiểm chứng provider AI trả phí; demo dùng deterministic provider.

## Kiểm tra lại 06/11/2026

Các kết quả 05/11 ở bảng trên là bằng chứng của lần kiểm thử trước. Lần này phát hiện và sửa test frontend phụ thuộc URL mặc định, fixture PDF giả bị validator mới từ chối, lỗi đánh dấu matching job thất bại hai lần và integration test lấy nhầm job của test khác. Workflow backend đã chuyển sang `mvn verify` với PostgreSQL/pgvector tạm và Flyway migration.

| Yêu cầu | Cách kiểm tra | Kết quả thực tế | Minh chứng | Phần còn thiếu |
|---|---|---|---|---|
| Frontend lint/test/build | Chạy local và trong frontend image Node 22 với URL demo | PASS: lint, 89 test, production build | Các lệnh exit 0 sau sửa `auth.test.js` | Lint còn warning sẵn có |
| Backend unit + integration | `mvn -B -q verify` trên PostgreSQL/pgvector mới, Flyway v1–v6 | PASS: 356 unit + 164 integration, 0 fail/error/skip | `backend/target/{surefire,failsafe}-reports`, Failsafe summary 164/0/0/0, Maven exit 0 | Chưa chạy workflow từ xa |
| AI test | `pytest -q tests` local: Python 3.13; Python 3.11 image với toàn repository mount như CI checkout | PASS: 76 test ở cả hai môi trường | Pytest exit 0 | `pytest` ngay trong production image không có `docs/contracts/fixtures` nên 11 test contract không chạy được ở vị trí đó; CI checkout có fixtures |
| Compose config và CI YAML | `docker compose --env-file .env.example config -q`, parse YAML workflow, `git diff --check` | PASS: exit 0, 4 job hợp lệ về cú pháp YAML | Lệnh local | Chưa có kết quả GitHub Actions |
| Dựng lại backend và smoke | `compose up -d --build --no-deps --force-recreate --wait backend`, sau đó `smoke-demo.ps1` | PASS: 4 container healthy, 10 dòng PASS, exit 0 | `docker compose ps`, smoke output | Các kịch bản upload/persistence/mất DB không lặp lại trong ngày 06; đã PASS ngày 05 |

Các lần `mvn verify` đầu ngày 06 có FAIL thật và đã được sửa; chỉ lần cuối trên database sạch được ghi PASS. Container PostgreSQL test cô lập không mount volume và đã được xóa sau kiểm thử. Không commit/push, vì vậy trạng thái CI từ xa vẫn **NOT RUN**. Image AI production chỉ chứa mã service; bộ test contract cần chạy ở checkout đầy đủ như workflow.

## Trước khi mở PR (sau rebase lên `origin/main` ngày 06/11/2026)

Remote `main` có thêm tính năng recruiter và test mới. Giữ cấu hình frontend dev của nhánh chính trong Compose, đồng thời sửa 3 biểu đồ gọi React Hook có điều kiện và sửa assertion điểm AI chưa có từ `0` thành `null` theo contract hiện hành.

| Yêu cầu | Cách kiểm tra | Kết quả thực tế | Minh chứng | Phần còn thiếu |
|---|---|---|---|---|
| Frontend lint/test/build trên mã sau rebase | `npm run lint`, `npm test`, `npm run build` | PASS: 115 test, lint và build exit 0 | Vitest 14/14 file, 115/115 test; Vite 462 module | Lint/build còn warning không chặn |
| AI test sau rebase | `python -m pytest -q tests` | PASS: 76 test | Pytest exit 0 | Provider trả phí chưa kiểm chứng |
| Compose config và runtime sau giải quyết xung đột | `docker compose --env-file .env.example config -q`; `compose up -d --build --wait`; `smoke-demo.ps1` | PASS: 4 service healthy, smoke 10 dòng PASS | Compose và smoke exit 0 trên project demo cô lập | Không |
| Backend `mvn verify` sau rebase | PostgreSQL/pgvector cô lập, Flyway migration | PASS: 357 unit + 165 integration, 0 fail/error/skip | Maven exit 0, Failsafe summary 165/0/0/0 | Không |
| GitHub Actions | Workflow trên remote | NOT RUN tại thời điểm commit | Chưa push | Chờ push và workflow hoàn tất |
