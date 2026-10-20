# Báo cáo triển khai và tự đánh giá Tuần 2 — CV Storage, Upload/Download, Version Management

Ngày: 20/10/2026. Repository: D:\UIT-2026_2027_HK1\Cn web\DoAnCuoiKy\20-10\se347_smart_recruitment_platform. Base commit: 350e74a, nhánh main.

## 1. Phạm vi và căn cứ

Áp dụng prompt week-2-tieu-cv-storage-implementation-prompt.en.md và hàng công việc của Tiểu pro trong ảnh người dùng: upload multipart; MIME/dung lượng/tên/checksum; object key và metadata; nhiều phiên bản, active version và trạng thái xử lý; download/preview theo quyền candidate, employer qua application, admin; kiểm thử và Docker volume.

Khi bắt đầu lượt này, working tree đã có thay đổi từ lượt trước: truy vấn employer theo đúng application snapshot, hai unit test, implementation/evaluation prompt và báo cáo cũ. Những phần đó được tiếp tục giữ và mở rộng. Không commit/push/merge. Không sửa module AI parsing/scoring, nghiệp vụ ứng tuyển hoặc frontend của thành viên khác.

## 2. Hiện trạng trước triển khai và khoảng thiếu thực tế

| Phần | Đã có | Khoảng thiếu |
|---|---|---|
| Upload | CvController, CvStorageService, SHA-256, file tạm, registration/job | DOCX chỉ nhận ZIP header; chưa giới hạn filename theo cột DB |
| Versions | Mỗi upload tạo UUID/object key/row riêng, list theo created_at, application snapshot | Chưa có active selection cho yêu cầu tuần 2 |
| Download | Route và ownership, header filename/no-store | Đọc cả file vào byte[] |
| Employer access | Đã sửa từ lượt trước theo CV snapshot | Cần kiểm chứng SQL với PostgreSQL thật |
| Admin | Chưa có policy đọc CV | Cần read-only và audit bền vững |
| Processing | Orchestrator, retry service, bảng job | Chưa có consumer async cho sync=false; CV không cập nhật failed; self-invocation làm @Transactional không có hiệu lực ở bước lưu kết quả |
| Docker | Named CV volume, configurable upload directory | Chưa có bằng chứng recreate trong lượt trước |
| Frontend | CandidateCV/candidateWorkspace | Vẫn dùng IndexedDB demo; không phải bằng chứng tích hợp Backend |

Các file căn cứ: backend/src/main/java/com/matchajob/cv/, processing/, security/ResourceOwnershipService.java, frontend/src/services/candidateWorkspace.js, migration V3 và compose.yaml.

## 3. Những thay đổi đã triển khai

### 3.1 Upload và file storage

CvStorageService:
- Giữ route multipart, loại PDF/DOCX, kiểm tra MIME/extension và file size cả khi đọc stream.
- Từ chối tên hiển thị dài hơn 255 ký tự, giới hạn cấu hình phải hợp lệ và vừa kiểu metadata hiện có.
- DOCX phải là ZIP đọc được và có [Content_Types].xml, _rels/.rels, word/document.xml. Không extract archive; tối đa 2048 entries, tổng nội dung giải nén không quá min(10 × upload limit, 100 MiB).
- Chuẩn hóa storage root bằng real path; từ chối object key vượt root và symlink dẫn ra ngoài.
- SHA-256 tính trong khi ghi stream; file tạm được xóa nếu validation thất bại. Fallback khi filesystem không hỗ trợ atomic move không dùng REPLACE_EXISTING.
- Thêm loadResource để download stream; readFile vẫn được giữ cho AI client hiện đang nhận byte[].

Đây là validation package tối thiểu, không phải malware scanner hay validator đầy đủ mọi cấu trúc PDF/OOXML. PDF hỏng bên trong vẫn có thể bị parser AI từ chối sau upload.

### 3.2 Active version và schema

Migration mới V6__cv_active_version.sql thêm cv_versions.is_active, chọn bản mới nhất cho dữ liệu hiện có và tạo partial unique index uq_cv_versions_active_candidate.

CvRegistrationService khóa row candidate trong transaction, bỏ active cũ rồi đăng ký bản mới active. Thao tác chọn lại bản cũ dùng cùng khóa và transaction. Không ghi đè file, không thay đổi application_cv_snapshots. Active là bản ứng viên đang chọn, độc lập với trạng thái AI; bản có AI failed vẫn có thể tải được.

CvVersionResponse và CvUploadResponse bổ sung is_active; giữ nguyên các trường và route cũ. Không thêm numeric version number: UUID là định danh phiên bản.

### 3.3 Download, quyền truy cập và admin

CvController trả Resource để Spring stream nội dung; giữ MIME, UTF-8 Content-Disposition và no-store, thêm nosniff. Object mất trả 404 an toàn.

Candidate chỉ truy cập bản thuộc profile của mình. Employer chỉ xem version được snapshot trong application thuộc job họ quản lý; truy vấn cũng kiểm tra candidate của application khớp candidate của CV.

Admin chỉ được đọc metadata/download/preview version cụ thể. CvAccessAuditService ghi audit_logs trước khi trả dữ liệu; nếu ghi audit lỗi thì response bị từ chối. Audit có action, actor và CV ID, không có nội dung CV/đường dẫn storage. Status authorized có nghĩa là quyền đã được cấp, không xác nhận tải stream hoàn tất. Admin không được upload, list CV của candidate hoặc đổi active qua các API này.

### 3.4 Job nền, trạng thái và transaction

CvProcessingScheduler chạy mặc định, chỉ claim CV_TEXT_EXTRACTION; không lấy job matching/tuyển dụng của module khác. Mặc định mỗi 2000 ms xử lý một job.

ProcessingJobService/CV repository hỗ trợ claim PENDING bằng FOR UPDATE SKIP LOCKED, lease token 120 giây và ngăn gọi sync khởi động lại job hoàn tất/chiếm lease khác.

CvProcessingPersistenceService là Spring bean riêng:
- Complete: CV raw text/parsed data, embedding và COMPLETED nằm trong cùng transaction.
- Fail: job FAILED thì CV failed; job được retry PENDING thì CV vẫn uploaded.
- Worker hết lease được phục hồi; hết attempts thì FAILED và đồng bộ CV.
- Token cũ không được ghi đè attempt mới.
- Lỗi public không chứa raw HTTP/SQL/path từ worker.

ProcessingJobController trả DTO: giữ progress field hiện có, bỏ leaseToken/leaseExpiresAt/idempotencyKey, làm an toàn lastError. AI Worker và thuật toán chấm điểm giữ nguyên.

### 3.5 Docker và hỗ trợ kiểm thử

compose.yaml mount named CV volume theo đúng đường dẫn MATCHAJOB_UPLOAD_DIR. .env.example có CV limits và cấu hình poller. Mặc định Docker /data/cv đã được Dockerfile cấp quyền cho appuser; nếu thay mount path phải bảo đảm quyền filesystem tương ứng. Khi chạy Java trực tiếp trên Windows, dùng target/uploads/cv.

scripts/compose.cv-test.yaml cung cấp stack test PostgreSQL/Backend riêng, port 15433 và 18081, volumes tách biệt khỏi dự án chính.

scripts/test-cv-storage.ps1 tạo PDF tổng hợp hợp lệ, upload hai bản, list, chọn active bản cũ, so checksum và header preview; tùy chọn RecreateBackend kiểm tra tải lại cả hai bản sau recreate. Script không xóa DB/volume và không in JWT.

## 4. Contract và luồng áp dụng

| Nghiệp vụ | Route sau context /api | Kết quả |
|---|---|---|
| Upload | POST /api/v1/candidates/{candidateId}/cv | 202, cv_version_id, processing_job_id, status, is_active |
| List | GET /api/v1/candidates/{candidateId}/cv | 200, metadata versions của owner |
| Metadata | GET /api/v1/candidates/{candidateId}/cv/{cvVersionId} | 200, không lộ file_path/raw_text/parsed_data |
| Download/preview | GET /api/v1/candidates/{candidateId}/cv/{cvVersionId}/download?disposition=attachment\|inline | 200 stream hoặc 401/403/404 |
| Bản đang chọn | GET /api/v1/candidates/{candidateId}/cv/active | 200 hoặc 404 nếu chưa có |
| Chọn bản | PUT /api/v1/candidates/{candidateId}/cv/{cvVersionId}/active | 200, candidate owner only |
| Theo dõi job | GET /api/v1/processing-jobs/{id} | DTO progress theo ownership hiện có |

