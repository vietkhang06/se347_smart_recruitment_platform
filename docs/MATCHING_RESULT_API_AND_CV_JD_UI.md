# SE347 — Matching API Integration + Result UI + Contract Test

Cập nhật: 27/10/2026. Phạm vi: task Việt Khang trong ảnh. Bản nền là ZIP `se347_smart_recruitment_platform-main.zip` đã gửi, không phải dự án SE121/MidCV hoặc SE373 review agent.

## Luồng đã triển khai

1. Recruiter tải danh sách hồ sơ qua `GET /api/v1/employer/applications`.
2. Mở chi tiết dùng Application ID thật; MatchingResultPanel gọi `GET /api/v1/applications/{applicationId}/match`.
3. `POST` cùng URL chạy matching đồng bộ qua Worker `/api/v1/match/score`; không nhận CV/JD hoặc Job ID từ client.
4. Backend lấy Job và CV snapshot bất biến từ DB. Worker request/response dùng snake_case; API cho FE dùng camelCase.
5. Transaction ngắn claim job dưới khóa application; HTTP Worker nằm ngoài transaction. Transaction khác lưu result + trạng thái job + application.match_score cùng lúc. Lease 120 giây, Worker timeout mặc định 60 giây, FE POST timeout 75 giây.
6. GET đọc lại dữ liệu DB. Completed POST là idempotent: trả kết quả đã lưu, không tự chấm lại.

Không có matching queue consumer mới. PENDING nghĩa đã có việc chờ; nhấn Chạy đối sánh mới gọi POST. GET không khởi động Worker. Tự poll chỉ khi PROCESSING (mỗi 3s, tối đa 40 lượt), có tải lại thủ công.

## Trạng thái và dữ liệu

| API status | UI | Score | POST |
|---|---|---|---|
| NOT_STARTED | Chưa chạy đối sánh | null | Có thể bắt đầu |
| PENDING | Đang chờ xử lý (queued) | null | Có thể chạy nếu retryable và đã qua retryAfter |
| PROCESSING | Đang xử lý | null | Chặn request trùng; GET theo dõi |
| COMPLETED | Hoàn tất | overallScore bắt buộc số nguyên 0..100; tiêu chí có thể null | Trả result cũ |
| FAILED | Xử lý thất bại | null | Dừng; không tự reset số lần thử |

`PENDING` là enum canonical tương ứng từ queued trong task. Không phát minh thêm QUEUED hoặc ERROR vào enum Backend. Lỗi tải HTTP/schema được giữ riêng ở FE.

Response bắt buộc có `applicationId`, `jobId`, `cvVersionId`, `status`, `overallScore`, `skillsScore`, `experienceScore`, `criteriaScores`, `matchedSkills`, `missingSkills`, `breakdown`, `explanation`, `processingJobId`, `evaluatedAt`, `message`, `retryable`, `retryAfter`, `attemptCount`, `maxAttempts`.

- Schema: `docs/contracts/schemas/matching-result.schema.json`.
- `breakdown` là object; danh sách skill là array string; không đổi null score thành 0.
- Score/boolean/string coercion từ Worker bị từ chối trước khi map Java DTO.
- Khi chưa COMPLETED: score/explanation/evaluatedAt null; breakdown/criteriaScores rỗng; skill arrays rỗng.
- COMPLETED không retry. Processing metadata của completed response có thể null vì endpoint trả result entity đã lưu.
- `evaluatedAt` được chốt độ chính xác microsecond để POST/GET không lệch do PostgreSQL làm tròn nanosecond.
- Không gửi raw CV, đường dẫn file nội bộ hoặc exception của Worker trong matching response.

## Lỗi và retry

| HTTP/code | Nghĩa | Hành động |
|---|---|---|
| 401 | Chưa đăng nhập/token không hợp lệ | Đăng nhập |
| 403 | Không sở hữu hồ sơ/Job | Kiểm tra quyền |
| 404 | Không có application/Job | Kiểm tra ID |
| 409 MATCHING_NOT_READY | Snapshot/raw CV chưa sẵn sàng | Đợi extraction, tải trạng thái rồi thử |
| 409 MATCHING_IN_PROGRESS | Đang có attempt sở hữu job | Chỉ GET |
| 409 MATCHING_BACKOFF | Chưa tới retryAfter | Đợi mốc thời gian |
| 409 MATCHING_RETRY_EXHAUSTED | Job FAILED/hết lần thử | Kiểm tra dịch vụ; không tự xóa/reset job |
| 409 MATCHING_STATE_CONFLICT / MATCHING_LEASE_LOST | Trạng thái không nhất quán/lease đổi | Tải lại, kiểm tra log |
| 502 MATCHING_WORKER_UNAVAILABLE | Worker mất kết nối/HTTP lỗi | GET lại trạng thái; retry theo metadata |
| 502 MATCHING_WORKER_REJECTED | Worker trả lỗi 4xx không tạm thời | Sửa request/integration; không retry tự động |
| 502 MATCHING_WORKER_SCHEMA_ERROR | Worker trả JSON không đúng contract | Sửa mismatch; không lưu điểm giả |

Connection error, HTTP 429 hoặc 5xx của Worker là lỗi có thể thử lại. Sau attempt 1 backoff 4s; attempt 2 backoff 8s; attempt 3 dừng FAILED. Worker 4xx khác hoặc sai schema là lỗi dừng. Metadata DB mới là nguồn quyết định có thử tiếp hay không.

Nếu browser timeout/hủy POST, Backend có thể vẫn xử lý. UI bắt buộc GET trạng thái trước khi POST tiếp. Lỗi HTTP được hiển thị, không thay bằng fixture. Đóng modal/đổi hồ sơ hủy request FE và bỏ response cũ.

## Cấu hình

Local frontend: trong `frontend/.env.local` đặt `VITE_DATA_SOURCE=api` và `VITE_API_BASE_URL=http://localhost:8081/api` (đổi cổng nếu chạy Backend trực tiếp 8080). Khởi động lại Vite sau khi đổi env.

Compose truyền VITE_DATA_SOURCE mặc định api. Không bật `ai-stub` profile khi nghiệm thu. `VITE_MATCHING_FIXTURE_FALLBACK` không còn được sử dụng. Matching fixtures chỉ phục vụ test, không được import trong runtime API adapter.

Worker provider/scoring algorithm được giữ nguyên. Source hiện vẫn dùng DeterministicTestProvider cho matching, kể cả lớp OpenAIProvider; không khẳng định đã gọi API LLM bên ngoài. Việc thay scoring provider cần phối hợp owner AI, ngoài phạm vi adapter/UI/contract.

## Kiểm thử

Đọc hướng dẫn từng lệnh trong `docs/MATCHING_TASK_COPY_GUIDE_VI.md`. Script live tạo tài khoản và tài nguyên test thật qua HTTP, dùng CV DOCX tự sinh, không chèn điểm bằng SQL, không dùng stub server. Kết quả được in theo test case và ghi summary.json; lỗi làm exit code khác 0; ca chưa chạy được ghi NOT_RUN và kết quả PARTIAL.

Phân biệt: unit/component test cô lập; contract kiểm tra schema/Java serialization/FE validator; live acceptance kiểm tra HTTP qua DB và Worker. Chạy unit không được suy ra live PASS.
