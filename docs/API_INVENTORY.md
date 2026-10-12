# API Inventory — MatchaJob (SE347, Nhóm 7)

- **Ngày rà soát:** 2026-10-12
- **Người tổng hợp:** Việt Khang (MVP Scope + API Convention + Integration Contract)
- **Mục đích:** Ghi nhận API đang được khai báo trong source, URL suy ra từ cấu hình, request/response có thể xác nhận từ code, khoảng trống cần bổ sung và người cần xác nhận contract.
- **Phạm vi kiểm tra:** `backend/src/main/java`, cấu hình Spring Boot, AI Worker FastAPI, `compose.yaml`, `.env.example`, các service Frontend và workbook phân công nhóm.
- **Mức xác minh:** Đây là **static source audit**. Không khẳng định endpoint đã chạy thành công ở runtime; chưa thực hiện smoke test HTTP, chưa xác minh dữ liệu database thật và chưa coi các endpoint đề xuất là contract đã được nhóm duyệt.

> Quy tắc đọc tài liệu: “Có trong code” chỉ có nghĩa đã tìm thấy route/mapping tương ứng trong source. “URL suy ra” được ghép từ `server.servlet.context-path`, mapping của controller và port trong cấu hình. “Chưa tìm thấy” nghĩa là không tìm thấy trong source đã rà soát, không phải khẳng định chức năng đó không thể tồn tại ở một branch/file ngoài bộ source này.

## 1. Tóm tắt hiện trạng

| Hạng mục | Kết quả kiểm kê | Nhận định |
|---|---:|---|
| Backend — route trong controller | 15 | Job/Employer Job/Category/Skill, CV, Processing Job và Matching đã có mapping. |
| Backend — route bị ảnh hưởng bởi tiền tố `/api` lặp | 9/15 | Bốn controller khai báo `/api/v1/...` trong khi Spring Boot đã đặt context path `/api`. URL suy ra thành `/api/api/v1/...`. |
| AI Worker — route trong FastAPI | 7 | Bốn health/probe endpoint và ba endpoint xử lý CV/embedding/matching. |
| Auth API | Chưa tìm thấy | Chưa có controller đăng ký/đăng nhập/current user và chưa thấy `spring-security` trong `backend/pom.xml`. |
| Application API | Chưa tìm thấy CRUD/workflow | Có entity `Application` và Match Controller đặt dưới `/v1/applications`, nhưng chưa thấy API nộp đơn, danh sách ứng tuyển hoặc cập nhật trạng thái. |
| Frontend API adapter thật | Chưa xác nhận/thấy sử dụng | `VITE_API_BASE_URL` có trong `.env.example`/Compose nhưng không tìm thấy tham chiếu trong `frontend/src`; nhiều màn hình gọi `mockStore`/`MATCHAJOB_DATA`. |
| Chạy thử endpoint | Chưa thực hiện | Trạng thái hoạt động thực tế cần smoke test ở bước tích hợp. |

### Các điểm nghẽn ưu tiên

1. **P0 — Chốt base path:** giữ `context-path=/api` và `VITE_API_BASE_URL=http://localhost:8081/api` thì mapping nghiệp vụ nên dùng `/v1/...`; hiện Job/Employer Job/Category/Skill đang khai báo `/api/v1/...`, gây URL suy ra `/api/api/v1/...`.
2. **P1 — Auth/JWT chưa có trong backend source:** chưa thể xem các endpoint hiện tại là đã có contract phân quyền; API CV đang nhận `candidateId` từ path mà chưa thấy lớp authorization bảo vệ.
3. **P1 — Application workflow còn thiếu API:** không tìm thấy route tạo đơn, xem đơn của ứng viên, danh sách ứng viên theo Job, cập nhật stage hoặc lịch sử trạng thái.
4. **P1 — Matching contract mâu thuẫn:** `POST .../match` trả `202 Accepted`, nhưng Controller gọi `evaluateMatch(...)` ngay trong request trước khi trả về. `jobId` lại optional và nếu thiếu thì tạo UUID ngẫu nhiên; `jobTitle`/`jobRequirements` có default cứng trong controller.
5. **P1 — Frontend chưa kết nối API thực:** source hiện sử dụng `mockStore`/`MATCHAJOB_DATA`; biến `VITE_API_BASE_URL` chưa được dùng trong `frontend/src` theo tìm kiếm tĩnh.
6. **P1 — CV endpoint trả entity trực tiếp:** `GET` CV theo version trả `CvVersion`; path có `candidateId` nhưng code lookup chỉ theo `cvVersionId`, chưa kiểm tra CV đó thuộc candidate trong path. Chưa tìm thấy endpoint tải file CV.
7. **P2 — Convention chưa nhất quán:** CV upload response dùng `snake_case`, DTO Job dùng `camelCase`; AI Worker có RFC 7807 handler, Backend có `ProblemDetail` nhưng error detail lấy từ `ex.getMessage()`; chưa có một API error contract được xác nhận xuyên service.
8. **P2 — Cần rà CORS và tài liệu API:** chưa tìm thấy cấu hình CORS trong phần source đã rà; cũng chưa thấy dependency OpenAPI/Springdoc trong `backend/pom.xml`. Cần xác minh/thiết lập trước khi Frontend gọi Backend trực tiếp qua port khác.

## 2. Quy ước URL và cấu hình đang có

| Thành phần | Cấu hình trong source | URL/địa chỉ suy ra | Ghi chú |
|---|---|---|---|
| Frontend → Backend (trình duyệt) | `VITE_API_BASE_URL=http://localhost:8081/api` trong `.env.example`; port host `8081` trong Compose | `http://localhost:8081/api` | Tìm kiếm tĩnh chưa thấy `VITE_API_BASE_URL` được đọc ở `frontend/src`. |
| Spring Boot Backend | `server.port=${BACKEND_CONTAINER_PORT:8080}`, `server.servlet.context-path=/api` | Trong Compose: host `localhost:8081`, container port `8080`; ngoài Compose mặc định port `8080` | Context path `/api` được thêm trước mapping của controller. |
| AI Worker từ Backend trong Compose | `AI_WORKER_BASE_URL=http://ai-worker:8000` | `http://ai-worker:8000` | Đây là địa chỉ nội bộ Docker, không phải URL mà trình duyệt dùng. |
| AI Worker từ máy host | Compose map host port `8001` sang container port `8000`; Backend dev mặc định `http://localhost:8001` | `http://localhost:8001` | Phù hợp khi chạy Backend ngoài Docker trên máy host; cần tránh dùng nhầm URL host trong container Backend. |
| PostgreSQL | Compose: service `database`, container port `5432`, host port mặc định `5433` | Backend trong Compose dùng `jdbc:postgresql://database:5432/matchajob_db` | API Inventory không kiểm tra kết nối DB lúc chạy. |
| Spring Actuator | expose `health, info, metrics` trong `application.yml` | Dự kiến dưới `/api/actuator/...` theo context path mặc định | Chưa runtime-verify; tách biệt với business API. |

### Quyết định base path đề xuất để review

Đề xuất **giữ** `server.servlet.context-path=/api` và `VITE_API_BASE_URL=http://localhost:8081/api`, đồng thời đổi mapping tại bốn controller Recruitment từ `/api/v1/...` thành `/v1/...`. Khi đó URL public sẽ là `http://localhost:8081/api/v1/...`, cùng convention với CV, Processing và Matching.

Đây là đề xuất sửa lỗi tích hợp, chưa phải thay đổi code đã thực hiện và cần được các owner liên quan xác nhận trước khi merge.

## 3. Backend API — route đã tìm thấy trong source

**Host URL trong Compose:** `http://localhost:8081`. Các URL đầy đủ dưới đây là URL suy ra tĩnh từ host + context path + mapping, chưa được gọi thử qua HTTP.

