# Owner packet — CV storage / processing

- **Owners theo workbook:** Tiểu pro (storage/upload/download/Docker) + Đại Hưng (CV API, workflow, AI integration)
- **Reviewer đề xuất:** Phúc Khang, Khải Vạn, Việt Khang
- **Trạng thái:** một số CV/processing routes có trong source; ownership guard/download/executor/public DTO cần chốt.

## Routes/fixtures

| Route/shape | Source status | Fixture |
|---|---|---|
| `POST /api/v1/candidates/{candidateId}/cv?sync=false` | Có; actual mapping `/v1/candidates` cộng context `/api`; trả snake_case | `../fixtures/cv-upload-response-current.json` |
| Target upload `POST /api/v1/candidates/me/cvs` | Chỉ đề xuất; chưa có exact route | `../fixtures/cv-upload-accepted-response.json` |
| `GET /api/v1/candidates/{candidateId}/cv` | Có list route | Cần list DTO fixture |
| `GET /api/v1/candidates/{candidateId}/cv/{cvVersionId}` | Có; response trả entity `CvVersion` | Cần target DTO; không trả `filePath` |
| Download file route | Chưa tìm thấy endpoint riêng | Owner quyết định route/content-disposition/range support |
| `GET /api/v1/processing-jobs/{id}` | Có; trả entity `ProcessingJob` trực tiếp | Cần safe public DTO fixture |

## Source facts

- `CvStorageService` giới hạn 10 MiB, chỉ nhận PDF/DOCX dựa vào extension và magic bytes.
- AI Worker extractor cũng giới hạn 10 MiB; PDF tối đa 20 trang.
- Upload mặc định `sync=false`, tạo `ProcessingJob`; `processSingleJob()` chỉ được gọi trực tiếp khi `sync=true` trong controller. Không thấy scheduler/poller gọi `claimNextJob()` hoặc `recoverExpiredLeases()` trong source đã rà.
- `CvController` response current uses `cv_version_id`, `candidate_id`, `file_name`, `file_size_bytes`, `processing_job_id`; mục tiêu public DTO dự kiến dùng camelCase.
- GET version hiện trả entity có `filePath`; ProcessingJob entity chứa `leaseToken`/`lastError`, không nên public-return raw.

## Quyết định bắt buộc

1. Candidate ID từ authenticated principal, không tin `candidateId` tùy ý; kiểm tra quyền trước list/detail/download.
2. Storage persistence/volume và file naming; download content type/filename; không expose local disk path.
3. Dùng sync CV parse cho vertical slice hay xây consumer/poller thật cho async.
4. Error mapping cho empty, unsupported/corrupt file, >10 MiB, PDF >20 pages, AI Worker unavailable, retry exhausted.
5. Quy tắc retry/idempotency key, max attempts, visibility of failed state.

## Acceptance criteria

- PDF/DOCX hợp lệ được lưu đúng; empty/invalid/oversize bị từ chối.
- CV chỉ hiện với chủ sở hữu hoặc role đã được phép.
- Response không chứa path/secret/internal lease fields.
- Trạng thái `202`/`queued` chỉ dùng nếu executor thực sự xử lý; integration test chứng minh `PENDING → PROCESSING → COMPLETED/FAILED`.
- Fixture current-vs-target được giữ và test không che giấu divergence.

## Owner response

- Status: `Pending`
- Decision async or sync:
- Download route/response:
- Ownership rule:
- Retry/executor evidence:
- Reviewer/date/PR:
