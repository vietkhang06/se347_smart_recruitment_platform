# Báo cáo triển khai Tuần 1 — Docker, Health Check và CV Storage

Ngày kiểm tra: 12/10/2026  
Nhánh kiểm tra: `main`  
Commit nền: `080d8c17e9dea8de421b2d7075f00d46d3e263b7`

## 1. Mục tiêu công việc

Tuần 1 tập trung vào ba nền tảng kỹ thuật:

1. Chuẩn hóa môi trường Docker Compose của Frontend, Backend, PostgreSQL và AI Worker.
2. Đối chiếu health check với endpoint thật trong source và cải thiện script vận hành cục bộ.
3. Làm chắc nền tảng lưu CV: kiểm tra loại tệp, lưu bền vững, metadata phiên bản, tải/xem tệp và hợp đồng API.

Phạm vi không bao gồm triển khai JWT/RBAC hoàn chỉnh, S3/MinIO, hàng đợi, Kubernetes, matching/ranking hay viết lại kiến trúc. Các thay đổi được giữ nhỏ và tương thích với prefix hiện tại `/api/v1/candidates`.

## 2. Hiện trạng trước khi thực hiện

Repository đã có:

- `compose.yaml` với bốn service `frontend`, `backend`, `database`, `ai-worker` và một network dùng chung.
- PostgreSQL pgvector có `pg_isready`; Backend và AI Worker có health check trong Dockerfile.
- Spring Boot chạy dưới context path `/api`; `CvController` chạy dưới `/v1/candidates`.
- Upload CV, bảng `cv_versions`, processing job, client gọi AI Worker và Flyway migration.
- AI Worker có bốn endpoint `/health`, `/health/live`, `/health/ready`, `/health/startup`.
- Script start/stop/status/reset dành cho Windows.

Những điểm chưa đầy đủ hoặc chưa an toàn:

- CV nằm trong filesystem của container Backend, chưa có named volume riêng.
- Backend trả thẳng JPA entity nên lộ `filePath`, `rawText`, `parsedData`; endpoint chi tiết chưa kiểm tra quan hệ `candidateId`–`cvVersionId`.
- Chưa có endpoint download/preview.
- Upload đọc toàn bộ tệp thành `byte[]`, ghi trực tiếp, tên lưu phụ thuộc tên người dùng và không dọn tệp nếu lưu database thất bại.
- Compose chưa có health check Frontend; script start chủ yếu kiểm tra port và có thông báo dễ gây hiểu nhầm.
- Script reset dùng `docker compose down -v`, có thể xóa cả volume CV nếu volume này được bổ sung.
- Profile dev dùng `ddl-auto: create` đồng thời với Flyway.
- `.env.example` có chuỗi giả dạng API key thay vì giá trị trống rõ ràng.
- Auth/JWT chưa tồn tại nên chưa thể chứng minh người gọi sở hữu candidate trong URL.

Git status ban đầu sạch: `main...origin/main`. README và nhãn “hoàn thành” chỉ được dùng để định hướng kiểm tra, không dùng làm bằng chứng.

## 3. Kiến trúc liên quan

```text
Trình duyệt
  └─ http://localhost:5173
       └─ http://localhost:8081/api  → frontend gọi backend

Backend container :8080
  ├─ jdbc:postgresql://database:5432/matchajob_db
  ├─ http://ai-worker:8000
  └─ /data/cv → named volume matchajob_cv_storage

Host mapping
  frontend  5173:5173
  backend   8081:8080
  database  5433:5432
  ai-worker 8001:8000
```

Trong Docker, Backend dùng DNS theo service name `database` và `ai-worker`, không dùng `localhost`. Frontend chạy trong trình duyệt nên API URL hợp lệ là `http://localhost:8081/api`. Backend không phụ thuộc cứng vào AI Worker khi khởi động; khi AI Worker gián đoạn, upload vẫn có thể tạo processing job và phần xử lý hoạt động theo cơ chế lỗi/retry sẵn có.

## 4. Các vấn đề phát hiện

