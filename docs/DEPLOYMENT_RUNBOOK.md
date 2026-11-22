# MatchaJob Deployment Runbook

Runbook này dành cho môi trường demo/test dùng Docker Compose. Không dùng script reset hoặc restore với production.

## 1. Điều kiện và clone

Cần Git, Docker Desktop/Engine chạy Linux containers và Docker Compose v2. PowerShell 5.1+ cần cho các script quản trị. Không cần cài Java, Maven, Node hay Python nếu chỉ chạy bằng Compose.

```powershell
git clone <repository-url>
cd Cong-Nghe-Web
docker version
docker compose version
```

## 2. Cấu hình

```powershell
Copy-Item .env.example .env
```

Trong `.env`, bắt buộc đổi `POSTGRES_PASSWORD` và `JWT_SECRET` khi không chạy trên máy demo cô lập. Không commit `.env`, API key hoặc backup. Giữ `AI_PROVIDER=deterministic` để smoke test không gọi dịch vụ trả phí.

| Service | Host | Nội bộ Compose | Dữ liệu |
|---|---:|---:|---|
| Frontend | `5173` | `frontend:5173` | bind mount source |
| Backend | `8081` | `backend:8080` | CV tại `/data/cv` |
| PostgreSQL/pgvector | không publish | `database:5432` | volume `<project>_postgres_data` |
| AI Worker | không publish | `ai-worker:8000` | stateless |

Nếu đổi `BACKEND_HOST_PORT`, đổi port trong `VITE_API_BASE_URL` tương ứng. Nếu đổi frontend port, thêm origin tương ứng vào `APP_CORS_ALLOWED_ORIGINS`.

## 3. Build, chạy và kiểm tra

```powershell
docker compose --env-file .env config -q
docker compose --env-file .env up -d --build --wait
docker compose --env-file .env ps
.\scripts\smoke-demo.ps1
docker compose --env-file .env logs --tail=100 backend ai-worker database frontend
```

Smoke test xác nhận bốn container healthy, frontend trả HTTP, frontend trỏ đúng backend, backend kết nối PostgreSQL/pgvector và AI Worker. Kiểm tra thủ công backend: `Invoke-RestMethod http://localhost:8081/api/actuator/health/readiness`.

## 4. Migration, seed và reset demo

Flyway tự chạy migration khi backend khởi động. Seed chỉ ghi khi bảng `users` trống; chạy lần hai phải in `SKIP` và không đổi số bản ghi.

```powershell
.\scripts\seed-data.ps1 -EnvFile .env -ProjectName matchajob-demo
.\scripts\seed-data.ps1 -EnvFile .env -ProjectName matchajob-demo
```

Reset chỉ nhận môi trường `demo` hoặc `test`, từ chối tên project có dấu hiệu production, yêu cầu nhập `RESET <project>` và chỉ xóa volume PostgreSQL của đúng Compose project. CV volume được giữ lại. `-Force` chỉ dùng trong CI/test cô lập.

```powershell
.\scripts\reset-db-dev.ps1 -Environment demo -EnvFile .env -ProjectName matchajob-demo
.\scripts\seed-data.ps1 -EnvFile .env -ProjectName matchajob-demo
```

## 5. Backup và restore

Backup tạm dừng backend để chặn ghi mới, tạo PostgreSQL custom dump, archive CV volume, kiểm tra mọi `cv_versions.file_path` có file và ghi SHA-256 vào manifest. Backend được bật lại khi script kết thúc.

```powershell
.\scripts\backup-demo.ps1 -EnvFile .env -ProjectName matchajob-demo
```

Restore phải vào project test/restore mới và từ chối volume đã tồn tại. Tạo `.env.restore` từ `.env.example`, đặt project/port khác, rồi dùng thư mục backup vừa tạo:

```powershell
.\scripts\restore-demo.ps1 -BackupDirectory .\backups\<timestamp> -EnvFile .env.restore -ProjectName matchajob-restore-test
docker compose --env-file .env.restore -p matchajob-restore-test up -d --build --wait
.\scripts\smoke-demo.ps1 -EnvFile .env.restore -ProjectName matchajob-restore-test
```

Script restore xác minh checksum, số bản ghi chính và số file CV. Sau đó đăng nhập API và download một CV để đối chiếu checksum nếu backup có CV.

## 6. Vận hành và cập nhật

```powershell
docker compose --env-file .env stop
docker compose --env-file .env start
docker compose --env-file .env restart backend
git pull --ff-only
docker compose --env-file .env up -d --build --wait
.\scripts\smoke-demo.ps1
docker compose --env-file .env down
```

`down` giữ volume. Không dùng `down -v` nếu chưa có backup đã restore thử.

## 7. Xử lý lỗi thường gặp

- Port conflict: đổi `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT` và `VITE_API_BASE_URL`; chạy lại `config -q`.
- Thiếu env: so sánh `.env` với `.env.example`; Compose dừng ngay nếu thiếu password/JWT.
- Database chưa ready: `docker compose logs database`; không đổi password của volume cũ bằng cách chỉ sửa `.env`.
- Backend Maven build lỗi: chạy `docker compose build --no-cache backend` để lấy dòng compile/test đầu tiên; kiểm tra merge marker bằng `rg '^(<<<<<<<|=======|>>>>>>>)' backend`.
- AI Worker lỗi: `docker compose logs ai-worker`; giữ provider deterministic nếu không có API key.
- Volume permission: xác nhận Docker Desktop được phép mount repository; không chạy backend host và container cùng ghi CV volume.
- Health timeout: xem `docker compose ps` và log dependency trước; backend readiness phụ thuộc cả DB và AI.

## 8. Checklist máy sạch

Người kiểm thử khác ghi lại OS, phiên bản Docker/Compose, commit SHA, thời gian từng lệnh và lỗi phát sinh; chỉ dùng repository, `.env.example` và runbook này. Thực hiện: clone → cấu hình env → `config -q` → `up --build --wait` → smoke → seed hai lần → restart bốn service → smoke → backup → restore vào project riêng → smoke và download CV. Không mang `.env`, volume hoặc image cache từ máy tác giả.