Frontend sử dụng API theo thứ tự: lấy profile ID từ authenticated profile → upload multipart → nhận job ID → poll progress/metadata → list hoặc lấy active CV → nộp application với cvVersionId đã chọn → download bằng Bearer JWT. Application API vẫn yêu cầu cvVersionId rõ ràng; không tự đổi snapshot theo active version.

## 5. Kiểm thử đã chạy

| Lệnh/kiểm tra | Kết quả đã có | Bằng chứng/giới hạn |
|---|---|---|
| backend: .\mvnw.cmd -B -ntp package | Pass | 310 tests, 0 failures/errors/skipped; BUILD SUCCESS, tạo target/backend-1.0.0.jar |
| docker compose config --quiet | Pass | Cấu hình chính render hợp lệ |
| docker compose -f scripts/compose.cv-test.yaml config --quiet | Pass | Cấu hình stack kiểm thử riêng hợp lệ |
| PowerShell Parser cho test-cv-storage.ps1 | Pass | Không có syntax error; chưa thay thế runtime smoke |
| docker info ban đầu / compose build ban đầu | Fail do môi trường | Không có pipe dockerDesktopLinuxEngine; đã thử khởi động Desktop, người dùng mở engine sau đó |
| docker info sau khi engine hoạt động | Pass | ServerVersion 29.7.2 |
| backend: test-compile '-Dit.test=CvStorageIT,CvProcessingIT' failsafe:integration-test failsafe:verify | Pass | 10 tests, 0 failures/errors/skipped; PostgreSQL 16.15 thật tại port 15433, AI client mock |
| docker compose -f scripts/compose.cv-test.yaml up -d --build | Fail do DNS trong container | backend/Dockerfile bước mvn dependency:go-offline: repo.maven.apache.org: Name does not resolve. Không ghi nhận build từ source trong Docker là pass |
| docker build -f scripts/Dockerfile.cv-test -t matchajob-cv-week2-test-backend backend/target | Pass | Image runtime dùng JAR đã build/test trên host; không thay Dockerfile sản xuất |
| docker compose -f scripts/compose.cv-test.yaml up -d --no-build backend | Pass | Backend và database healthy; Backend chạy uid=100(appuser) |
| scripts/test-cv-storage.ps1 -CandidateId <synthetic profile> -BaseUrl http://localhost:18081/api -ComposeFile scripts/compose.cv-test.yaml -RecreateBackend | Pass | Upload hai bản, list, active, inline headers, checksum; cả hai object vẫn tải được và checksum không đổi sau recreate |
| Multipart HTTP bổ sung với synthetic candidate | Pass | DOCX hợp lệ 202; DOCX giả ZIP 400; MIME sai 400; file 10 MiB + 1 byte 413; CV không tồn tại 404 |
| SELECT cv.status, cv.is_active, job.status, job.attempt_count trên DB stack test | Pass | Hai PDF đầu tiên vẫn còn, một active; Worker không chạy nên scheduler thử 3 lần rồi CV failed / job FAILED đúng contract |
| sha256sum /app/app.jar đối chiếu Get-FileHash backend/target/backend-1.0.0.jar | Pass | Cùng SHA-256: 55f0e72409dee87e41bf54273104e96e85eb551135daa3b2274be1928e30f95c |
| git diff --check, parse JSON fixture, parse script PowerShell | Pass | Không lỗi whitespace, JSON hoặc cú pháp script ở lần kiểm tra cuối |

Surefire package chạy 310 unit/slice/MockMvc; Failsafe chạy riêng 10 DB integration. Migration V1–V6 được áp dụng thành công. Test thêm dùng script V6 thật trên schema legacy tạm (rollback sau test), xác nhận backfill bản mới nhất và unique index. Không gộp test AI mock thành bằng chứng Worker/LLM thật.