| Vấn đề | File ảnh hưởng | Nguyên nhân | Tác động | Trạng thái |
|---|---|---|---|---|
| CV không bền vững khi recreate Backend | `compose.yaml` | Không có volume CV | Mất tệp trong container mới | Đã sửa bằng `matchajob_cv_storage` tại `/data/cv` |
| Đường dẫn lưu không đồng nhất local/Docker | `application.yml`, `.env.example` | Thiếu biến cấu hình Compose | Khó chạy máy sạch | Đã sửa bằng `MATCHAJOB_UPLOAD_DIR` |
| Upload giữ toàn bộ file trong RAM và sao chép byte array | `CvStorageService` | Dùng `getBytes()` và `Files.write()` | Tốn bộ nhớ, khó chặn vượt giới hạn lúc stream | Đã sửa bằng stream 8 KiB, hash trong khi ghi |
| Ghi file không nguyên tử | `CvStorageService` | Ghi thẳng file đích | Có thể để lại tệp dở | Đã sửa bằng file tạm và atomic move khi filesystem hỗ trợ |
| Có thể để file rác khi DB lỗi | `CvController` | File được ghi trước transaction DB | Orphan file | Đã sửa: dọn object khi đăng ký CV/job thất bại |
| API lộ đường dẫn nội bộ và dữ liệu trích xuất | `CvController` | Trả JPA entity trực tiếp | Rò rỉ chi tiết nội bộ/CV | Đã sửa bằng DTO public |
| `candidateId` không được dùng để scope endpoint chi tiết | `CvController`, `CvVersionRepository` | Tìm CV chỉ theo ID | Có thể đọc nhầm CV của candidate khác | Đã sửa ở mức quan hệ dữ liệu; Auth vẫn là blocker |
| Chưa có download/preview | `CvController` | Chưa triển khai | Frontend không lấy được tệp đã lưu | Đã bổ sung endpoint nhỏ nhất, candidate-scoped |
| MIME chỉ dựa vào khai báo client | `CvStorageService` | Chưa đối chiếu extension/signature | Có thể nhận sai loại tệp | Đã sửa: extension + MIME + magic bytes |
| Reset DB có thể xóa mọi volume | `scripts/reset-db-dev.ps1` | Dùng `down -v` | Nguy cơ xóa CV | Đã sửa: chỉ xóa `matchajob_postgres_data` |
| Dev schema cạnh tranh với Flyway | `application-dev.yml` | `ddl-auto: create` | Schema có thể bị Hibernate tạo lại | Đã sửa thành `validate` |
| Frontend thiếu health check | `compose.yaml` | Chưa cấu hình | Compose không phản ánh readiness của Vite | Đã bổ sung bằng Node `fetch`, không cài package mới |
| Backend readiness mặc định chưa buộc kiểm tra DB/pgvector | `application.yml` | Actuator probe group chưa khai báo contributor | Có thể báo ready dù DB hỏng sau startup | Đã thêm `readinessState,db,pgVector`; Flyway lỗi vẫn làm startup fail |
| Script start/status kiểm tra endpoint chưa chính xác | `scripts/start-dev.ps1`, `status-dev.ps1` | Kiểm tra port hoặc endpoint tổng quát | Có thể báo READY sai | Đã dùng readiness endpoint thật |
| CV status không chuyển sang `failed` khi processing job thất bại | `CvProcessingOrchestrator`, `ProcessingJobService` | Hiện chỉ job chuyển `FAILED`; CV giữ `uploaded` | UI phải đọc job để biết lỗi | Chưa sửa để tránh thay đổi workflow AI ngoài phạm vi; cần Đại Hưng/Khải Vạn thống nhất state machine |
| Chưa có JWT/RBAC | Auth module và CV endpoints | Module thành viên khác chưa hoàn thành | URL candidate vẫn chưa chứng minh ownership | Blocker/phụ thuộc Backend tài khoản |
| Có nhiều Spring application/config cũ trong repo | Backend source/config | Di sản cấu trúc cũ | Rủi ro cấu hình chồng chéo | Ngoài phạm vi tuần này; Maven hiện chỉ định main class đang dùng |
| Frontend có nhiều lint warning và bundle lớn | Frontend source | Nợ kỹ thuật giao diện | Rủi ro maintainability/performance | Ngoài phạm vi tuần này; build vẫn pass |

## 5. Nội dung đã triển khai

### Docker và cấu hình

