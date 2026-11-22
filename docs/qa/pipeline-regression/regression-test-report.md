# BÁO CÁO KIỂM THỬ HỒI QUY TOÀN DIỆN PIPELINE CV–APPLICATION–AI
**MatchaJob Smart Recruitment Platform — Quality Assurance & Reliability Engineering**  
**Tài liệu:** `docs/qa/pipeline-regression/regression-test-report.md`  
**Ngày thực hiện:** 21/11/2026  
**Nhánh kiểm thử:** `test/cv-application-ai-pipeline-regression`  
**Trạng thái nghiệm thu:** **100% PASS (104/104 tests)**

---

## 1. MỤC TIÊU VÀ PHẠM VI KIỂM THỬ

Báo cáo này ghi nhận kết quả kiểm thử hồi quy end-to-end cho luồng xử lý trung tâm của nền tảng MatchaJob:
$$\text{CV Upload} \longrightarrow \text{Job Application} \longrightarrow \text{ProcessingJob (Queue/Lease)} \longrightarrow \text{AI Worker} \longrightarrow \text{MatchResult (Hybrid)} \longrightarrow \text{Deterministic Ranking} \longrightarrow \text{Recruitment Pipeline}$$

### Các mục tiêu cốt lõi:
1. **Kiểm tra tính toàn vẹn vòng đời ứng tuyển:** Nộp đơn, tạo snapshot CV bất biến, khởi tạo job xử lý nền, chuyển trạng thái và ghi nhận lịch sử trạng thái (`application_status_histories`).
2. **Bảo mật và Phân quyền chéo (Ownership & Cross-Tenant IDOR):** Đảm bảo Candidate chỉ thao tác với hồ sơ/CV của mình, Employer chỉ xem đơn/CV nộp vào Job thuộc doanh nghiệp của mình, từ chối mọi truy cập anonymous hoặc sai role.
3. **Chống nộp trùng và Chặn Job không hợp lệ:** Chống duplicate submission ở cả tầng nghiệp vụ và tầng ràng buộc cơ sở dữ liệu (`uq_application`), chặn nộp đơn vào các Job đã đóng (`closed`) hoặc quá hạn nộp (`deadline < now()`).
4. **Khả năng chịu lỗi và Phục hồi (Fault Tolerance & Recovery):** Xử lý an toàn khi AI Worker gặp sự cố (Timeout, 500, Connection Refused), cập nhật trạng thái `FAILED` kèm `lastError` chi tiết, kích hoạt exponential backoff và tự động giải phóng lease bị treo (>120s).
5. **Tính tất định của thuật toán xếp hạng (Deterministic Ranking):** Kiểm chứng quy tắc xếp hạng 3 tầng: `overall_score DESC NULLS LAST`, hòa điểm ưu tiên nộp trước (`applied_at ASC`), và tie-breaker cuối cùng (`id ASC`).

---

## 2. MÔI TRƯỜNG VÀ CẤU HÌNH THỰC THI

| Thành phần | Phiên bản / Cấu hình thực tế | Ghi chú |
| :--- | :--- | :--- |
| **Hệ điều hành** | Windows 11 (build 10.0.26100) | Môi trường phát triển cục bộ |
| **Java SDK** | Oracle JDK 21.0.5 (64-Bit Server VM) | LTS Release |
| **Build Tool** | Apache Maven 3.9.16 (qua `mvnw.cmd`) | Maven Wrapper chuẩn của repo |
| **Framework** | Spring Boot 3.3.4 / Spring Security 6 / Spring Data JPA | Stateless REST API |
| **Cơ sở dữ liệu** | PostgreSQL 16 + pgvector (Flyway V1–V7) | Schema chuẩn production |
| **Cơ chế xác thực** | JWT Bearer Token (256-bit HMAC secret) | Stateless Authorization Filter |
| **Mô phỏng AI** | `AiWorkerClient` / Mockito / AI Worker Contract Fixtures | Xác minh hợp đồng JSON |