Test mới/sửa: CvStorageServiceTest, CvControllerTest, CvHttpContractTest, CvSecurityHttpTest, CvProcessingPersistenceServiceTest, CvQueueTest, CvStorageIT và CvProcessingIT. MockMvc test thật multipart/storage/stream hoặc JWT/filter, nhưng metadata/ownership có mock theo từng lớp. DB IT dùng AI client mock, không kiểm chứng chất lượng LLM thật.

## 6. Hướng dẫn tái kiểm chứng

Từ repository root:

~~~powershell
docker compose -f scripts/compose.cv-test.yaml up -d --build
docker compose -f scripts/compose.cv-test.yaml ps
~~~

Nếu Docker không tải được Maven do DNS như lần kiểm thử này, dùng artifact đã kiểm thử trên host để xác minh runtime:

~~~powershell
# Từ root; backend/target/backend-1.0.0.jar được tạo bởi mvnw package đã đạt.
docker build -f scripts/Dockerfile.cv-test -t matchajob-cv-week2-test-backend backend/target
docker compose -f scripts/compose.cv-test.yaml up -d --no-build backend
~~~

Cách fallback chỉ xác minh runtime của JAR đó. Dockerfile build từ source vẫn phải chạy thành công ở môi trường CI/DevOps có DNS đúng trước khi xác nhận pipeline clean build.

Chạy integration trên DB test riêng:

~~~powershell
Set-Location backend
$env:SPRING_TEST_DATASOURCE_URL = 'jdbc:postgresql://localhost:15433/matchajob_test'
.\mvnw.cmd -B -ntp '-Dit.test=CvStorageIT,CvProcessingIT' failsafe:integration-test failsafe:verify
~~~

Tạo tài khoản candidate tổng hợp qua auth/register của stack test (email example.invalid, mật khẩu test tự sinh, role CANDIDATE), login lấy access_token và GET /api/v1/candidates/profile lấy profile ID. Không dùng CV cá nhân.

~~~powershell
# Nếu đang đứng trong backend sau block test ở trên:
Set-Location ..
$cvBase = 'http://localhost:18081/api'
$cvEmail = 'cv-check-' + [Guid]::NewGuid().ToString('N') + '@example.invalid'
$cvPassword = 'CVtest!' + [Guid]::NewGuid().ToString('N')
$null = Invoke-RestMethod -Method Post -Uri "$cvBase/v1/auth/register" -ContentType 'application/json' -Body (@{email=$cvEmail;password=$cvPassword;role='CANDIDATE'} | ConvertTo-Json)
$cvLogin = Invoke-RestMethod -Method Post -Uri "$cvBase/v1/auth/login" -ContentType 'application/json' -Body (@{email=$cvEmail;password=$cvPassword} | ConvertTo-Json)
$env:MATCHAJOB_TEST_TOKEN = $cvLogin.access_token
$cvProfile = Invoke-RestMethod -Uri "$cvBase/v1/candidates/profile" -Headers @{Authorization="Bearer $($cvLogin.access_token)"}
.\scripts\test-cv-storage.ps1 -CandidateId $cvProfile.id -BaseUrl $cvBase -ComposeFile 'scripts/compose.cv-test.yaml' -RecreateBackend
Remove-Item Env:MATCHAJOB_TEST_TOKEN
docker compose -f scripts/compose.cv-test.yaml logs --tail 80 backend
docker compose -f scripts/compose.cv-test.yaml stop
~~~

Không dùng down -v hoặc reset database để chứng minh persistence.

## 7. Tự review và điều kiện nghiệm thu

Prompt phản biện đầy đủ: week-2-tieu-expert-review-prompt.vi.md. Prompt đánh giá tiếng Anh: week-2-tieu-cv-evaluation-prompt.en.md.

Các giới hạn cần phân biệt:
- Backend CV không còn chỉ là UI/mock. Frontend candidate hiện vẫn dùng IndexedDB; adapter UI gọi API thật thuộc công việc tích hợp frontend.
- DOCX kiểm tra package có giới hạn tài nguyên; không tuyên bố chống mọi loại tài liệu độc hại.
- AI client vẫn đọc file vào RAM theo giới hạn upload; download HTTP đã stream. Chưa đo tải lớn/concurrency production.
- Không thay thuật toán AI; cần cấu hình provider/credential của owner AI khi kiểm thử Worker thật.
- PostgreSQL/Flyway, transaction rollback, lease recovery và recreate container đã có bằng chứng chạy. Phần clean source build trong Docker vẫn bị DNS ở bước Maven, cần owner DevOps xử lý môi trường/CI.