- `compose.yaml`: thêm Frontend health check; truyền biến storage/limit cho Backend; mount named volume `cv_storage`; giữ Backend chỉ chờ database healthy; bổ sung `APP_ENV` đúng với AI Worker settings.
- `.env.example`: thêm thư mục/giới hạn CV; để trống `AI_API_KEY`; giữ placeholder database chỉ cho development.
- `backend/Dockerfile`: tạo `/data/cv`, cấp quyền cho non-root user `appuser`.
- `frontend/Dockerfile.dev`: dùng `package-lock.json` và `npm ci` để Docker build cài đúng dependency graph đã khóa.
- `application.yml`: thêm multipart limit và property `matchajob.upload-dir`/`matchajob.cv.max-file-size`.
- `application.yml`: cấu hình readiness group gồm `readinessState`, datasource `db` và custom `pgVector`.
- `application-dev.yml`: đổi Hibernate từ `create` sang `validate` để Flyway quản lý schema.

### CV storage và API

- `CvStorageService`: sanitize tên hiển thị, chặn traversal, kiểm tra PDF/DOCX bằng extension + MIME + magic bytes, stream file, tính SHA-256 trong một lượt, ghi file tạm rồi move, trả logical object key thay vì physical path.
- `CvRegistrationService`: gom thao tác tạo `CvVersion` và `ProcessingJob` vào transaction Spring thật sự.
- `CvController`: trả DTO an toàn, dọn file nếu transaction đăng ký thất bại, scope metadata/download theo candidate, bổ sung download/preview.
- `CvVersionRepository`: thêm truy vấn theo đồng thời CV ID và candidate ID.
- `GlobalExceptionHandler`: chuẩn hóa lỗi 400/404/413 và không trả nội dung exception nội bộ trong lỗi 500.
- Test mới kiểm tra storage và controller; test cũ được cập nhật để tương thích contract mới.

### Script và tài liệu

- `start-dev.ps1`: kiểm tra daemon và Compose config, build/start đủ bốn service, poll readiness thật, trả exit code lỗi nếu service chưa ready.
- `status-dev.ps1`: dùng readiness URL đúng và in `docker compose ps` khi daemon chạy.
- `reset-db-dev.ps1`: chỉ reset PostgreSQL, bảo toàn CV volume.
- `logs-dev.ps1` và `logs-dev.bat`: xem log tất cả hoặc theo service.
- `docs/contracts/cv-storage-contract.md`: tài liệu contract đầy đủ cho upload/list/metadata/download.
- `frontend/package-lock.json`: lock dependency được sinh khi cài đặt để máy sạch có đầu vào xác định hơn.

## 6. Luồng upload và quản lý phiên bản CV

### Hành vi đã triển khai

1. Client gửi `multipart/form-data` tới `POST /api/v1/candidates/{candidateId}/cv`.
2. Spring chặn request vượt `max-request-size`; service kiểm tra rỗng, dung lượng, extension, MIME và magic bytes.
3. Tên gốc được chuyển về basename và sanitize; server tự tạo object key `candidates/{candidateId}/{uuid}.pdf|docx`.
4. Tệp được stream vào file tạm dưới storage root, đồng thời tính SHA-256; sau khi hợp lệ mới move sang object đích.
5. `CvRegistrationService` tạo một dòng `cv_versions` trạng thái `uploaded` và một processing job `PENDING` trong transaction.
6. Nếu bước DB thất bại, controller cố gắng xóa object vừa ghi.
7. Worker/orchestrator hiện có sẽ đọc object, gọi AI Worker để extract, gọi embeddings và lưu kết quả. Khi thành công CV chuyển `extracted`, job chuyển `COMPLETED`.
8. Khi job lỗi, job có thể quay lại `PENDING` theo backoff hoặc chuyển `FAILED`. CV hiện chưa chuyển `failed`; đây là thiếu sót đã ghi nhận.
9. `GET /api/v1/candidates/{candidateId}/cv` trả danh sách version mới nhất trước, không trả storage path/raw text/parsed data.
10. `GET .../{cvVersionId}/download` đối chiếu candidate–version, resolve object key bên trong storage root và trả binary với `attachment` hoặc `inline`.

### Hành vi mới ở mức contract/chưa hoàn chỉnh

- `401/403` và ownership thật chỉ là contract; chưa thể thực thi khi JWT/RBAC chưa có.
- Quy tắc bỏ qua hoặc hợp nhất file trùng SHA-256 chưa được chốt; hiện mỗi upload hợp lệ tạo version mới.
- Xóa version, chọn version active và cleanup object mất metadata chưa nằm trong tuần 1.
- Trạng thái CV `failed` là trạng thái mục tiêu nhưng hiện job status mới là nguồn xác định lỗi xử lý.