| ID | Module / Owner theo phân công | Method | Mapping khai báo trong controller | URL suy ra hiện tại | Request / query đã xác nhận từ code | Response / status từ code | Trạng thái / vấn đề cần xử lý | Source |
|---|---|---|---|---|---|---|---|---|
| BE-01 | Job — Vua Thanh Hóa (Aka HGK); reviewer tích hợp: Việt Khang | GET | `/api/v1/jobs` | `/api/api/v1/jobs` | Query tùy chọn: `keyword`, `categoryId(UUID)`, `level`, `workType`, `location`, `salaryMin(Long)`, `salaryMax(Long)`, `skillIds(UUID[])`, `sortBy`; `page=0`, `size=10` mặc định | `200`; `PageResponse<JobSummaryResponse>` gồm `content`, `page`, `size`, `totalElements`, `totalPages`, `last` | **P0 path conflict.** Chốt danh sách `sortBy`, quy tắc `size` tối đa, enum filter và status hiển thị cho ứng viên. | `backend/.../recruitment/controller/JobController.java` |
| BE-02 | Job — Vua Thanh Hóa (Aka HGK) | GET | `/api/v1/jobs/{id}` | `/api/api/v1/jobs/{id}` | Path `id: UUID` | `200`; `JobDetailResponse` | **P0 path conflict.** Cần thống nhất response khi không tồn tại Job và quy tắc Job nào được public. | `backend/.../recruitment/controller/JobController.java` |
| BE-03 | Employer Job — Vua Thanh Hóa (Aka HGK) | GET | `/api/v1/employer/jobs` | `/api/api/v1/employer/jobs` | `companyId: UUID` bắt buộc; `status` tùy chọn; `page=0`, `size=10` | `200`; `PageResponse<JobSummaryResponse>` | **P0 path conflict.** `companyId` nhận từ client; sau khi có JWT cần kiểm tra company thuộc user đã đăng nhập, không tin ID do client tự chọn. | `backend/.../recruitment/controller/EmployerJobController.java` |
| BE-04 | Employer Job — Vua Thanh Hóa (Aka HGK) | POST | `/api/v1/employer/jobs` | `/api/api/v1/employer/jobs` | JSON `JobCreateRequest`: `companyId`, `categoryId`, `createdBy`, `title`, `department`, `level`, `workType`, `location`, `address`, `mapLink`, `salaryMode`, `salaryMin`, `salaryMax`, `salaryCurrency`, `experience`, `description`, `requirements`, `benefits`, `schedule`, `summaryIndustry`, `summaryRequired`, `summaryPreferred`, `status`, `deadline`, `skills[{skillId,isRequired}]` | `201`; `JobDetailResponse` | **P0 path conflict.** Request hiện có `companyId`/`createdBy` do client gửi; cần chốt trường nào lấy từ JWT. DTO chưa thể hiện validation annotation ở các field trong file đã kiểm tra. | `backend/.../recruitment/controller/EmployerJobController.java`, `.../dto/JobCreateRequest.java` |
| BE-05 | Employer Job — Vua Thanh Hóa (Aka HGK) | PUT | `/api/v1/employer/jobs/{id}` | `/api/api/v1/employer/jobs/{id}` | Path `id: UUID`; JSON `JobUpdateRequest` gồm các field cập nhật Job và `skills` | `200`; `JobDetailResponse` | **P0 path conflict.** Chưa xác minh runtime 404/validation và quyền sửa tin theo company. | `backend/.../recruitment/controller/EmployerJobController.java`, `.../dto/JobUpdateRequest.java` |
| BE-06 | Employer Job — Vua Thanh Hóa (Aka HGK) | PATCH | `/api/v1/employer/jobs/{id}/status` | `/api/api/v1/employer/jobs/{id}/status` | Path `id: UUID`; JSON `{ "status": "..." }` qua `JobStatusUpdateRequest` | `200`; `JobDetailResponse` | **P0 path conflict.** Code comment nêu status `active`, `paused`, `closed`; cần xác nhận state machine và transition hợp lệ. | `backend/.../recruitment/controller/EmployerJobController.java`, `.../dto/JobStatusUpdateRequest.java` |
| BE-07 | Employer Job — Vua Thanh Hóa (Aka HGK) | DELETE | `/api/v1/employer/jobs/{id}` | `/api/api/v1/employer/jobs/{id}` | Path `id: UUID` | `204 No Content` | **P0 path conflict.** Chốt xoá mềm hay xoá cứng, ảnh hưởng đơn ứng tuyển và hành vi nếu tin đã có ứng viên. | `backend/.../recruitment/controller/EmployerJobController.java` |
| BE-08 | Category — Vua Thanh Hóa (Aka HGK) | GET | `/api/v1/categories` | `/api/api/v1/categories` | Không có query | `200`; `List<CategoryResponse>` | **P0 path conflict.** Cần xác nhận dữ liệu danh mục trả ra và cách xử lý danh mục không hoạt động (nếu có). | `backend/.../recruitment/controller/CategoryController.java` |
| BE-09 | Skill — Vua Thanh Hóa (Aka HGK) | GET | `/api/v1/skills` | `/api/api/v1/skills` | `categoryId: UUID` tùy chọn; `q: String` tùy chọn | `200`; `List<SkillResponse>` | **P0 path conflict.** Cần chốt semantics tìm kiếm `q`, sort và giới hạn kết quả nếu danh sách lớn. | `backend/.../recruitment/controller/SkillController.java` |
| BE-10 | CV upload/storage — Tiểu pro; CV/application integration — Đại Hưng | POST | `/v1/candidates/{candidateId}/cv` | `/api/v1/candidates/{candidateId}/cv` | `multipart/form-data`, field `file` bắt buộc; query `sync=false` mặc định. Storage cho phép PDF/DOCX, tối đa 10 MiB theo code và kiểm tra magic bytes | `202 Accepted`; map dùng key `cv_version_id`, `candidate_id`, `file_name`, `file_size_bytes`, `status`, `processing_job_id`, `message` | Route có trong code. **P1:** xác thực candidate ownership chưa thấy; naming là `snake_case`; cần chốt response và status processing. | `backend/.../cv/controller/CvController.java`, `backend/.../cv/service/CvStorageService.java` |
| BE-11 | CV — Tiểu pro / Đại Hưng | GET | `/v1/candidates/{candidateId}/cv/{cvVersionId}` | `/api/v1/candidates/{candidateId}/cv/{cvVersionId}` | Path `candidateId: UUID`, `cvVersionId: UUID` | `200` trả thẳng `CvVersion`; `404` nếu không tìm thấy `cvVersionId` | **P1.** Trong controller, lookup theo `cvVersionId`; chưa thấy kiểm tra `CvVersion.candidateId == candidateId`. Entity có `filePath`, nên trả entity trực tiếp có nguy cơ lộ đường dẫn lưu file. | `backend/.../cv/controller/CvController.java`, `backend/.../cv/model/CvVersion.java` |
| BE-12 | CV — Tiểu pro / Đại Hưng | GET | `/v1/candidates/{candidateId}/cv` | `/api/v1/candidates/{candidateId}/cv` | Path `candidateId: UUID` | `200`; `List<CvVersion>` | **P1.** Chưa thấy kiểm tra quyền truy cập; trả entity trực tiếp thay vì DTO công khai. | `backend/.../cv/controller/CvController.java` |
| BE-13 | Processing Job — Đại Hưng | GET | `/v1/processing-jobs/{id}` | `/api/v1/processing-jobs/{id}` | Path `id: UUID` | `200` trả thẳng `ProcessingJob`; `404` nếu không tìm thấy | Route có trong code. **P1:** cần chốt các status public và tránh trả `lastError` nội bộ/chi tiết lease nếu không cần cho client. | `backend/.../processing/controller/ProcessingJobController.java`, `.../processing/model/ProcessingJob.java` |
| BE-14 | Matching orchestration — Đại Hưng; scoring — Khải Vạn; reviewer tích hợp: Việt Khang | POST | `/v1/applications/{applicationId}/match` | `/api/v1/applications/{applicationId}/match` | Path `applicationId: UUID`; query `cvVersionId: UUID` bắt buộc, `jobId` tùy chọn, `jobTitle` mặc định `Software Engineer`, `jobRequirements` mặc định `Java, Spring Boot, PostgreSQL`, `jobDescription` mặc định rỗng | `202 Accepted`; body `MatchResult` | **P1 contract mismatch.** Code gọi `matchingService.evaluateMatch(...)` đồng bộ trước khi trả `202`; thiếu `jobId` thì Controller tạo UUID ngẫu nhiên. Nên dùng dữ liệu Job/Application thật hoặc yêu cầu trường bắt buộc; chốt sync `200/201` hay async `202 + processingId`. | `backend/.../matching/controller/MatchController.java`, `.../matching/service/MatchingService.java` |
| BE-15 | Matching result — Đại Hưng; scoring — Khải Vạn | GET | `/v1/applications/{applicationId}/match` | `/api/v1/applications/{applicationId}/match` | Path `applicationId: UUID` | `200` trả `MatchResult`; `404` nếu chưa có kết quả | Route có trong code. Không phải API lấy ranking; chưa có route liệt kê xếp hạng theo Job. Cần chốt quyền xem kết quả. | `backend/.../matching/controller/MatchController.java`, `.../matching/model/MatchResult.java` |

