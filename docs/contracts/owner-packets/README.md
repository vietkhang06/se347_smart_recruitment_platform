# Owner contract packets

Các packet này được chuẩn bị từ workbook phân công và source đã rà; chúng **chưa phải phản hồi do owner cung cấp**. Mỗi owner hãy sửa/điền phần quyết định và xác nhận trong packet của mình, sau đó điều phối cập nhật master contract.

| File | Owner chính (theo workbook) | Nội dung |
|---|---|---|
| `auth.md` | Phúc Khang | Register/login/me, JWT claims, RBAC |
| `job.md` | Vua Thanh Hóa – Aka HGK | Job search/detail/manage, Category/Skill |
| `cv-storage-processing.md` | Tiểu pro + Đại Hưng | Upload/download/version, processing status and execution |
| `application-matching.md` | Đại Hưng | Apply/state/history, matching response/status |
| `ai-worker.md` | Khải Vạn (display name to confirm) | FastAPI schema/health/scoring/timeout interactions |
| `frontend-adapters.md` | PN Thông + Khanh | Screen-to-endpoint map and consumer review |

Mẫu phản hồi của owner:

```text
Domain:
Owner:
Review status: Agree | Change requested | Not in MVP
Confirmed routes:
Request/response changes:
Business rules:
Fixture/test evidence:
Open blockers:
Reviewer:
Date:
PR/commit/evidence:
```