## 7. CV API contract

Contract chi tiết nằm tại `docs/contracts/cv-storage-contract.md`. Tóm tắt:

| Method | Route | Kết quả thành công | Hiện trạng |
|---|---|---|---|
| `POST` | `/api/v1/candidates/{candidateId}/cv` | `202`, metadata upload + processing job ID | Đã triển khai |
| `GET` | `/api/v1/candidates/{candidateId}/cv` | `200`, danh sách metadata | Đã triển khai |
| `GET` | `/api/v1/candidates/{candidateId}/cv/{cvVersionId}` | `200`, metadata một version | Đã triển khai và scope theo candidate |
| `GET` | `/api/v1/candidates/{candidateId}/cv/{cvVersionId}/download` | `200`, PDF/DOCX binary | Đã triển khai; Auth còn blocker |

Lỗi dùng RFC 7807 `application/problem+json`: `400` validation, `404` metadata/object không tồn tại, `413` vượt multipart limit; `401/403` được dành cho Auth/RBAC tương lai. API không trả absolute filesystem path.

## 8. Cấu hình Docker và biến môi trường

| Biến | Service | Giá trị mặc định | Mục đích | Chỉ an toàn development? |
|---|---|---|---|---|
| `POSTGRES_DB` | database | `matchajob_db` | Tên database | Không |
| `POSTGRES_USER` | database/backend | `matchajob_user` | Tài khoản DB | Có, nếu dùng mặc định |
| `POSTGRES_PASSWORD` | database/backend | `matchajob_password` | Mật khẩu DB | Có, bắt buộc đổi khi deploy |
| `POSTGRES_HOST_PORT` | database | `5433` | Port DB trên host | Có |
| `POSTGRES_CONTAINER_PORT` | database | `5432` | Port trong container | Không |
| `FRONTEND_HOST_PORT` | frontend | `5173` | Port Vite trên host | Có |
| `FRONTEND_CONTAINER_PORT` | frontend | `5173` | Port Vite trong container | Có |
| `VITE_API_BASE_URL` | frontend/browser | `http://localhost:8081/api` | Browser gọi Backend | Có; production cần domain thật |
| `BACKEND_HOST_PORT` | backend | `8081` | Port Backend trên host | Có |
| `BACKEND_CONTAINER_PORT` | backend | `8080` | Spring server port | Không |
| `SPRING_PROFILES_ACTIVE` | backend | `dev` | Chọn profile Spring | Có |
| `SPRING_DATASOURCE_URL` | backend | `jdbc:postgresql://database:5432/matchajob_db` | Kết nối DB qua Docker DNS | Không |
| `SPRING_DATASOURCE_USERNAME` | backend | `matchajob_user` | User DB | Có, nếu dùng mặc định |
| `SPRING_DATASOURCE_PASSWORD` | backend | `matchajob_password` | Password DB | Có, nếu dùng mặc định |
| `AI_WORKER_BASE_URL` | backend | `http://ai-worker:8000` | Backend gọi AI Worker | Không |
| `MATCHAJOB_UPLOAD_DIR` | backend | `/data/cv` trong Compose | Root lưu CV | Không |
| `MATCHAJOB_CV_MAX_FILE_SIZE` | backend | `10MB` | Giới hạn một file | Không |
| `MATCHAJOB_CV_MAX_REQUEST_SIZE` | backend | `11MB` | Giới hạn multipart request | Không |
| `AI_WORKER_HOST_PORT` | ai-worker | `8001` | Port AI trên host | Có |
| `AI_WORKER_CONTAINER_PORT` | ai-worker | `8000` | Port Uvicorn trong container | Không |
| `APP_ENV` | ai-worker | `development` | Nhãn môi trường/health response | Có |
| `AI_PROVIDER` | ai-worker | `openai` | Provider cấu hình | Tùy môi trường |
| `AI_MODEL` | ai-worker | `gpt-4o-mini` | Model cấu hình | Tùy môi trường |
| `AI_API_KEY` | ai-worker | rỗng | Secret provider nếu dùng | Không được commit giá trị thật |

## 9. Kiểm thử và bằng chứng