> Trong bảng này, dấu `...` ở đường dẫn source chỉ rút gọn phần package prefix `backend/src/main/java/com/matchajob/`; tên file đầy đủ có thể tra trong cột Source. Tất cả URL “suy ra hiện tại” cần được xác minh bằng request thực tế sau khi thống nhất sửa base path.

## 4. AI Worker API — route đã tìm thấy trong FastAPI

**Host URL local:** `http://localhost:8001`. **URL nội bộ Compose:** `http://ai-worker:8000`. Router health đăng ký trực tiếp tại root; router CV có prefix `/api/v1`.

| ID | Method | URL | Request | Response / status đã xác nhận từ code | Owner theo phân công | Source / ghi chú |
|---|---|---|---|---|---|---|
| AI-01 | GET | `/health` | Không có | `200`; `{status, service, version, environment, uptime_seconds}` | Khải Vạn; phối hợp Tiểu pro về health check | `ai-worker/app/api/health.py`. Trả `status="healthy"` từ handler; chưa kiểm tra health ở runtime. |
| AI-02 | GET | `/health/live` | Không có | `200`; `{status:"alive"}` | Khải Vạn / Tiểu pro | `ai-worker/app/api/health.py`. Không gọi DB/provider theo mô tả handler. |
| AI-03 | GET | `/health/ready` | Không có | `200` với `ready`, hoặc `503` với `unready` | Khải Vạn / Tiểu pro | `ai-worker/app/api/health.py`; trạng thái dựa trên `app.state.is_ready`. |
| AI-04 | GET | `/health/startup` | Không có | `200` với `initialized`, hoặc `503` với `initializing` | Khải Vạn / Tiểu pro | `ai-worker/app/api/health.py`; trạng thái dựa trên `app.state.is_started`. |
| AI-05 | POST | `/api/v1/cv/extract` | `multipart/form-data`, field `file`; parser code xử lý PDF/DOCX | `200`; `{raw_text, parsed_data, char_count, page_count}`; `400` khi filename/đầu vào không hợp lệ; `413` khi file vượt giới hạn; lỗi ngoại lệ khác qua handler 500 | Khải Vạn | `ai-worker/app/api/cv.py`, `ai-worker/app/schemas/ai.py`. Backend client gọi đúng path này. |
| AI-06 | POST | `/api/v1/embeddings` | JSON `{ "texts": ["..."] }`; schema giới hạn list từ 1 đến 100 phần tử | `200`; `{embeddings: number[][], dimension:1536, model}`; handler trả `400` nếu `texts` rỗng | Khải Vạn; tích hợp Backend: Đại Hưng | `ai-worker/app/api/cv.py`, `ai-worker/app/schemas/ai.py`. `model` response hiện đang được gán chuỗi `text-embedding-3-small` trong endpoint; cần xác nhận có đúng với provider/model thực dùng. |
| AI-07 | POST | `/api/v1/match/score` | JSON fields: `job_id?`, `job_title`, `job_description?`, `job_requirements?`, `cv_text`, `candidate_skills?` | `200`; `{overall_score: 0..100, skills_score?, experience_score?, breakdown, rationale?}`; `400` nếu `cv_text` rỗng | Khải Vạn; tích hợp Backend: Đại Hưng | `ai-worker/app/api/cv.py`, `ai-worker/app/schemas/ai.py`. Cần freeze semantics/weighting của score và cấu trúc `breakdown`. |

