# Tuần 3 — Tiểu pro: CV API Integration, Processing Progress, Docker Network

Ngày thực hiện: 27/10/2026. Repository `27-10-26/se347_smart_recruitment_platform`.
Baseline: nhánh `main`, HEAD `d36e53c`, working tree sạch trước khi triển khai. Sau triển khai, theo yêu cầu owner, thay đổi được tách thành các commit local trên nhánh `feat/week-3-cv-api-processing` để review; chưa push/merge.

## 1. Đối chiếu đầu vào, nội dung thực hiện, kết quả đầu ra

| Yêu cầu được giao | Đầu vào / phần tái sử dụng | Triển khai / đầu ra |
|---|---|---|
| Upload, version, preview/download bằng API thật | JWT của authService; profile UUID từ CandidateProfileResponse.id; API CV tuần 2 | apiCvService + ApiCandidateCV, tích hợp ApiProfileEditor. PDF/DOCX 1 byte–10 MiB, multipart `file`; không tự đặt boundary, không dùng user UUID/object key làm CV ID. |
| Theo dõi processing, dừng polling, timeout, failed | processing_job_id của upload và GET processing-jobs hiện có | Hook useCvProcessing; poll 2 giây, không chồng request; dừng terminal/auth error/unmount/đổi CV/đổi phiên; timeout quan sát 3 phút, tối đa 3 lỗi kết nối liên tiếp. |
| Giữ theo dõi sau reload | Metadata CV trước đây thiếu job ID | Thêm processing_job_id nullable vào DTO; controller lấy batch job CV đúng loại/entity, một query cho cả danh sách. Không thêm migration, không đổi route/quyền. |
| Backend gọi Worker bằng Docker DNS | Compose đã có database:5432, ai-worker:8000 và volume CV | Giữ DNS đúng; truyền VITE_DATA_SOURCE=api và API URL trình duyệt; CORS_ALLOWED_ORIGINS cấu hình riêng theo môi trường. |
| Smoke Frontend–Backend–storage–AI | Dockerfiles và Worker/runtime parsing có sẵn | Compose test riêng bốn service + smoke-cv-integration.mjs, request/status/checksum evidence không chứa token/password/nội dung CV. |

## 2. Hiện trạng đã có và khoảng trống

- Đã có: CvController upload/list/get/active/download, JWT/ownership, admin audit, SHA-256, version immutable, volume CV, scheduler/lease, migration V6 và bản sửa P1 bằng UPDATE chỉ các cột processing.
- Chưa có trước task: CV frontend API. CandidateCV/candidateWorkspace lưu IndexedDB và cho DOC/5 MiB; trang hồ sơ API chỉ có link cv_url. Phần này không được coi là upload backend thật.
- httpClient mặc định sai host port 8080 so với Compose 8081, chỉ đọc text/JSON nên không tải được binary đúng cách. Docker frontend chưa truyền VITE_DATA_SOURCE nên vẫn có thể chạy demo.
- Không tin ghi chú “done”: kiểm chứng bằng test/command bên dưới. Không đổi matching UI/scoring, RBAC hay nghiệp vụ nộp đơn của thành viên khác.

## 3. Luồng triển khai

