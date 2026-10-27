# Hướng dẫn chép và nghiệm thu task Matching API — Việt Khang

## 1. Chép file

Gói bàn giao có thư mục `COPY_TO_PROJECT/`. Các file trong đó đều là **file hoàn chỉnh**, không phải đoạn code chèn tay.

1. Dừng Backend/Frontend đang chạy và sao lưu source hoặc commit working tree của bạn.
2. Mở thư mục gốc dự án, nơi có `backend/`, `frontend/`, `ai-worker/`, `compose.yaml`.
3. Chép **nội dung bên trong** COPY_TO_PROJECT vào đúng thư mục gốc đó; đồng ý Replace các file cùng đường dẫn. Không chép tạo thêm một tầng COPY_TO_PROJECT trong dự án.
4. Không có file nào bắt buộc phải xóa. Các fixture và mock khác giữ lại cho demo/test; luồng matching API đã bỏ import/fallback fixture.
5. Không chép `node_modules`, `target`, `.venv`, `.env` từ máy khác. Bản bàn giao không chứa những thư mục/file này.

Bản sửa dựa đúng ZIP source đã gửi ngày 26/10. `FILE_CHANGES.md` liệt kê mọi file thêm/sửa và `file-manifest.json` có SHA-256 trước/sau. Nếu nhóm đã sửa cùng các file sau thời điểm đó, đối chiếu trước khi ghi đè để giữ thay đổi mới của nhóm.

## 2. Chạy ứng dụng bằng Docker của nhóm

Giữ file `.env` và cấu hình DB/JWT hiện tại. Đặt/thêm dòng sau vào `.env` gốc nếu chưa có:

```dotenv
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:8081/api
```

Các cổng 8081/5173 là mặc định của Compose. Nếu nhóm đổi cổng, dùng cổng thật tương ứng.

PowerShell tại thư mục gốc:

```powershell
docker compose up -d --build
```

Nếu chạy Vite ngoài Docker, đặt hai dòng trên trong `frontend/.env.local`, sau đó:

```powershell
cd frontend
npm ci
npm run dev
```

Không cần sửa schema DB hay thêm Flyway migration cho task này. Bản sửa tận dụng các bảng/cột đã có. Backend vẫn cần PostgreSQL/pgvector theo cấu hình của nhóm.

## 3. Kiểm tra tự động

Yêu cầu Java 21 (JAVA_HOME đúng), Node phù hợp Vite 8 (Node 22.12+ hoặc 24), Python 3.11/3.12 và Maven Wrapper có thể tải dependency. Các lệnh dưới đây chạy từ thư mục gốc; mỗi khối cd xong trở lại gốc.

```powershell
cd backend
.\mvnw.cmd test
cd ..

cd frontend
npm ci
npm test
npm run build
cd ..

py -3.12 -m venv .venv-matching
.\.venv-matching\Scripts\python.exe -m pip install -r ai-worker\requirements.txt -r scripts\contract-tests\requirements.txt
cd ai-worker
..\.venv-matching\Scripts\python.exe -m pytest -q tests
cd ..

.\.venv-matching\Scripts\python.exe scripts\contract-tests\test_matching_contract.py --java-artifacts
```

`--java-artifacts` yêu cầu MatchScoreContractTest chạy thành công qua Maven trước đó. Test này xuất DTO Java thật vào backend/target/matching-contract; checker dùng JSON Schema và validator Frontend thật để kiểm tra payload. Không chỉ tìm tên field trong source.

POM đã cấu hình Byte Buddy agent lúc JVM khởi động, tránh phụ thuộc vào Mockito tự attach giữa chừng.

## 4. Nghiệm thu HTTP đầy đủ trên Docker/PostgreSQL 16

Chỉ chạy trên môi trường dev/test: script sẽ tạo tài khoản, company, job, CV và application test thật. Không xóa dữ liệu cũ. Tài nguyên test được giữ lại để nhóm kiểm tra; script không lưu token/mật khẩu vào evidence.