### AI Worker — error contract hiện tại

`ai-worker/app/main.py` có handler cho HTTP exception và exception không xử lý, trả media type `application/problem+json` với Problem Details gồm `type`, `title`, `status`, `detail`, `instance`. Các trường hợp request validation cụ thể và status thực tế vẫn cần kiểm thử; tài liệu này không suy diễn kết quả runtime khi chưa chạy test.

### Backend → AI Worker

`backend/src/main/java/com/matchajob/client/AiWorkerClient.java` đang gọi ba path `/api/v1/cv/extract`, `/api/v1/embeddings`, `/api/v1/match/score`. Với `AI_WORKER_BASE_URL=http://ai-worker:8000`, các request tương ứng là:

- `http://ai-worker:8000/api/v1/cv/extract`
- `http://ai-worker:8000/api/v1/embeddings`
- `http://ai-worker:8000/api/v1/match/score`

Cấu hình timeout thấy trong `application-dev.yml`/`AiWorkerConfig`: connect 3000 ms, read 5000 ms, processing timeout cấu hình 60000 ms trong `AiWorkerConfig`. Chưa xác minh bằng kiểm thử độ trễ. Contract cần làm rõ retry/idempotency và map lỗi AI Worker thành lỗi/processing state Backend.

## 5. Các API chưa tìm thấy nhưng cần cho MVP

Các path dưới đây là **nhu cầu nghiệp vụ/đề xuất để backlog**, không phải endpoint đã có trong code và không được coi là route chính thức cho tới khi owner duyệt.

| ID | Nhu cầu nghiệp vụ | Tình trạng rà soát | Owner theo phân công | Acceptance criteria cần ghi vào backlog |
|---|---|---|---|---|
| GAP-01 | Auth: register, login, current user (ví dụ `POST /v1/auth/register`, `POST /v1/auth/login`, `GET /v1/auth/me`) | Chưa tìm thấy controller/route Auth; chưa thấy dependency Spring Security trong POM | Phúc Khang; contract review Việt Khang | Đăng ký/đăng nhập có validation; trả token/identity theo contract; `401/403` rõ ràng; JWT claims và role được chốt; không cho client tự quyết identity. |
| GAP-02 | Candidate profile / skills / experience / education | Chưa tìm thấy controller profile candidate trong Backend API hiện có | Phúc Khang | Có API đọc/cập nhật profile theo user đã xác thực; không truy cập profile người khác; DTO không lộ field nội bộ. |
| GAP-03 | Company profile cho nhà tuyển dụng | Chưa tìm thấy controller company/profile | Phúc Khang | Nhà tuyển dụng chỉ đọc/cập nhật company mà họ được phép quản lý; identity lấy từ JWT khi Auth sẵn sàng. |
| GAP-04 | Tạo Application/nộp đơn | Chưa tìm thấy `POST` tạo application; chỉ thấy Matching controller dùng path `/v1/applications/{applicationId}/match` | Đại Hưng | Ứng viên chỉ nộp khi Job nhận hồ sơ; CV version hợp lệ; chống nộp trùng; tạo application có ID/stage/time và phản hồi nhất quán. |
| GAP-05 | Ứng viên xem các đơn của mình và lịch sử trạng thái | Chưa tìm thấy list/history endpoint | Đại Hưng | Chỉ trả application của user hiện tại; có phân trang nếu cần; trạng thái theo state machine; lịch sử không bị mất khi cập nhật stage. |
| GAP-06 | Nhà tuyển dụng xem danh sách ứng viên theo Job và cập nhật stage | Chưa tìm thấy endpoint application-list/stage update | Đại Hưng; UI consumer Khanh | Nhà tuyển dụng chỉ xem hồ sơ của Job thuộc company được phép quản lý; transition stage hợp lệ; lỗi `404/403/409` được chốt. |
| GAP-07 | Tải xuống/xem nội dung file CV được cấp quyền | Chưa tìm thấy endpoint download; `GET` hiện trả `CvVersion` metadata/entity | Tiểu pro (storage); Đại Hưng (access/workflow) | File chỉ được tải bởi candidate sở hữu hoặc recruiter được phép qua application; không trả file path nội bộ; giới hạn loại/kích thước và Content-Type rõ. |
| GAP-08 | Candidate ranking theo Job | Chưa tìm thấy API ranking; matching hiện lấy một application result | Đại Hưng + Khải Vạn | Trả danh sách ứng viên theo Job, score/status; tie-break và cách xử lý thiếu kết quả được xác định; quyền chỉ recruiter đúng company. |
| GAP-09 | API xem dữ liệu Company/Job stats và phần admin cần cho demo | Phân công/ý tưởng dự án có đề cập, nhưng không thấy route tương ứng trong controller hiện tại | Phúc Khang / Vua Thanh Hóa tùy domain; cần nhóm chốt MVP | Chỉ đưa vào MVP nếu được xác nhận là bắt buộc trong luồng demo; nếu không chuyển sang ngoài phạm vi MVP. |

## 6. Những contract gap cần tạo thành backlog