1. Đăng nhập API; authService quản lý Bearer JWT và phiên hết hạn. ApiProfileEditor tải profile của người đang đăng nhập.
2. Truyền **profile.id** vào CandidateCV (khác user_id). Danh sách version lấy từ backend; version active hiển thị “Đang dùng”. Không có dữ liệu không đồng nghĩa lỗi tải.
3. Người dùng chọn PDF/DOCX: frontend chặn rỗng/quá 10 MiB/đuôi hoặc MIME không hợp lệ; backend vẫn là nơi xác thực signature/package/giới hạn thực tế.
4. POST multipart trả 202 + CV UUID + job UUID; mỗi upload tạo version mới. Chỉ báo thành công sau response API; chống gửi lặp, không ghi file vào IndexedDB ở mode api.
5. Hook đọc job đúng CV/type, ánh xạ PENDING/PROCESSING/COMPLETED/FAILED; CV metadata xác nhận terminal state. Không bịa phần trăm, không dùng matching score làm tiến độ.
6. Timeout frontend chỉ dừng quan sát, không can thiệp trạng thái/job backend. “Kiểm tra lại trạng thái” là GET, không retry phân tích bằng POST ngầm. CV failed vẫn tải được; tải bản sửa tạo version mới.
7. GET download/inline có JWT -> Blob URL. Hiển thị PDF nếu trình duyệt hỗ trợ; DOCX tải để mở bằng ứng dụng phù hợp. Không dùng window.open(object key), không lưu public server path; thu hồi URL khi đóng/rời trang/đổi phiên.
8. Chọn version active bằng PUT hiện có. Polling chỉ cập nhật trường processing, không ghi đè lựa chọn active mới trên UI. Application snapshot và bản sửa P1 backend giữ nguyên.

## 4. Môi trường và network

| Cách chạy | Browser -> API | Backend -> DB | Backend -> Worker | CV storage |
|---|---|---|---|---|
| Compose chính | localhost:5173 -> localhost:8081/api | database:5432 | ai-worker:8000 | matchajob_cv_storage, /data/cv |
| Chạy Java/Vite local | Vite -> localhost:8081/api (cần đặt port backend tương ứng) | localhost:5433 | localhost:8001 | matchajob.upload-dir local |
| Compose integration riêng | localhost:15173 -> localhost:18082/api | database:5432, host 15434 | ai-worker:8000, host 18002 | volume riêng cv_integration_storage |

- Không dùng localhost:8001 trong container backend để gọi container Worker.
- CORS_ALLOWED_ORIGINS cho browser origin, không phải URL AI. Stack test dùng http://localhost:15173; Compose chính mặc định localhost:5173 và các origin dev đã có.
- frontend/.env.example vẫn chọn demo một cách rõ ràng. Compose chính mặc định api; chạy Vite local cần đặt VITE_DATA_SOURCE=api. Không tự fallback API -> demo.
- .dockerignore loại node_modules/target/venv/.env thật khỏi build context; không thay phiên bản framework hoặc hạ validation.
- Stack test dùng provider deterministic hiện có: Worker parsing/normalizer/embedding HTTP chạy thật, không phải mock AiWorkerClient; **không chứng minh gọi OpenAI/LLM ngoài hoặc chất lượng AI production**.

## 5. Kiểm thử và bằng chứng

| Lệnh / cấp kiểm tra | Kết quả hiện tại | Giới hạn |
|---|---|---|
| frontend: npm ci --no-audit --no-fund | Pass | Dùng lockfile hiện có; không đổi dependency. |
| frontend: npm test -- --reporter=dot | Pass: 79 tests | 44 test cũ + 35 test CV mới; jsdom/mock HTTP, không phải browser E2E. |
| frontend: npm run build | Pass | Có cảnh báo bundle lớn trên toàn app; không mở rộng refactor ngoài task. |
| frontend: npm run lint | Exit 0, có warnings toàn repo | Không đồng nghĩa repository không còn cảnh báo. Focused lint các file CV mới đã xử lý warnings cleanup ref. |
| backend: mvnw.cmd -B -ntp package | Pass: 323 tests | Unit/slice/MockMvc; chưa thay bằng kiểm chứng PostgreSQL/runtime. |
| docker compose config --quiet; config stack integration | Pass | Chỉ xác nhận cấu hình. |
| backend: test-compile failsafe:integration-test failsafe:verify với -Dit.test=CvStorageIT,CvProcessingIT,CvProcessingConcurrencyIT | Pass: 19 tests | PostgreSQL 16.15 thật tại localhost:15434/matchajob_test; AI client mock trong CvProcessingIT. CV concurrency và metadata/job ID đã kiểm tra. |
| Docker: compose.cv-integration.yaml up -d --build; up -d --no-build --wait --wait-timeout 90 | Pass | Cả frontend/backend/Worker build từ source bằng Dockerfile thật, không dùng JAR fallback; bốn service healthy. Cold build tải Maven/pip lâu nhưng hoàn thành. |
| node scripts/smoke-cv-integration.mjs --recreate | Pass, 49 checks lần chạy này | Frontend HTTP/CORS JWT, Docker DNS, PDF/DOCX -> COMPLETED, malformed PDF -> FAILED, 401/403/404/413, checksum và volume sau recreate. Evidence JSON: backend/target/cv-integration-smoke.json. |
| AI: pytest -q -p no:cacheprovider trong image Python 3.11, mount source/docs read-only | Pass: 66 tests, 2 deprecation warnings | Kiểm chứng Worker hiện có; không đánh giá LLM ngoài. |
| Browser UI trên localhost:15173 | Pass các thao tác được quan sát | Đăng nhập API bằng account synthetic, upload hai bản, reload, trạng thái retry/failed trước khi Worker sẵn sàng, completed sau khi Worker sẵn sàng, đổi active rồi reload, download. Không phải toàn bộ E2E các vai trò. |