## 8. Bảng nghiệm thu task và bằng chứng định vị

| Tiêu chí | Kết luận | Bằng chứng |
|---|---|---|
| Upload, MIME/size/name/signature/SHA-256 | Đạt trong phạm vi validation đã định nghĩa | CvStorageService.java:57 và :183; CvStorageServiceTest; HTTP 202/400/413 thực tế |
| Không ghi đè, active selection, list versions | Đạt | CvRegistrationService.java:29 và :57; migration V6; CvStorageIT.java:34 và :80 |
| Download/preview stream và lỗi missing object | Đạt | CvController.java:141; CvStorageService.java:126; MockMvc và HTTP checksum/missing 404 |
| Candidate/employer/admin access | Đạt cho policy đã định nghĩa | ResourceOwnershipService.checkCvVersionAccess; CvController.java:181; CvAccessAuditService.java:16; CvStorageIT.java:53; CvSecurityHttpTest.java:46, :53, :63 |
| Async consumer, retry, failed status, atomic results | Đạt qua unit + DB, và runtime khi Worker vắng mặt | CvProcessingScheduler.java:27; CvProcessingPersistenceService.java:41, :62, :74; CvProcessingIT.java:296 và :312; runtime job FAILED sau 3 attempts |
| CV tồn tại sau recreate container | Đạt với image runtime JAR đã kiểm thử | test-cv-storage.ps1 trả PASS trước/sau recreate; SHA-256 JAR host/container trùng |
| Build JAR, test, Compose config | Đạt | 310 Surefire + 10 Failsafe; config của hai Compose hợp lệ |
| Clean Docker source build | Chưa đạt trên môi trường này | Maven trong Docker không phân giải repo.maven.apache.org; runtime fallback được ghi riêng |
| AI Worker/LLM thật thành công | Chưa xác minh, thuộc tích hợp AI | DB test dùng AiWorkerClient mock; stack kiểm thử storage không khởi động Worker |
| Frontend candidate gọi CV API thật | Ngoài phạm vi thay đổi lần này | frontend/src/services/candidateWorkspace.js:100 vẫn IndexedDB; cần frontend owner tích hợp theo contract |

Đọc toàn bộ đường dẫn source trong bảng tương đối với backend/src/main/java/com/matchajob/ hoặc backend/src/test/java/com/matchajob/cv/ tương ứng. Bản tự phản biện riêng: week-2-tieu-expert-review.vi.md.

## 9. Danh sách thay đổi để review

- CV source: controller, 2 response DTO, model, repository, storage/registration/orchestrator; thêm CvAccessAuditService, CvProcessingPersistenceService, CvProcessingScheduler.
- Shared integration: ResourceOwnershipService (snapshot đúng version), SecurityConfig (active routes/Content-Disposition), ProcessingJobRepository/Service (các hàm CV-specific, clear completed lease), ProcessingJobController + public DTO.
- Database/config: chỉ thêm migration V6; application.yml, application-test.yml, compose.yaml, .env.example.
- Tests: CvStorageServiceTest, CvControllerTest, CvHttpContractTest, CvSecurityHttpTest, CvQueueTest, CvProcessingPersistenceServiceTest, CvStorageIT, CvProcessingIT, ResourceOwnershipServiceTest.
- Docs/scripts: contract, fixture current, owner packet; 2 prompt tiếng Anh, prompt phản biện tiếng Việt, báo cáo và tự review; compose.cv-test.yaml, Dockerfile.cv-test, test-cv-storage.ps1.

Các thay đổi được để ở working tree để owner và reviewer kiểm tra. Không commit/push/merge; không xóa CV hoặc database của môi trường dự án chính.

Sau kiểm thử đã chạy docker compose -f scripts/compose.cv-test.yaml stop cho hai service test. Container và named volumes được giữ để tái kiểm chứng; không dùng down -v. Docker Desktop của người dùng vẫn giữ trạng thái đã mở.
