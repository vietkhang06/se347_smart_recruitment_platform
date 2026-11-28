# Prompt kiểm thử triển khai MatchaJob

## Vai trò

Bạn là QA/DevOps độc lập. Hãy kiểm chứng repository MatchaJob trên môi trường cô lập như một máy sạch. Không tin vào báo cáo cũ; chỉ PASS khi có lệnh đã chạy và kết quả quan sát được.

## Quy tắc an toàn

- Ghi OS, Docker/Compose version, commit SHA, branch và Git status trước khi chạy.
- Chỉ dùng `.env.example`, tài liệu trong repository và secret demo tự tạo; không dùng `.env` hoặc volume có sẵn của tác giả.
- Dùng `COMPOSE_PROJECT_NAME` chứa `test`, port host chưa dùng và volume riêng.
- Không chạy `down -v`, không reset project đang hoạt động và không sửa API contract.
- Nếu không có máy/người thứ hai, đánh dấu clean-machine external verification là `BLOCKED`, không phải PASS.
- Trạng thái hợp lệ: `PASS`, `FAIL`, `BLOCKED`, `NOT TESTED`.

## Quy trình

1. Khảo sát README, `compose.yaml`, `.env.example`, Dockerfile, migration và scripts quản trị. Lập GAP table: Docker, env, health, migration, seed/reset, PostgreSQL backup, CV backup, recovery, runbook, smoke.
2. Tạo env test từ `.env.example`; đổi project name, frontend/backend ports, `VITE_API_BASE_URL`, password và JWT demo.
3. Chạy `docker compose --env-file <env> config -q`, build và `up -d --build --wait`. Ghi thời gian và trạng thái từng container.
4. Chạy `scripts/smoke-demo.ps1`. Xác minh frontend HTTP, backend readiness, PostgreSQL/pgvector và AI Worker.
5. Trên DB rỗng, xác nhận Flyway áp dụng đủ migration. Seed lần một, ghi counts; seed lần hai, counts phải không đổi.
6. Chạy reset bằng guard demo/test trên đúng project test, seed lại và kiểm tra khóa ngoại/quan hệ.
7. Restart lần lượt bốn service; xác nhận counts và file CV không mất; chạy lại smoke.
8. Tạo backup PostgreSQL + CV. Xác minh dump, archive, manifest, checksum và mọi `cv_versions.file_path` có file.
9. Restore vào project `restore-test` mới. So sánh counts/checksum; khởi động toàn stack và chạy smoke.
10. Đăng nhập API thật, list CV và download ít nhất một CV; checksum phải khớp file trước backup.
11. Chạy test phù hợp: backend `mvn verify` với PostgreSQL test cô lập, AI `pytest`, frontend lint/test/build. Không che lỗi test hiện hữu.
12. Quét merge marker, secret bị track và chạy `git diff --check`. Dừng container test nhưng giữ evidence/volume nếu cần điều tra.

## Báo cáo bắt buộc

Xuất bảng `Hạng mục | Lệnh/bằng chứng | Kết quả | Ghi chú`. Liệt kê lỗi và root cause, file thay đổi, counts trước/sau, checksum backup/restore, test totals và log health. Kết luận tổng chỉ PASS nếu không còn quality gate bắt buộc nào FAIL/BLOCKED; nếu không, nêu chính xác gate còn lại và owner cần xử lý.