Download qua nút UI được lưu tại Downloads/cv-ui-first.pdf, SHA-256 khớp bản synthetic nguồn:
`3A2F36A699A652CB3B2293B8DC972DB066FC86B549784F8AF8CAFB64F2C68B78`.
Ảnh UI: backend/target/cv-ui-proof.png (artifact ignored). PDF preview phụ thuộc native viewer; đã bổ sung kiểm tra khả năng hỗ trợ và thông báo tải xuống, không coi khung preview trắng là thành công render nội dung.

Test frontend mới: cv-api.test.js (JWT/multipart/blob/problem/validation/schema), cv-progress.test.jsx (terminal/timeout/auth/transient/cleanup/stale response), cv-component.test.jsx (version/API success/error/preview/active race/session change).
Backend test mới/sửa: CvControllerTest kiểm tra job ID batch; CvStorageIT kiểm tra ID job khớp từng version; các test constructor được cập nhật để dùng dependency thật của controller, không bỏ kiểm tra quyền.

## 6. Lệnh chạy và tự kiểm chứng

Tại root repository, PowerShell; không ghi đè .env đã có:

```powershell
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail 100 backend ai-worker
```

Nếu chỉ chạy frontend local, trong thư mục frontend:

```powershell
$env:VITE_DATA_SOURCE='api'
$env:VITE_API_BASE_URL='http://localhost:8081/api'
npm ci
npm run dev
```

Nếu chạy backend Java local thay vì container, trong thư mục backend dùng port thống nhất với frontend:

```powershell
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.arguments=--server.port=8081'
```

DB local vẫn dùng localhost:5433, Worker local localhost:8001. Không mang URL service DNS của Compose sang tiến trình Java chạy trên host.

Mở `/register` hoặc `/login`, chọn ứng viên; vào `/candidate/profile` để upload, chọn version, tải/xem PDF, quan sát trạng thái và reload trang. Tệp test phải synthetic, không dùng CV thật trong Git.

Stack integration riêng, không đụng container/volume dự án khác:

```powershell
docker compose -f scripts/compose.cv-integration.yaml up -d --build
docker compose -f scripts/compose.cv-integration.yaml ps
node scripts/smoke-cv-integration.mjs --recreate
docker compose -f scripts/compose.cv-integration.yaml logs --tail 100 backend ai-worker
docker compose -f scripts/compose.cv-integration.yaml stop
```

Chạy lại PostgreSQL integration sau khi stack sẵn sàng, trong terminal kiểm thử riêng tại root:

```powershell
$env:SPRING_TEST_DATASOURCE_URL='jdbc:postgresql://localhost:15434/matchajob_test'
$env:MATCHAJOB_MATCHING_PROCESSING_ENABLED='false'
Push-Location backend
.\mvnw.cmd -B -ntp '-Dit.test=CvStorageIT,CvProcessingIT,CvProcessingConcurrencyIT' test-compile failsafe:integration-test failsafe:verify
Pop-Location
```

