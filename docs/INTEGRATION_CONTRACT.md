# Integration Contract — MatchaJob (SE347.R11, Nhóm 7)

- **Version:** Draft 0.1
- **Owner điều phối:** Việt Khang
- **Trạng thái:** Chờ owner review; đây chưa phải cấu hình đã freeze.
- **Mục tiêu:** thống nhất cách Frontend, Spring Boot Backend, PostgreSQL và FastAPI AI Worker kết nối; phân biệt giá trị có trong source với quyết định đề xuất.

## 1. Service topology và URLs

| Kết nối | URL/port | Căn cứ | Trạng thái |
|---|---|---|---|
| Browser → Frontend | `http://localhost:5173` | `.env.example`: `FRONTEND_HOST_PORT=5173`; Compose map cổng này | Có cấu hình; cần kiểm tra runtime |
| Browser/Frontend → Backend | `http://localhost:8081/api` | `VITE_API_BASE_URL` trong `.env.example`, host port backend 8081 và context path `/api` | Có cấu hình; FE hiện chưa được xác minh sử dụng env |
| Backend bên trong Compose → PostgreSQL | `jdbc:postgresql://database:5432/matchajob_db` | `.env.example`, `application-dev.yml`, Compose service `database` | Có cấu hình |
| Host → PostgreSQL | `localhost:5433` | Compose map `${POSTGRES_HOST_PORT:-5433}:5432` | Có cấu hình |
| Backend container → AI Worker | `http://ai-worker:8000` | `AI_WORKER_BASE_URL` default trong `.env.example`/Compose | Có cấu hình |
| Host → AI Worker | `http://localhost:8001` | Compose map `${AI_WORKER_HOST_PORT:-8001}:8000` | Có cấu hình |
| Browser → AI Worker | **Không dùng cho business calls** | Kiến trúc và bảo mật đã thống nhất trong contract draft | Quy ước đề xuất |

**Quy tắc base path Backend:** `server.servlet.context-path=/api`; mọi controller mapping nên bắt đầu `/v1/...`. Bốn Recruitment controller hiện khai báo `/api/v1/...`, gây URL suy ra `/api/api/v1/...`; đây là backlog P0, chưa được coi là đã sửa.

## 2. Environment variables

| Biến | Dùng bởi | Giá trị mẫu/default có căn cứ | Secret? | Contract notes |
|---|---|---|---|---|
| `COMPOSE_PROJECT_NAME` | Compose | `matchajob` | No | Tên project compose hiện khai báo |
| `APP_ENV` | Compose/AI | `development` | No | Environment label |
| `FRONTEND_HOST_PORT` | Compose | `5173` | No | Host port |
| `FRONTEND_CONTAINER_PORT` | Compose | `5173` | No | Vite container port |
| `VITE_API_BASE_URL` | Vite/browser | `http://localhost:8081/api` | No | Public browser URL; không chứa secret; cần confirm API client sử dụng biến này |
| `POSTGRES_HOST_PORT` | Compose | `5433` | No | Host port |
| `POSTGRES_CONTAINER_PORT` | Compose | `5432` | No | Container port |
| `POSTGRES_DB` | Database/Backend | `matchajob_db` | No | Database name |
| `POSTGRES_USER` | Database/Backend | `matchajob_user` | Có thể nhạy cảm theo môi trường | Dùng local dev; production phải dùng secret management |
| `POSTGRES_PASSWORD` | Database/Backend | giá trị placeholder trong `.env.example` | **Yes** | Thay ở máy cá nhân; `.env` không commit |
| `BACKEND_HOST_PORT` | Compose | `8081` | No | Host port |
| `BACKEND_CONTAINER_PORT` | Backend/Compose | `8080` | No | Container port được `server.port` sử dụng |
| `SPRING_PROFILES_ACTIVE` | Backend | `dev` | No | Chọn `application-dev.yml` |
| `SPRING_DATASOURCE_URL` | Backend | `jdbc:postgresql://database:5432/matchajob_db` | No | Từ container dùng service name `database`, không dùng port host 5433 |
| `SPRING_DATASOURCE_USERNAME` | Backend | `matchajob_user` | Có thể nhạy cảm theo môi trường | Phải khớp database config |
| `SPRING_DATASOURCE_PASSWORD` | Backend | placeholder | **Yes** | Không commit secret thật |
| `AI_WORKER_BASE_URL` | Backend | `http://ai-worker:8000` trong Compose; `http://localhost:8001` là default của `application-dev.yml` khi không chạy trong Compose | No | Chọn theo nơi chạy Backend; tránh dùng `localhost:8001` từ container Backend |
| `AI_WORKER_HOST_PORT` | Compose | `8001` | No | Host port |
| `AI_WORKER_CONTAINER_PORT` | Compose/AI Worker | `8000` | No | Port trong container |
| `AI_PROVIDER` | AI Worker | `openai` | No | Provider selector; implementation phải được kiểm tra trước khi tuyên bố dùng provider thật |
| `AI_MODEL` | AI Worker | `gpt-4o-mini` | No | Model selector trong config; chưa chắc mọi provider/service sử dụng cùng biến |
| `AI_API_KEY` | AI Worker | rỗng trong config runtime; `.env.example` dùng placeholder | **Yes** | Không commit, không gửi Frontend; không in vào log |

**Nguồn:** `.env.example`, `compose.yaml`, `backend/src/main/resources/application.yml`, `application-dev.yml`, `ai-worker/app/core/config.py`.

## 3. Contract Backend → AI Worker

Base URL là `AI_WORKER_BASE_URL`; các path được ghép từ `AiWorkerClient.java`. AI Worker không kế thừa context path `/api` của Backend.

| Method + path | Request | Success response | Source alignment / acceptance |
|---|---|---|---|
| `GET /health` | Không có body | `status`, `service`, `version`, `environment`, `uptime_seconds` | Có trong `health.py`; không gọi LLM |
| `GET /health/live` | Không có body | `{ "status": "alive" }` | Liveness process |
| `GET /health/ready` | Không có body | `{ "status": "ready" }` hoặc `503` với `unready` | Readiness theo `app.state.is_ready` |
| `GET /health/startup` | Không có body | `{ "status": "initialized" }` hoặc `503` với `initializing` | Startup probe |
| `POST /api/v1/cv/extract` | `multipart/form-data`, field tên `file` | `raw_text`, `parsed_data`, `char_count`, `page_count` | PDF/DOCX; 10 MiB; PDF tối đa 20 trang; lỗi validation cần test |
| `POST /api/v1/embeddings` | `{ "texts": ["..."] }`, 1–100 text | `embeddings`, `dimension`, `model` | Schema đang khai báo dimension 1536; response hiện đặt `model="text-embedding-3-small"` tĩnh, phải được owner xác nhận so với provider thực tế |
| `POST /api/v1/match/score` | `job_id?`, `job_title`, `job_description?`, `job_requirements?`, `cv_text`, `candidate_skills?` — `snake_case` | `overall_score`, `skills_score?`, `experience_score?`, `breakdown` object, `rationale?` | Điểm nằm 0–100; fixture validate Pydantic; score fixture không chứng minh chất lượng mô hình |

AI Worker lỗi HTTP theo `application/problem+json` dựa trên schema `ProblemDetail` trong `ai-worker/app/schemas/errors.py`. Cần kiểm tra parity với lỗi Backend; không trả exception nội bộ nhạy cảm.

## 4. Timeout và retry

### 4.1 Giá trị hiện tại tìm thấy