Overlay test tắt scheduler CV để ca CV-not-ready có kết quả xác định và mở một Backend thứ hai cùng DB/JWT, trỏ Worker tới cổng không có dịch vụ để kiểm tra lỗi kết nối thật. Backend chính vẫn gọi Worker thật.

```powershell
docker compose -f compose.yaml -f compose.matching-test.yaml up -d --build
```

Đợi hai Backend sẵn sàng:

```powershell
Invoke-RestMethod http://localhost:8081/api/actuator/health
Invoke-RestMethod http://localhost:18082/api/actuator/health
```

Sau đó chạy từ gốc:

```powershell
.\.venv-matching\Scripts\python.exe scripts\contract-tests\test_matching_live.py --base http://localhost:8081/api --failure-base http://localhost:18082/api --expect-cv-queued --allow-write-test-data --out .matching-evidence
```

Mong đợi 11 dòng `PASS TC-L01` đến `PASS TC-L11`, cuối cùng `RESULT: PASS`, exit code 0. Chỉ chạy thiếu một nhóm ca sẽ ghi PARTIAL, exit code 2; lỗi ghi FAIL, exit code 1.

| Ca | Kiểm tra |
|---|---|
| L01 | Register/login JWT, company, candidate profile qua API |
| L02 | Upload DOCX → Worker extraction → DB |
| L03 | PENDING giữ null score và được validator Frontend chấp nhận |
| L04 | POST matching → score/breakdown/skills/explanation đúng schema |
| L05 | GET đọc lại và POST lặp trả cùng kết quả/timestamp |
| L06 | Employer list chứa Application ID thật |
| L07/L08 | 401 thiếu token; 403 sai chủ sở hữu |
| L09 | 404 application không tồn tại |
| L10 | 409 CV chưa được xử lý |
| L11 | Worker mất kết nối → 502; backoff; attempt 3 thành FAILED |

Ca PROCESSING ở UI được component test kiểm tra. Chưa có bằng chứng tải đồng thời/concurrency trên PostgreSQL 16 trong môi trường bàn giao; phải chạy thêm khi nhóm nghiệm thu concurrency. Không dùng PGlite để kết luận về khóa đa phiên trên PostgreSQL native.

Kết thúc nghiệm thu, khôi phục dịch vụ bình thường để scheduler CV chạy lại:

```powershell
docker compose -f compose.yaml -f compose.matching-test.yaml stop backend-matching-failure
docker compose up -d --force-recreate backend frontend
```

Không chạy down -v: không cần xóa volume DB/CV.

## 5. Kiểm tra trực tiếp trên giao diện

1. Đăng nhập employer có hồ sơ ứng tuyển thật, vào danh sách ứng viên và mở chi tiết.
2. Kiểm tra Application ID đến từ API list/detail, không phải Candidate ID.
3. PENDING: hiện Đang chờ xử lý (queued), score là —; nhấn Chạy đối sánh.
4. COMPLETED: hiện điểm tổng, tiêu chí, kỹ năng khớp/thiếu, breakdown, giải thích và thời gian.
5. Tải lại trang và mở lại: điểm/timestamp vẫn là dữ liệu đã lưu.
6. PROCESSING: nút POST không xuất hiện; chỉ theo dõi GET/tải lại.
7. Khi lỗi HTTP: hiện lỗi và mã nếu có, không hiện điểm fixture. Nếu POST lỗi/timeout, tải trạng thái trước khi POST tiếp.
8. Chuyển hồ sơ hoặc đóng modal giữa request: response cũ không ghi đè hồ sơ mới.
9. Dùng DevTools Network xác nhận URL /api/v1/applications/{id}/match và Authorization header. Không chia sẻ token trong ảnh/log.

Đọc `MATCHING_RESULT_API_AND_CV_JD_UI.md` để xem contract, mã lỗi và semantics retry. Đọc `VERIFY_RESULTS.md` trong gói bàn giao để biết chính xác môi trường đã chạy và giới hạn kiểm chứng.