AI test dùng đúng Python 3.11 trong image, không dùng Python khác phiên bản trên host:

```powershell
$cvRepo=(Get-Location).Path.Replace('\','/')
docker compose -f scripts/compose.cv-integration.yaml run --rm -T --no-deps --volume "${cvRepo}/ai-worker:/workspace/ai-worker:ro" --volume "${cvRepo}/docs:/workspace/docs:ro" --workdir /workspace/ai-worker ai-worker python -m pytest -q -p no:cacheprovider
```

Evidence JSON: backend/target/cv-integration-smoke.json (ignored, không chứa JWT/password/CV content). Script tạo account/version synthetic; không xóa DB/volume. `--recreate` chỉ recreate backend của **stack test đã chỉ định trong script**, không xóa dữ liệu.

## 7. Bàn giao và giới hạn

- PN Thông: tái dùng CandidateCV; onChange trả cvId/cvName/cvSize theo backend. JobDetailPage hiện vẫn tắt ứng tuyển API từ trước; không coi chức năng nộp đơn UI đã hoàn thành trong task này.
- Radio chọn bản để **xem tiến độ**, không đổi active. onChange chỉ thông báo CV active khi load/upload/activate; nút “Dùng phiên bản này” thực hiện PUT. Khi ghép form nộp đơn cần dùng CV UUID mà người dùng đã xác nhận, không đoán từ tên file.
- Download trên trang employer hiện còn cần Bảo Khanh ghép metadata CV/application với helper authenticated download; task này đã tích hợp component ứng viên, không tuyên bố mọi nút CV của mọi vai trò đã nối API.
- Đại Hưng: tiếp tục sở hữu application snapshot, orchestrator, retry policy và trạng thái job. Không đổi policy transient DB/lease trong task UI này.
- Khải Vạn: sở hữu chất lượng parsing/normalization/scoring/provider; deterministic smoke không phải đánh giá độ chính xác hoặc production-ready.
- Việt Khang: review additive contract `processing_job_id`, tích hợp result UI riêng; không dùng fixture matching để kết luận CV API đã chạy.
- Commit local theo yêu cầu owner để review; chưa push/merge. Không reset/xóa volume hoặc sửa dữ liệu của các stack khác.

## 8. Điều kiện nghiệm thu và kết luận

| Mốc trong bảng task | Kết luận | Bằng chứng chính |
|---|---|---|
| Component upload/list version/download dùng Backend API thật | Đạt trong trang hồ sơ ứng viên | Browser upload/download + checksum; smoke HTTP; apiCvService, ApiCandidateCV, ApiProfileEditor; 79 frontend tests. |
| Giao diện theo dõi processing bằng cơ chế đã chốt | Đạt | Browser quan sát failed/completed, giữ sau reload; job UUID trong metadata; hook test timeout/cancel/terminal/transient/no-overlap/stale response. |
| Backend gọi Worker qua Docker network, không sai localhost | Đạt ở stack test riêng | Smoke exec frontend -> backend:8080, backend -> ai-worker:8000; extraction và embedding thành công với Worker HTTP thật. |
| Smoke tích hợp, có request/response evidence | Đạt | 49 checks + bốn service healthy + CV tồn tại sau recreate; artifact JSON không chứa thông tin đăng nhập. |

Đây là hoàn thành phạm vi task Tiểu pro tuần 3 với các giới hạn đã nêu; không đồng nghĩa toàn bộ MatchaJob, luồng ứng tuyển, matching UI hay AI production-ready.
Stack kiểm thử được giữ chạy tại 15173/18082/15434/18002 để owner review; dùng lệnh `stop` ở trên khi không cần, **không** dùng `down -v` nếu muốn giữ CV/DB synthetic.