---

## 3. MA TRẬN TEST CASES VÀ KẾT QUẢ THỰC THI

### 3.1. Nhóm 1: Happy Path End-to-End Pipeline
| ID | Tên Test Case | Mô Tả & Điều Kiện Kiểm Thử | Kỳ Vọng | Kết Quả |
| :--- | :--- | :--- | :--- | :---: |
| `TC-PIPE-01` | `e2ePipeline_applyFlow_succeeds` | Candidate nộp đơn ứng tuyển với CV hợp lệ vào Job đang active | Tạo `ApplicationEntity`, snapshot CV, bản ghi `PENDING` processing job, ghi lịch sử nộp ban đầu | **PASS** |
| `TC-PIPE-02` | `e2ePipeline_stageProgression_recordsAudit` | Employer cập nhật vòng tuyển dụng từ `new` $\to$ `screening` $\to$ `interview` | Cập nhật thành công, mỗi bước tạo 1 bản ghi `application_status_histories` | **PASS** |

### 3.2. Nhóm 2: Security & IDOR Regression
| ID | Tên Test Case | Mô Tả & Điều Kiện Kiểm Thử | Kỳ Vọng | Kết Quả |
| :--- | :--- | :--- | :--- | :---: |
| `TC-SEC-01` | `anonymousAccess_toProcessingJob_throwsAccessDenied` | Anonymous hoặc Null Authentication gọi xem trạng thái processing job | Bị từ chối với `AccessDeniedException` / 401 Unauthorized | **PASS** |
| `TC-SEC-02` | `candidateA_cannotDownloadCandidateB_cv` | Candidate A cố tình tải file CV thuộc sở hữu của Candidate B | Ném `AccessDeniedException` (403 Forbidden) | **PASS** |
| `TC-SEC-03` | `employer_cannotDownloadUnrelatedCandidateCv` | Employer Công ty X tải CV của ứng viên nộp vào tin của Công ty Y | Ném `AccessDeniedException` (403 Forbidden) | **PASS** |
| `TC-SEC-04` | `candidate_cannotUpdateApplicationStage` | Candidate gọi API cập nhật stage của chính đơn ứng tuyển của mình | Ném `AccessDeniedException` (403 Forbidden, chỉ Employer sở hữu job) | **PASS** |

### 3.3. Nhóm 3: Boundary & Duplicate Prevention
| ID | Tên Test Case | Mô Tả & Điều Kiện Kiểm Thử | Kỳ Vọng | Kết Quả |
| :--- | :--- | :--- | :--- | :---: |
| `TC-EDGE-01` | `repeatedApplication_throwsDuplicateException` | Candidate bấm nộp 2 lần vào cùng 1 Job | Ném `DuplicateApplicationException` (409 Conflict ProblemDetail) | **PASS** |
| `TC-EDGE-02` | `concurrentRaceCondition_triggersDuplicateException` | 2 luồng nộp đồng thời vượt qua check `existsBy...` và chạm unique DB constraint | Bắt `DataIntegrityViolationException`, trả về 409 Conflict | **PASS** |
| `TC-EDGE-03` | `applyToClosedJob_rejected` | Candidate nộp đơn vào Job có trạng thái `closed` | Ném `IllegalStateException` ("Job is not accepting applications") | **PASS** |
| `TC-EDGE-04` | `applyToExpiredDeadlineJob_rejected` | Candidate nộp đơn vào Job có `deadline < now()` | Ném `IllegalStateException` ("Job application deadline has passed") | **PASS** |
| `TC-EDGE-05` | `applyWithUnownedCv_rejected` | Candidate A dùng `cvVersionId` của Candidate B để nộp | Ném `AccessDeniedException` ("CV version does not belong...") | **PASS** |

