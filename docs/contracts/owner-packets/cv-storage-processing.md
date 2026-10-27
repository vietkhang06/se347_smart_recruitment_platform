# Owner packet — CV storage / processing

- Owners: Tiểu pro (storage/upload/download/Docker) + Đại Hưng (application, CV workflow, AI integration).
- Reviewer đề xuất: Phúc Khang, Khải Vạn, Việt Khang.
- Contract hiện hành: ../cv-storage-contract.md. Các nhận xét foundation cũ được thay bằng hiện trạng tuần 2; trạng thái nghiệm thu xem ../../weekly/week-2-tieu-cv-implementation-evaluation-report.vi.md.

## Routes và policy

| Route | Quyền | Kết quả |
|---|---|---|
| POST /api/v1/candidates/{candidateId}/cv | Candidate owner | Multipart, 202, job ID, CV UUID, is_active |
| GET /api/v1/candidates/{candidateId}/cv | Candidate owner | Public version metadata, mới nhất trước |
| GET /api/v1/candidates/{candidateId}/cv/{cvVersionId} | Owner / employer đúng application snapshot / admin audit | DTO; không trả path/raw CV |
| GET /api/v1/candidates/{candidateId}/cv/{cvVersionId}/download | Như metadata | Stream; disposition attachment/inline; no-store |
| GET /api/v1/candidates/{candidateId}/cv/active | Candidate owner | Active metadata hoặc 404 |
| PUT /api/v1/candidates/{candidateId}/cv/{cvVersionId}/active | Candidate owner | Chọn bản, không đổi application snapshot |
| GET /api/v1/processing-jobs/{id} | Ownership theo entity | Progress DTO, không lease/idempotency/raw errors |

## Quyết định tuần 2

1. Giữ API prefix, snake_case của CV DTO; API target /me/cvs trong fixture cũ vẫn chỉ là đề xuất, không đổi route đang hoạt động.
2. Mỗi upload tạo file/UUID riêng; bản mới active. Có thể chọn lại bản cũ. Migration V6 + partial unique index và candidate lock hỗ trợ một active version cho mỗi candidate.
3. Application vẫn nhận cvVersionId rõ ràng và lưu application_cv_snapshots; không lấy ngầm active version khi application đã nộp.
4. CvProcessingScheduler chỉ claim job CV; retry/failure và CV status được đồng bộ. Lưu kết quả qua CvProcessingPersistenceService có transaction riêng; không sửa Worker scoring/parsing.
5. Admin chỉ đọc CV cụ thể; audit_logs phải ghi được trước khi trả dữ liệu. Không cấp quyền upload/list/active selection cho admin.
6. Named CV volume dùng MATCHAJOB_UPLOAD_DIR, mặc định /data/cv. Có stack test riêng và script test-cv-storage.ps1 để kiểm tra recreate.

## Giới hạn cần giao tiếp với module khác

- Tuần 3: CandidateCV tách rõ mock/API; ApiProfileEditor dùng component API upload/list/active/download và polling. candidateWorkspace vẫn là IndexedDB **chỉ cho demo**, không dùng làm fallback API.
- Metadata CV có processing_job_id nullable để khôi phục theo dõi sau reload; API job giữ camelCase, metadata CV giữ snake_case. Danh sách dùng batch query, không thêm migration.
- PN Thông có thể tái dùng CandidateCV với candidateId lấy từ profile API; onChange trả cvId/cvName/cvSize, trong đó cvId là UUID backend thật. Luồng nộp application API đang bị tắt từ trước trong JobDetailPage: không tự bật hoặc thay bằng đơn mock trong task CV.
- Worker thật cần provider/credential phù hợp; DB integration dùng AiWorkerClient mock không đánh giá chất lượng AI.
- DOCX validation kiểm tra package/giới hạn giải nén, không phải malware scanner hoặc toàn bộ chuẩn OOXML.
- Trạng thái runtime/test tuần 3: ../../weekly/week-3-tieu-cv-api-progress-docker-report.vi.md. Không suy ra hoàn thành từ việc source tồn tại.