| ID | Mức ưu tiên | Phát hiện có bằng chứng | Owner đề xuất | Dependency | Tiêu chí chấp nhận |
|---|---|---|---|---|---|
| ACT-01 | P0 | 9 route Job/Employer Job/Category/Skill có mapping bắt đầu `/api/v1` dưới `context-path=/api` | Vua Thanh Hóa; phối hợp Việt Khang | Quyết định base path | Sau khi sửa, các route thống nhất dưới `/api/v1`; smoke test xác nhận không còn đường dẫn `/api/api/v1`. |
| ACT-02 | P1 | Không thấy Auth API/Spring Security trong source đã kiểm tra | Phúc Khang | JWT claims/RBAC decision | Auth contract được review; tài nguyên ứng viên/nhà tuyển dụng có kiểm tra quyền phía Backend. |
| ACT-03 | P1 | Thiếu Application workflow APIs trong controller | Đại Hưng | Entity/state machine/Job rules | Contract nộp đơn/list/stage/history/ranking (nếu giữ trong MVP) được định nghĩa và test case có acceptance criteria. |
| ACT-04 | P1 | CV nested route không xác minh `candidateId`; entity trả trực tiếp có trường đường dẫn file | Đại Hưng + Tiểu pro | Auth/RBAC và DTO CV | GET/list/upload chỉ hoạt động trong đúng phạm vi quyền; response DTO không lộ file path; có contract download nếu MVP cần. |
| ACT-05 | P1 | POST matching trả `202` nhưng service xử lý ngay; `jobId` optional và có thể sinh UUID mới | Đại Hưng + Khải Vạn | Quyết định sync/async, application-job relationship | Định nghĩa sync/async rõ; không dùng ID ngẫu nhiên thay dữ liệu nghiệp vụ; defaults demo được loại bỏ hoặc được phê duyệt rõ trong contract. |
| ACT-06 | P1 | Không thấy `VITE_API_BASE_URL` được dùng trong `frontend/src`; có nhiều tham chiếu `mockStore`/`MATCHAJOB_DATA` | PN Thông (candidate UI), Khanh (recruiter UI), Việt Khang điều phối | API adapters/fixtures | Các màn hình trong MVP gọi qua service adapter; mock mode tách rõ; có loading/empty/error state và integration smoke test. |
| ACT-07 | P1 | Frontend host `5173` và Backend host `8081` là cross-origin; chưa tìm thấy CORS config trong code đã rà | Phúc Khang/Backend foundation | Origin dev/deployment đã chốt | CORS cho origin được phép được cấu hình/test; không dùng wildcard tùy tiện khi bật credential. |
| ACT-08 | P2 | CV upload trả `snake_case`, Job DTO dùng `camelCase`; error response hai service chưa được contract freeze chung | Việt Khang + từng API owner | Convention review | Chốt JSON naming và RFC 7807 profile; fixture success/error khớp code, OpenAPI hoặc tài liệu contract. |
| ACT-09 | P2 | AI embeddings handler trả model `text-embedding-3-small` cố định, trong khi config tổng quát có `AI_PROVIDER`/`AI_MODEL` | Khải Vạn | Provider/model được chốt | Response metadata phản ánh model đang chạy hoặc tài liệu nêu rõ embedding model riêng; test không phụ thuộc ngầm vào tên model. |
| ACT-10 | P2 | Chưa thấy Springdoc/OpenAPI dependency trong POM; tài liệu route chưa được sinh/tự động đối chiếu | Việt Khang + Backend owners | Contract được freeze | Có một nguồn contract có thể review; không để tài liệu và controller lệch nhau. |

## 7. Ranh giới owner/reviewer đề xuất

Phân công dưới đây được suy ra từ sheet `Phân Công` và `Tasks tuần` trong workbook Nhóm 7. Đây là mapping đề xuất để giao việc review, không khẳng định thành viên đã nhận từng subtask API nếu workbook không ghi rõ.

| Domain | Owner theo workbook | Người phối hợp/reviewer đề xuất | Ghi chú |
|---|---|---|---|
| API convention, MVP scope, integration review | Việt Khang | Toàn bộ owner module | Điều phối, chốt quy ước và theo dõi thay đổi contract. |
| Auth, JWT, User/Profile/Company | Phúc Khang | Việt Khang; Frontend PN Thông/Khanh | API chưa thấy trong source hiện tại. |
| Job, Category, Skill, Search/Filter/Sort/Pagination | Vua Thanh Hóa (Aka HGK) | Việt Khang; Frontend PN Thông/Khanh | Có routes nhưng có path conflict. |
| CV storage/upload/download/version | Tiểu pro | Đại Hưng; Việt Khang | Upload/list/get version có route; download và authorization chưa thấy. |
| Application, Processing Job, Matching Backend, Ranking | Đại Hưng | Khải Vạn; Việt Khang; Frontend Khanh/PN Thông | Processing/match route có một phần; application workflow và ranking còn thiếu. |
| AI Worker health, extraction, embeddings, scoring | Khải Vạn (sheet `Phân Công` ghi “Khải Vạn”; cần thống nhất cách ghi với “Vạn Khải” ở các tài liệu khác nếu có) | Đại Hưng; Tiểu pro; Việt Khang | Cần freeze CV/JD schema và scoring response. |
| Candidate UI/API adapter | Workbook ghi `PN Thông` ở `Phân Công`/`Tasks tuần`, trong khi `Bảng Tasks` có `Nguyễn Thông` | Xác nhận tên hiển thị trong nhóm | Không tự kết luận hai tên này là cùng một người khi workbook có khác biệt cách ghi. |
| Recruiter UI/API adapter | Khanh | Đại Hưng, Vua Thanh Hóa, Việt Khang | Cần ma trận màn hình–API và view model. |