| Lệnh | Kết quả | Bằng chứng chính |
|---|---|---|
| `git status --short` trước thay đổi | Pass | Worktree ban đầu sạch, nhánh `main...origin/main` |
| `docker compose config --quiet` | Pass | Exit code 0, in `COMPOSE_CONFIG_OK` |
| `docker compose build` | Chưa xác minh | Docker daemon không tồn tại tại `npipe:////./pipe/dockerDesktopLinuxEngine` |
| `docker compose up -d` | Chưa xác minh | Cùng lỗi Docker daemon; không có container nào được tạo |
| `docker compose ps` | Chưa xác minh | Cùng lỗi Docker daemon |
| HTTP Frontend/Backend/AI probes | Chưa xác minh | Các URL host timeout vì stack không chạy |
| Recreate Backend và kiểm tra volume CV | Chưa xác minh | Không thể chạy container khi daemon tắt |
| `backend\\mvnw.cmd test` | Pass | `16` test, `0` failure, `0` error; `BUILD SUCCESS` |
| `backend\\mvnw.cmd test` ngay sau khi thêm readiness group | Fail rồi đã sửa | Test context chủ động loại DataSource nên contributor `db` không tồn tại; thêm test-only `validate-group-membership=false`, lần chạy cuối pass 16/16. Cấu hình runtime vẫn validate contributor. |
| `python -m pytest` lần đầu | Fail do môi trường | Không collect được vì thiếu `pydantic_settings` |
| Cài `pydantic-settings==2.3.4` vào thư mục tạm rồi `python -m pytest` | Pass | `12 passed`, 1 cảnh báo deprecation; repository không bị sửa |
| `npm install --legacy-peer-deps --omit=optional ...` | Pass | Cài 70 package; sau đó bổ sung native bindings platform vào local `node_modules` |
| `npm run build` | Pass | Vite build 348 module; có cảnh báo chunk JS `956.17 kB` lớn hơn 500 kB |
| `npm run lint` | Pass có cảnh báo | Exit code 0; nhiều warning tồn tại sẵn về unused/state/effect/immutability |
| `npm ci --dry-run --no-audit --no-fund` | Pass | Lockfile đồng bộ với `package.json`, trạng thái `up to date` |
| PowerShell parser cho `scripts/*.ps1` | Pass | 6/6 script parse hợp lệ |
| `git diff --check` | Pass | Không có whitespace error; chỉ có cảnh báo Git về LF/CRLF |
| Scan regex secret/key phổ biến bằng `rg` | Pass | Không có kết quả khớp |

Không có lệnh nào được báo Pass nếu chưa chạy thành công. Runtime Compose và persistence qua recreate vẫn là “Chưa xác minh”, dù cấu hình tĩnh hợp lệ.

## 10. Lỗi và rủi ro còn lại

### Trong phạm vi task

- Chưa có bằng chứng runtime Docker/health/volume persistence vì Docker Desktop daemon đang tắt.
- DB integration test `CvProcessingIT` cần PostgreSQL/pgvector thật; bộ unit/controller/storage test đã pass nhưng chưa thay thế integration runtime.
- Khi xóa file cleanup thất bại, Backend chỉ log cảnh báo; cần job reconciliation nếu yêu cầu độ tin cậy cao hơn.

### Phụ thuộc Auth/RBAC

- Route đã scope CV theo candidate trong database nhưng chưa biết danh tính người gọi.
- Không được mở endpoint CV công khai trên production trước khi Backend tài khoản bổ sung JWT, ownership và `401/403`.
- Owner phù hợp: Backend tài khoản/hồ sơ, phối hợp Backend CV.

### Phụ thuộc AI Worker

- Cần thống nhất state machine để CV chuyển `failed` khi processing job thất bại vĩnh viễn.
- AI readiness hiện chỉ xác nhận app initialization, chưa kiểm tra provider bên ngoài; đây là lựa chọn phù hợp cho startup không phụ thuộc API ngoài.
- Owner phù hợp: Backend ứng tuyển/CV và AI Worker.

### Ngoài phạm vi repository tuần này

- Frontend lint warning và bundle lớn cần owner Frontend xử lý theo sprint UI/performance.
- Nhiều application entry/config lịch sử ở Backend cần audit riêng trước khi hợp nhất cấu trúc.
- Chưa có CI workflow để chạy Compose config, Backend test, AI test và Frontend build tự động.
- Production secrets, TLS, backup/restore và observability chưa được thiết kế; không được xem cấu hình development là production-ready.