### 3.4. Nhóm 4: AI Failure, Timeout & Idempotent Recovery
| ID | Tên Test Case | Mô Tả & Điều Kiện Kiểm Thử | Kỳ Vọng | Kết Quả |
| :--- | :--- | :--- | :--- | :---: |
| `TC-REC-01` | `jobFailure_recordsLastError_andBackoff` | AI Worker gặp lỗi 504 Gateway Timeout hoặc 500 Server Error | Chuyển trạng thái `FAILED`, ghi nhận `lastError`, tính toán backoff | **PASS** |
| `TC-REC-02` | `idempotentMatching_returnsExistingResult` | Re-trigger matching khi đã có kết quả tính toán hoàn tất | Trả về `MatchResult` hiện có, không gọi AI lặp lại | **PASS** |
| `TC-REC-03` | `staleLeaseRecovery_reclaimsExpiredJob` | Thu hồi các job bị kẹt ở trạng thái `PROCESSING` quá hạn lease 120s | Thu hồi thành công, gán lại về `PENDING` để retry | **PASS** |

### 3.5. Nhóm 5: Deterministic Ranking & Tie-Breaking
| ID | Tên Test Case | Mô Tả & Điều Kiện Kiểm Thử | Kỳ Vọng | Kết Quả |
| :--- | :--- | :--- | :--- | :---: |
| `TC-RANK-01` | `rankingOrder_deterministicTieBreaker` | Xếp hạng 4 ứng viên: Score 92, Score 78 (nộp sớm), Score 78 (nộp muộn), Score NULL | Thứ tự xếp hạng: Rank 1 (92) > Rank 2 (78 sớm) > Rank 3 (78 muộn) > Rank 4 (NULL) | **PASS** |

---

## 4. BẰNG CHỨNG THỰC THI THỰC TẾ (REAL EXECUTION LOG)

Dưới đây là trích đoạn log thực tế khi chạy lệnh kiểm thử tích hợp trên toàn bộ module pipeline:
`.\mvnw.cmd test "-Dtest=CvApplicationAiPipelineRegressionTest,ApplicationControllerTest,ApplicationServiceTest,ApplicationStateMachineTest,BatchRankingAndTieBreakTest,CvControllerTest,MatchControllerTest,MatchingServiceTest,ProcessingJobServiceTest"`

```text
[INFO] Scanning for projects...
[INFO] -----------------------< com.matchajob:backend >------------------------
[INFO] Building matchajob-backend 1.0.0
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] Running com.matchajob.application.controller.ApplicationControllerTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.158 s -- in com.matchajob.application.controller.ApplicationControllerTest
[INFO] Running com.matchajob.application.service.ApplicationServiceTest
[INFO] Tests run: 24, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.182 s -- in com.matchajob.application.service.ApplicationServiceTest
[INFO] Running com.matchajob.application.service.ApplicationStateMachineTest
[INFO] Tests run: 26, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.128 s -- in com.matchajob.application.service.ApplicationStateMachineTest
[INFO] Running com.matchajob.application.service.BatchRankingAndTieBreakTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.161 s -- in com.matchajob.application.service.BatchRankingAndTieBreakTest
[INFO] Running com.matchajob.cv.CvControllerTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.478 s -- in com.matchajob.cv.CvControllerTest
[INFO] Running com.matchajob.matching.controller.MatchControllerTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.275 s -- in com.matchajob.matching.controller.MatchControllerTest
[INFO] Running com.matchajob.matching.service.MatchingServiceTest
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.510 s -- in com.matchajob.matching.service.MatchingServiceTest
[INFO] Running com.matchajob.pipeline.CvApplicationAiPipelineRegressionTest
23:52:54.545 [main] INFO  c.m.p.s.ProcessingJobService - Recovered 2 expired processing job lease(s)
23:52:54.558 [main] WARN  c.m.p.s.ProcessingJobService - Job 459f5194 failed (transient). Rescheduled retry in 4s. Error: AI Worker timeout after 30s
23:52:54.558 [main] ERROR c.m.p.s.ProcessingJobService - Job 459f5194 permanently FAILED (attempts: 4/3). Error: AI Worker 500 Internal Error permanent
23:52:54.581 [main] WARN  c.m.a.s.ApplicationService - Database unique constraint triggered for candidate=ca000000 and job=ba000000
23:52:54.622 [main] INFO  c.m.a.s.ApplicationService - Application aa000000 stage updated: new -> screening (by user 20000000)
23:52:54.622 [main] INFO  c.m.a.s.ApplicationService - Application aa000000 stage updated: screening -> interview (by user 20000000)
23:52:54.632 [main] INFO  c.m.a.s.ApplicationService - Application created: aa000000 (candidate=ca000000, job=ba000000)
[INFO] Tests run: 15, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.111 s -- in com.matchajob.pipeline.CvApplicationAiPipelineRegressionTest
[INFO] Running com.matchajob.processing.service.ProcessingJobServiceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.024 s -- in com.matchajob.processing.service.ProcessingJobServiceTest
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 104, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  10.819 s
[INFO] Finished at: 2026-11-21T23:52:54+07:00
[INFO] ------------------------------------------------------------------------
```