## 8. Checklist xác minh runtime sau khi owner xử lý

Các mục này là việc tiếp theo sau kiểm kê tĩnh; không được đánh dấu PASS cho tới khi có kết quả chạy thật.

- [ ] `docker compose config` thành công với `.env` đã chuẩn bị.
- [ ] Backend healthy; ghi lại log và port thực tế.
- [ ] `GET /api/v1/jobs` gọi được sau khi xử lý base path; `GET /api/api/v1/jobs` không còn là URL chuẩn.
- [ ] Categories, skills và employer job routes trả status/body đúng contract đã duyệt.
- [ ] AI Worker `/health`, `/health/ready` và `/health/startup` trả trạng thái mong đợi.
- [ ] Backend gọi được ba AI Worker endpoint nội bộ với timeout/error handling rõ ràng.
- [ ] Upload CV PDF/DOCX hợp lệ thành công; file rỗng, sai định dạng và file lớn hơn 10 MiB bị từ chối đúng contract.
- [ ] CV access kiểm tra owner/permission và không trả file path nội bộ.
- [ ] Auth/Application/Ranking được phân loại rõ: thuộc MVP hoặc được chuyển khỏi MVP; nếu thuộc MVP, route + fixture + tests có owner.
- [ ] Frontend luồng MVP gọi service adapter/API thực thay vì đọc/ghi `mockStore` trực tiếp.
- [ ] CORS, error response và JSON casing đã được xác minh bằng request thật.

## 9. Kết luận trạng thái bước 1

**API Inventory đã được lập ở mức static source audit**: đã kiểm kê các route tìm thấy, URL suy ra theo cấu hình, request/response có bằng chứng, các API chưa thấy và các lỗi/điểm mơ hồ cần chuyển thành backlog. Trước khi tuyên bố contract được freeze, cần review với Vua Thanh Hóa (Job), Phúc Khang (Auth/Profile), Đại Hưng (Application/CV/Matching), Khải Vạn (AI Worker), Tiểu pro (storage/infrastructure), PN Thông và Khanh (Frontend).

**Không được xem những route ở mục “API chưa tìm thấy” là API đã triển khai; cũng không được xem URL suy ra là runtime-verified cho tới khi smoke test.**

## 10. File nguồn đã đối chiếu

- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/application-dev.yml`
- `backend/src/main/java/com/matchajob/api/recruitment/controller/JobController.java`
- `backend/src/main/java/com/matchajob/api/recruitment/controller/EmployerJobController.java`
- `backend/src/main/java/com/matchajob/api/recruitment/controller/CategoryController.java`
- `backend/src/main/java/com/matchajob/api/recruitment/controller/SkillController.java`
- `backend/src/main/java/com/matchajob/cv/controller/CvController.java`
- `backend/src/main/java/com/matchajob/cv/service/CvStorageService.java`
- `backend/src/main/java/com/matchajob/processing/controller/ProcessingJobController.java`
- `backend/src/main/java/com/matchajob/matching/controller/MatchController.java`
- `backend/src/main/java/com/matchajob/matching/service/MatchingService.java`
- `backend/src/main/java/com/matchajob/client/AiWorkerClient.java`
- `backend/src/main/java/com/matchajob/common/exception/GlobalExceptionHandler.java`
- `backend/pom.xml`
- `ai-worker/app/main.py`
- `ai-worker/app/api/health.py`
- `ai-worker/app/api/cv.py`
- `ai-worker/app/schemas/ai.py`
- `.env.example`
- `compose.yaml`
- `frontend/src/services/mockStore.js`
- `frontend/src/services/data.js`
- Workbook: sheets `Phân Công`, `Tasks tuần`, `Bảng Tasks`, `Nội Dung Dự Án`, `Công Nghệ Ứng Dụng`.