- `application-dev.yml` khai báo `ai-worker.connect-timeout-ms: 3000` và `ai-worker.read-timeout-ms: 5000`.
- `AiWorkerConfig.java` dùng các giá trị này để cấu hình RestClient.
- `CvProcessingOrchestrator` xem `ResourceAccessException` và HTTP 5xx là có thể retry.
- `ProcessingJobService` đặt `maxAttempts=3`; exponential delay được tính theo `2^attemptCount * 2` giây.
- **Chưa tìm thấy scheduler/poller/consumer gọi `claimNextJob()` hoặc `recoverExpiredLeases()` trong source được rà soát.** Vì vậy, state/retry logic đã có nhưng execution tự động của queue chưa được chứng minh; upload trả lời “queued” không đủ chứng minh job sẽ tự xử lý.

### 4.2 Quy tắc mục tiêu cần chốt

1. Kết nối nội bộ: Backend gọi `http://ai-worker:8000` khi trong Compose; retry không được chuyển qua host URL trong container.
2. Health probe không retry nhiều lần liên tiếp; dùng health endpoint để chẩn đoán service.
3. Retry chỉ cho lỗi tạm thời (timeout/connection failure, 429 nếu provider/AI Worker trả đúng semantics, 502/503/504/5xx) và phải có giới hạn. Không retry validation 4xx.
4. Không tự retry tác vụ có side effect nếu chưa có idempotency key hoặc cơ chế deduplicate.
5. Processing Job cần lưu attempt count/status; không công khai `leaseToken`, raw stack trace hoặc thông tin nội bộ trong DTO public.
6. Chốt thời gian timeout theo endpoint: 5 giây hiện tại có thể ngắn cho CV extraction hoặc matching qua provider; mọi thay đổi timeout phải theo benchmark/owner approval, không tự đổi ở tài liệu thành cấu hình đang chạy.

| Quyết định timeout/retry | Trạng thái | Người xác nhận |
|---|---|---|
| Giữ connect timeout 3000 ms? | Có trong source, cần đánh giá khi integration test | Đại Hưng + Khải Vạn + Tiểu pro |
| Read timeout cho extraction | Đang là 5000 ms; cần test file hợp lệ và chốt giá trị | Đại Hưng + Khải Vạn |
| Read timeout cho matching score | Đang là 5000 ms; cần benchmark/test latency | Đại Hưng + Khải Vạn |
| Retry count/backoff của Processing Job | Có model/service logic (3 attempts, exponential delay), worker loop chưa thấy | Đại Hưng |
| Idempotency cho application submit | Chưa implement trong route được kiểm kê; cần unique constraint + response 409/idempotent semantics | Đại Hưng + Phúc Khang |
| AI provider retry/rate-limit policy | Chưa thấy contract xuyên suốt đầy đủ; cần chốt trong AI Worker | Khải Vạn |

## 5. Processing state contract mục tiêu