---

## 5. CÁC LỖ HỔNG ĐÃ ĐƯỢC KHẮC PHỤC TRONG ĐỢT REGRESSION NÀY

1. **Vá lỗ hổng Auth Bypass tại `ProcessingJobController`:**
   - *Nguyên nhân:* Trước đây dùng `if (authentication != null && resourceOwnershipService != null)`, dẫn đến trường hợp unauthenticated hoặc anonymous token lọt qua mà không kiểm tra quyền.
   - *Khắc phục:* Bắt buộc kiểm tra `authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)` và ném `AccessDeniedException` ngay lập tức.
2. **Xử lý triệt để Race Condition nộp trùng tại `ApplicationService`:**
   - *Nguyên nhân:* Kiểm tra `existsByCandidateIdAndJobId()` độc lập với `save()`. Trong môi trường concurrent, cả hai thread có thể cùng vượt qua check và gây ra `DataIntegrityViolationException` (500 Internal Error).
   - *Khắc phục:* Bọc khối lưu trữ và bắt `DataIntegrityViolationException` để chuyển hóa thành `DuplicateApplicationException` (409 Conflict ProblemDetail chuẩn RFC 7807), đồng thời cập nhật `GlobalExceptionHandler` nhận diện constraint `uq_application`.
3. **Bổ sung ràng buộc kích thước `coverLetter`:**
   - *Khắc phục:* Bổ sung `@Size(max = 5000)` vào `ApplicationApplyRequest` để ngăn chặn payload quá tải bộ nhớ.
4. **Tự động duy trì `updatedAt`:**
   - *Khắc phục:* Thêm callback `@PreUpdate` vào `ApplicationEntity` để timestamp cập nhật tự động đồng bộ khi có bất kỳ thay đổi nào trên application.
5. **Cung cấp bộ dữ liệu Seed tái lập được:**
   - *Khắc phục:* Tạo file `scripts/seed-pipeline-regression.sql` phủ đủ 4 trạng thái của `processing_jobs` (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` kèm `last_error`) và dữ liệu ứng viên đa trạng thái phục vụ kiểm chứng bảng xếp hạng.

---

## 6. KẾT LUẬN & ĐÁNH GIÁ NGHIỆM THU MVP

- **Tính ổn định của Pipeline:** Luồng xử lý từ tải CV, tạo đơn ứng tuyển, xếp hàng xử lý AI, tính toán điểm số và cập nhật pipeline đạt độ tin cậy cao, không xảy ra rò rỉ dữ liệu hoặc sai lệch trạng thái.
- **Tỷ lệ Pass:** **100% (104/104 test cases PASS)**.
- **Sẵn sàng triển khai:** Mã nguồn đáp ứng hoàn toàn các tiêu chí nghiệm thu tuần (16/11 - 21/11), sẵn sàng tích hợp vào nhánh chính để chuẩn bị cho buổi nghiệm thu MVP và demo hội đồng.