## 11. Hướng dẫn chạy cho thành viên khác

Thực hiện tại thư mục gốc repository bằng PowerShell.

### Tạo `.env`

```powershell
Copy-Item .env.example .env
```

Chỉ điền secret thật trong `.env` cục bộ, không commit file này.

### Khởi động hệ thống

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Hoặc dùng script:

```powershell
.\start-dev.bat
```

### Kiểm tra health

```powershell
curl.exe -f http://localhost:5173/
curl.exe -f http://localhost:8081/api/actuator/health/readiness
curl.exe -f http://localhost:8001/health
curl.exe -f http://localhost:8001/health/live
curl.exe -f http://localhost:8001/health/ready
curl.exe -f http://localhost:8001/health/startup
```

Database health:

```powershell
docker compose exec -T database sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

### Upload CV mẫu tổng hợp

Dùng một PDF/DOCX giả lập, không dùng CV cá nhân thật trong fixture. Thay UUID bằng candidate hợp lệ trong môi trường dev.

```powershell
curl.exe -X POST "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv" -F "file=@synthetic-resume.pdf;type=application/pdf"
```

### Liệt kê version

```powershell
curl.exe "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv"
```

### Xem metadata và tải CV

```powershell
curl.exe "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv/CV_VERSION_UUID"
curl.exe -OJ "http://localhost:8081/api/v1/candidates/CANDIDATE_UUID/cv/CV_VERSION_UUID/download"
```

Preview dùng query `?disposition=inline`.

### Xem log

```powershell
.\logs-dev.bat
.\logs-dev.bat backend
docker compose logs --tail 200 -f ai-worker
```

### Dừng hệ thống

```powershell
.\stop-dev.bat
```

Reset database chỉ khi thực sự cần:

```powershell
.\reset-db-dev.bat
```

Script reset mới chỉ xóa `matchajob_postgres_data` và giữ `matchajob_cv_storage`.

## 12. Kết luận và điều kiện nghiệm thu

| Tiêu chí | Trạng thái | Căn cứ |
|---|---|---|
| 1. `docker compose config` hợp lệ | Đạt | Lệnh exit 0 |
| 2. Port và env nhất quán | Đạt ở mức cấu hình | Render Compose hợp lệ, mapping đúng 5173/8081/5433/8001 |
| 3. Backend dùng Docker DNS | Đạt | `database:5432`, `ai-worker:8000` |
| 4. Health endpoint/check khớp source | Đạt ở mức source/test; runtime chưa xác minh | Actuator có context `/api`; AI có đủ bốn route; Docker daemon tắt |
| 5. Backend chờ database healthy | Đạt ở cấu hình | `depends_on.database.condition: service_healthy` |
| 6. Không commit secret thật | Đạt theo scan hiện tại | API key rỗng; không có pattern key/private key |
| 7. CV dùng persistent volume | Đạt ở cấu hình; persistence runtime chưa xác minh | Named volume `matchajob_cv_storage` |
| 8. Storage directory cấu hình được | Đạt | `MATCHAJOB_UPLOAD_DIR`/`matchajob.upload-dir` |
| 9. Contract đủ upload/download/version/status/storage/validation/auth | Đạt | `docs/contracts/cv-storage-contract.md` |
| 10. Không phá hành vi processing hiện có | Đạt theo unit test; integration DB chưa xác minh | 16/16 Backend test pass |
| 11. Test liên quan pass hoặc lỗi được ghi đúng | Đạt có điều kiện | Backend, AI, Frontend pass; Docker runtime chưa xác minh |
| 12. Không thêm hạ tầng/feature ngoài phạm vi | Đạt | Không thêm S3, Redis, broker, Kubernetes |
| 13. Có báo cáo tiếng Việt khớp thay đổi/lệnh | Đạt | File báo cáo này |

Kết luận: phần code/config/contract của task tuần 1 đã được triển khai và kiểm thử tĩnh/unit thành công. Chưa đủ bằng chứng để kết luận “toàn bộ môi trường Docker chạy hoàn chỉnh” hoặc “CV tồn tại sau recreate container” cho đến khi bật Docker Desktop, chạy đủ bốn service, thực hiện upload bằng dữ liệu tổng hợp và kiểm tra lại named volume. Auth/RBAC vẫn là blocker bắt buộc trước khi cho phép truy cập CV trong môi trường ngoài nhóm phát triển.
