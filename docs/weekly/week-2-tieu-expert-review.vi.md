# Tự phản biện chuyên gia — Task CV Tuần 2

Ngày 20/10/2026. Áp dụng prompt tại week-2-tieu-expert-review-prompt.vi.md trên diff của base 350e74a và bằng chứng kiểm thử thực tế. Đây là vòng tự review của cùng tác nhân triển khai, không thay thế peer review của thành viên khác.

## 1. Kết luận

Phần Backend CV đã đáp ứng nghiệp vụ task ở mức module MVP: upload, lưu/checksum/object key, nhiều phiên bản, active selection, download/preview, quyền candidate/employer/admin, audit admin và xử lý trạng thái bất đồng bộ. Đã có bằng chứng unit/HTTP/DB và container persistence; không chỉ dựa vào source hoặc checklist.

Chưa chấp nhận kết luận production-ready hoặc pipeline build sạch đã hoàn tất: build từ source bên trong Docker gặp lỗi DNS Maven; Worker/LLM thật và frontend candidate gọi API thật chưa được kiểm chứng trong task này.

## 2. Đối chiếu tiêu chí

| Tiêu chí | Nhận xét | Bằng chứng |
|---|---|---|
| Validation và storage | Đạt trong phạm vi type/package/size/name/SHA-256; có cleanup file tạm và cleanup khi đăng ký metadata lỗi | CvStorageService.java:57, :126, :183; CvStorageServiceTest; HTTP DOCX 202, sai MIME/DOCX 400, oversize 413 |
| Version và active | Đạt; bản mới không ghi đè, chọn lại bản cũ, partial unique index và candidate lock | CvRegistrationService.java:29, :57; V6__cv_active_version.sql; CvStorageIT.java:34 và :80 |
| Quyền truy cập | Đạt policy đã chốt; employer phải có đúng snapshot; admin read-only có audit | ResourceOwnershipService.checkCvVersionAccess; CvStorageIT.java:53; CvSecurityHttpTest.java:46, :53, :63 |
| Stream và privacy | Đạt; không trả physical path/raw CV; file response stream, no-store, nosniff; che lease/raw job errors | CvController.java:141; ProcessingJobResponse.java:11; CvHttpContractTest; CvQueueTest |
| Job và trạng thái | Đạt các tình huống đã kiểm tra; consumer CV riêng, retry/terminal state/lease recovery; kết quả lưu qua transaction bean riêng | CvProcessingPersistenceService.java:41, :62, :74; CvProcessingIT.java:296, :312; runtime Worker vắng mặt dẫn đến 3 attempts và FAILED đồng bộ |
| Migration và rollback | Đạt trên PostgreSQL thật; Flyway V1–V6, backfill legacy và unique index, lỗi embedding không để raw/parsed data tồn tại một phần | 10 Failsafe tests; CvStorageIT.java:80; CvProcessingIT.java:296 |
| Build/test | Đạt JAR và các test đã chọn; clean Docker source build chưa đạt do môi trường | 310 Surefire + 10 Failsafe; mvnw package BUILD SUCCESS; Docker Maven DNS failure |
| Persistence | Đạt với runtime image của đúng JAR đã test | test-cv-storage.ps1: PASS trước/sau Backend recreate; hash JAR host/container giống nhau; appuser uid=100 |

Đường dẫn lớp trong bảng nằm tại backend/src/main/java/com/matchajob/ hoặc backend/src/test/java/com/matchajob/cv/ tương ứng. Báo cáo triển khai có đầy đủ lệnh, route, config và bảng nghiệm thu.

## 3. Các điểm còn mở theo ưu tiên

### P1 — Clean source build trong Docker

- Bằng chứng: backend/Dockerfile:5, bước dependency:go-offline thất bại với repo.maven.apache.org: Name does not resolve.
- Tác động: chưa chứng minh một máy sạch/CI có thể tạo image trực tiếp từ source bằng Dockerfile chính trên môi trường này.
- Hành động/owner: Tiểu pro/DevOps khôi phục khả năng phân giải và tải Maven trong build network, chạy lại docker compose build. Không thay lỗi này bằng kết luận pass của image fallback.

### P1 — Tích hợp sản phẩm hoàn chỉnh còn thuộc các module khác

- Frontend: frontend/src/services/candidateWorkspace.js:100 vẫn lưu CV qua IndexedDB. PN Thông cần adapter multipart/Bearer JWT, danh sách/active version và dùng CV UUID thật khi nộp application; phối hợp Tiểu pro.
- AI: CvProcessingIT dùng AiWorkerClient mock; stack test storage không có Worker. Đại Hưng và Khải Vạn cần chạy integration với Worker/provider thật và đánh giá kết quả extraction/embedding. Runtime failure/retry đã được kiểm tra nhưng không đồng nghĩa Worker thật xử lý thành công.

Hai điểm này ngăn kết luận toàn website hoàn chỉnh, không phủ nhận chức năng Backend CV vừa được kiểm chứng.

### P2 — Điều kiện trước production

- CvStorageService kiểm tra ZIP/package DOCX và giới hạn tài nguyên; chưa có malware scanner hoặc validator toàn bộ PDF/OOXML. Không quảng bá mức bảo vệ vượt quá cơ chế đã có.
- CV download đã stream nhưng AiWorkerClient vẫn nhận byte[] theo giới hạn upload. Cần đo tải đồng thời và đặt giới hạn tài nguyên trước khi tăng dung lượng hoặc mở public.
- Lease CV hiện 120 giây và consumer xử lý tuần tự theo fixed delay. Token bảo vệ dữ liệu khỏi commit của worker cũ; cần đo thời gian AI thực tế trước khi điều chỉnh throughput/lease hoặc thêm heartbeat.
- Cần peer review tập trung vào migration V6, admin policy/audit và các hàm CV-specific trong shared processing/security. Không đánh giá đóng góp cá nhân bằng số file/commit.

## 4. Bằng chứng kiểm thử

- Host package: 310 tests, 0 failures/errors/skipped, JAR được tạo.
- DB integration: 10 tests, 0 failures/errors/skipped trên PostgreSQL 16.15 riêng.
- HTTP thật: register/login bằng tài khoản tổng hợp; upload hai PDF, active selection, preview/checksum; cả hai file còn sau recreate. DOCX hợp lệ 202, ZIP giả DOCX 400, MIME sai 400, oversize 413, CV không tồn tại 404.
- Container: Backend và PostgreSQL healthy; Backend non-root. Hash JAR giống nhau: 55f0e72409dee87e41bf54273104e96e85eb551135daa3b2274be1928e30f95c.
- Cấu hình/định dạng: hai Compose config, JSON fixture, cú pháp script PowerShell và git diff --check đều đạt.

## 5. Đề nghị nghiệm thu

Có thể nghiệm thu chức năng module CV và đưa diff vào peer review. Ghi P1 Docker build vào blocker môi trường/CI; giao các task frontend và AI integration theo đúng owner. Không đánh dấu toàn bộ hệ thống hoặc production là hoàn thành từ 320 test và một luồng persistence.

Không commit/push/merge. Dữ liệu kiểm thử là tổng hợp và stack dùng port/volume riêng; không có CV cá nhân được thêm vào Git.