Các giá trị thấy trong Backend processing service: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`. CV có trạng thái hiện tại `uploaded`, `extracted`. Không đưa `leaseToken` hoặc `lastError` thô ra API public.

| State | Ý nghĩa đề xuất | Terminal? | Chuyển tiếp cần kiểm soát |
|---|---|---|---|
| `PENDING` | Đã ghi nhận yêu cầu, đang chờ worker/consumer | No | `PROCESSING`, hoặc `FAILED` khi hết attempts |
| `PROCESSING` | Một worker đã claim và đang thực hiện | No | `COMPLETED`, `PENDING` khi retry, `FAILED` khi lỗi vĩnh viễn/hết attempts |
| `COMPLETED` | Tất cả bước bắt buộc và việc lưu kết quả hoàn tất | Yes | Không tự reset; reprocess là lệnh/job mới |
| `FAILED` | Không thể hoàn tất sau quy tắc retry hiện hành | Yes theo contract public | Retry thủ công chỉ qua thao tác có quyền hoặc tạo job mới theo quyết định owner |

`GET /api/v1/processing-jobs/{id}` cần trả DTO công khai tối thiểu: `id`, `status`, `createdAt`, `updatedAt`, `startedAt?`, `completedAt?`, `attemptCount` nếu MVP cần. `lastError` nên được chuyển thành `errorCode`/`userMessage` an toàn hoặc chỉ log nội bộ.

### CV upload response semantics

- Nếu xử lý thực sự bất đồng bộ và worker đã được nối: `202 Accepted` + `processingJobId` là phù hợp; response nói “queued” chỉ khi có cơ chế thực thi job đã cấu hình.
- Nếu gọi xử lý đồng bộ bằng `sync=true`, response và status phải nhất quán với kết quả thực tế; không báo “queued” như thể async.
- Trạng thái hiện tại: route source tạo processing record và chỉ gọi `processSingleJob()` khi `sync=true`; chưa thấy background consumer/poller. **Đây là blocker trước khi ký xác nhận async upload contract.**

## 6. Matching response semantics

Source `MatchController` gọi `matchingService.evaluateMatch(...)` ngay trong request rồi trả `202 Accepted`; `jobId` là optional và có fallback `UUID.randomUUID()`, còn `jobTitle`/`jobRequirements` có default demo. Đó là những mâu thuẫn cần sửa, không phải contract được khuyến nghị.

Owner phải chốt một trong hai mô hình:

- **Sync (đơn giản cho MVP):** POST chờ kết quả và trả `200 OK` (hoặc kết quả tạo mới theo quy ước đã chọn); GET trả `200` nếu có kết quả và `404` nếu chưa có.
- **Async (chỉ khi có processing job thật):** POST tạo tracking resource và trả `202 Accepted` cùng trạng thái `PENDING`; Frontend poll status/result; queue consumer, retries, timeout và idempotency phải được test.

Trong cả hai trường hợp, Backend nên load Job/CV/Application snapshot từ dữ liệu đã xác thực, không nhận `candidateId`, `cvText`, `jobTitle` hoặc `jobRequirements` tùy ý từ trình duyệt làm nguồn sự thật nghiệp vụ. Chi tiết mapping giữa Backend `MatchResult.breakdown` hiện là `String` và AI Worker `breakdown` là object cần DTO mapping rõ.

## 7. Idempotency và dữ liệu

- CV upload: không coi file trùng là duplicate chỉ dựa vào filename; nếu muốn deduplicate theo SHA-256, owner cần xác định phạm vi (candidate + hash hay global), retention và response.
- Application submit: unique rule tối thiểu thường là một application/candidate/job active; cần xác nhận với nghiệp vụ và thể hiện bằng database constraint/test, không chỉ kiểm tra ở FE.
- Processing job: model có `idempotencyKey` unique; owner phải xác định key composition và hành vi khi key đã tồn tại.
- Không ghi CV text, access token, password, API key hoặc payload PII đầy đủ vào log thông thường.

## 8. Integration acceptance checklist

- [ ] `docker compose config` hợp lệ với `.env` local; secret không commit.
- [ ] Frontend truy cập Backend qua `VITE_API_BASE_URL`, không ghép `/api` lặp.
- [ ] Recruitment controllers dùng mapping `/v1/...`; runtime canonical route trả đúng status/DTO.
- [ ] Backend → PostgreSQL hoạt động; host/container port không bị tráo.
- [ ] Backend container gọi được `/health` của AI Worker theo `AI_WORKER_BASE_URL`.
- [ ] Mỗi AI Worker request/response validate qua schema; lỗi 4xx/5xx được xử lý có chủ đích.
- [ ] Timeout có test/decision cho extraction và matching; retry không lặp side effect mù quáng.
- [ ] Có consumer/poller thực thi Processing Job hoặc upload đổi sang flow đồng bộ được chốt.
- [ ] Matching status code phù hợp cách xử lý thực tế; không dùng random `jobId` hay default business data.
- [ ] CORS chỉ cho phép origin đúng; secrets không xuất hiện ở browser/log.

## 9. Change control

Mọi thay đổi URL, DTO, enum, status code, retry behavior hoặc processing state phải cập nhật cùng một thay đổi: `API_CONTRACT.md`, fixture + `manifest.json`, test tương ứng, adapter Frontend nếu liên quan và `DECISION_LOG.md`. Không đóng task tích hợp nếu tài liệu và test không cùng phiên bản.
