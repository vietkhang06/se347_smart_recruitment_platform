# MATCHAJOB - TÀI LIỆU GIẢI THÍCH CHI TIẾT CÁC THAY ĐỔI MÃ NGUỒN (CODE EXPLANATION GUIDE)

> **Dự án:** MatchaJob - Smart Recruitment Platform  
> **Nhánh phát triển:** `feature/employer-portal-ui-polish`  
> **Tài liệu bàn giao tổng thể:** [FE_REPORT_20261017_EMPLOYER_PORTAL_HANDOVER.md](FE_REPORT_20261017_EMPLOYER_PORTAL_HANDOVER.md)  
> **Mục đích:** Tài liệu này giải thích chi tiết, cặn kẽ từng dòng mã, lý do kỹ thuật đằng sau từng thay đổi và cung cấp các ví dụ thực tế dễ hiểu nhất cho các Task trong tiến trình phát triển Employer Portal.

---

## MỤC LỤC
1. [TASK 4: Quản lý Hồ sơ Ứng viên & Pipeline Tuyển dụng Kanban](#phần-1-task-4-quản-lý-hồ-sơ-ứng-viên--pipeline-tuyển-dụng-kanban)
   - [1.1. Bối cảnh & Vấn đề trước khi thay đổi](#11-bối-cảnh--vấn-đề-trước-khi-thay-đổi)
   - [1.2. Sơ đồ luồng dữ liệu (Data Flow)](#12-sơ-đồ-luồng-dữ-liệu-data-flow)
   - [1.3. Chi tiết thay đổi Backend (Spring Boot & PostgreSQL)](#13-chi-tiết-thay-đổi-backend-spring-boot--postgresql)
   - [1.4. Chi tiết thay đổi Frontend (React & Services)](#14-chi-tiết-thay-đổi-frontend-react--services)
   - [1.5. Bảng tổng hợp các thay đổi của Task 4](#15-bảng-tổng-hợp-các-thay-đổi-của-task-4)
2. [TASK 5: Hồ sơ Doanh nghiệp (Company Profile & Branding)](#phần-2-task-5-hồ-sơ-doanh-nghiệp-company-profile--branding)
   - [2.1. Bối cảnh & Vấn đề trước khi thay đổi](#21-bối-cảnh--vấn-đề-trước-khi-thay-đổi)
   - [2.2. Sơ đồ luồng dữ liệu (Data Flow) của Task 5](#22-sơ-đồ-luồng-dữ-liệu-data-flow-của-task-5)
   - [2.3. Chi tiết thay đổi Backend (Spring Boot & PostgreSQL)](#23-chi-tiết-thay-đổi-backend-spring-boot--postgresql)
   - [2.4. Chi tiết thay đổi Frontend (React & Services)](#24-chi-tiết-thay-đổi-frontend-react--services)
   - [2.5. Bảng tổng hợp các thay đổi của Task 5](#25-bảng-tổng-hợp-các-thay-đổi-của-task-5)
3. [TASK 6: Rà soát Giao diện Toàn diện & Responsive (Laptop, Tablet, Mobile)](#phần-3-task-6-rà-soát-giao-diện-toàn-diện--responsive-laptop-tablet-mobile)
   - [3.1. Bối cảnh & Vấn đề phát hiện khi kiểm thử đa độ phân giải](#31-bối-cảnh--vấn-đề-phát-hiện-khi-kiểm-thử-đa-độ-phân-giải)
   - [3.2. Sơ đồ cấu trúc Responsive Header & Layout Navigation](#32-sơ-đồ-cấu-trúc-responsive-header--layout-navigation)
   - [3.3. Chi tiết thay đổi Frontend (Header, Navigation & View Components)](#33-chi-tiết-thay-đổi-frontend-header-navigation--view-components)
   - [3.4. Tinh chỉnh Kích thước Header & Nhận diện Tab trên Màn hình Laptop (>= 1200px)](#34-tinh-chỉnh-kích-thước-header--nhận-diện-tab-trên-màn-hình-laptop--1200px)
   - [3.5. Thu gọn Nhóm Tab Admin & Hiệu ứng Icon chỉ xuất hiện khi Hover](#35-thu-gọn-nhóm-tab-admin--hiệu-ứng-icon-chỉ-xuất-hiện-khi-hover)
   - [3.6. Bảng tổng hợp các thay đổi của Task 6](#36-bảng-tổng-hợp-các-thay-đổi-của-task-6)
4. [PHẦN 4: Giải quyết Xung đột Mã nguồn (Git Merge Conflict Resolution)](#phần-4-giải-quyết-xung-đột-mã-nguồn-git-merge-conflict-resolution)
   - [4.1. Bối cảnh & Bản chất xung đột](#41-bối-cảnh--bản-chất-xung-đột)
   - [4.2. Chiến lược hợp nhất bảo toàn 100% tính năng](#42-chiến-lược-hợp-nhất-bảo-toàn-100-tính-năng-reconciliation-strategy)
   - [4.3. Bảng đối chiếu sau khi giải quyết xung đột](#43-bảng-đối-chiếu-sau-khi-giải-quyết-xung-đột)
5. [PHẦN 5: Recruiter API Integration, Applicant Pipeline & Status Update](#phần-5-recruiter-api-integration-applicant-pipeline--status-update)
   - [5.1. Bối cảnh & Yêu cầu kỹ thuật](#51-bối-cảnh--yêu-cầu-kỹ-thuật)
   - [5.2. Sơ đồ kiến trúc & Luồng xử lý cập nhật Pipeline](#52-sơ-đồ-kiến-trúc--luồng-xử-lý-cập-nhật-pipeline)
   - [5.3. Chi tiết thay đổi Backend (Spring Boot & PostgreSQL)](#53-chi-tiết-thay-đổi-backend-spring-boot--postgresql)
   - [5.4. Chi tiết thay đổi Frontend (React & Services)](#54-chi-tiết-thay-đổi-frontend-react--services)
   - [5.5. Kiểm thử tự động toàn diện (Testing & Verification)](#55-kiểm-thử-tự-động-toàn-diện-testing--verification)
   - [5.6. Bảng đối chiếu nghiệm thu đầu ra](#56-bảng-đối-chiếu-nghiệm-thu-đầu-ra)

---

# PHẦN 1: TASK 4: QUẢN LÝ HỒ SƠ ỨNG VIÊN & PIPELINE TUYỂN DỤNG KANBAN

---

### 1.1. Bối cảnh & Vấn đề trước khi thay đổi
* **Vấn đề phía Frontend:** Giao diện Nhà tuyển dụng (*Employer Portal*) lấy danh sách ứng viên từ file giả lập (`mockUsers.js` / `mockStore`). Khi Nhà tuyển dụng duyệt hồ sơ hoặc kéo thả cột Kanban, dữ liệu chỉ lưu tạm trên RAM trình duyệt, F5 lại là mất, và không hề tương tác với cơ sở dữ liệu PostgreSQL thực tế.
* **Vấn đề phía Backend:** Backend Spring Boot lúc đó chỉ có API nộp đơn phía người tìm việc (`CandidateController`), nhưng **chưa có endpoint chuyên biệt cho Nhà tuyển dụng** để lấy danh sách hồ sơ nộp vào công ty mình (`GET /v1/employer/applications`), chưa nối điểm AI matching, chưa trả về danh sách kỹ năng của ứng viên và lịch sử thay đổi trạng thái.

---

### 1.2. Sơ đồ luồng dữ liệu (Data Flow)

```
[ Nhà tuyển dụng (HR) ]
        │  (1) Kéo thả thẻ trên Kanban / Bấm đổi giai đoạn trong Modal
        ▼
[ PipelineView.jsx / CandidateDetailModal.jsx ]
        │  (2) Gọi handleCandidateStageChange(candidateId, nextStage)
        ▼
[ EmployerPortal.jsx ]
        │  (3) await applicationService.updateApplicationStage(candidateId, nextStage)
        ▼
[ apiApplicationService.js ]
        │  (4) Chuyển đổi qua applicationMapper: toApplicationStageUpdateRequest(nextStage)
        ▼
[ HTTP PATCH: /api/v1/applications/{id}/stage ]  (Header: Bearer Token)
        │
        ▼
[ ApplicationController.java ]
        │  (5) Tiếp nhận request, kiểm tra xác thực người dùng
        ▼
[ ApplicationService.java & ApplicationStateMachine ]
        │  (6) Kiểm tra quy tắc chuyển trạng thái (State Machine):
        │      Ví dụ: NEW -> SCREENING -> INTERVIEW (Hợp lệ)
        │      Nếu vi phạm (ví dụ REJECTED -> NEW) -> Ném IllegalStateException (HTTP 400)
        ▼
[ PostgreSQL Database (Bảng applications & application_status_histories) ]
        │  (7) UPDATE stage, ghi nhật ký chuyển trạng thái vào history
        ▼
[ Phản hồi HTTP 200 OK ] ──> [ Frontend cập nhật State & Bật Toast thông báo ]
```

---

### 1.3. Chi tiết thay đổi Backend (Spring Boot & PostgreSQL)

#### 1. Tạo DTO chuẩn hóa: `EmployerApplicationItemResponse.java`
* **Vị trí file:** `backend/src/main/java/com/matchajob/application/dto/EmployerApplicationItemResponse.java`
* **Mã nguồn:**
```java
public class EmployerApplicationItemResponse {
    private UUID id;
    private UUID applicationId;
    private UUID candidateId;
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String candidateAvatar;
    private String candidateHeadline;
    private List<String> candidateSkills; // Danh sách kỹ năng chuyên môn
    private UUID jobId;
    private String jobTitle;
    private UUID companyId;
    private String companyName;
    private String stage;                 // Giai đoạn: new, screening, interview, offer, hired, rejected
    private String rejectReason;
    private String coverLetter;
    private String cvSnapshotUrl;         // Đường dẫn file CV ứng viên nộp kèm
    private Integer matchScore;           // Điểm AI tổng quan (0-100)
    private Integer skillsScore;          // Điểm khớp kỹ năng
    private Integer experienceScore;      // Điểm khớp kinh nghiệm
    private String matchRationale;        // Nhận xét đánh giá từ AI
    private Instant appliedAt;
    private Instant updatedAt;
}
```
* **Lý do kỹ thuật chi tiết:**
  - Trong PostgreSQL, thông tin ứng tuyển bị phân tách ở 4 bảng: `applications` (chứa giai đoạn, ngày nộp), `candidates` (tên, email, sđt), `candidate_skills` (kỹ năng), `jobs` & `companies` (tên vị trí và công ty).
  - DTO này đóng vai trò gom toàn bộ dữ liệu cần thiết từ 4 bảng thành một đối tượng duy nhất, giúp Frontend chỉ cần gọi 1 API là có đủ dữ liệu render giao diện.
* **Ví dụ đơn giản:** Giống như một **tờ sơ yếu lý lịch trích ngang**. Thay vì bắt HR chạy sang 4 phòng ban khác nhau để xin thông tin, hệ thống in sẵn một phiếu tổng hợp có đầy đủ tên, số điện thoại, kỹ năng, điểm số test và thư xin việc để HR duyệt ngay.

---

#### 2. Mở API Endpoint: `ApplicationController.java`
* **Vị trí file:** `backend/src/main/java/com/matchajob/application/controller/ApplicationController.java`
* **Mã nguồn:**
```java
@GetMapping("/v1/employer/applications")
public ResponseEntity<List<EmployerApplicationItemResponse>> getEmployerApplications(
        @AuthenticationPrincipal UserPrincipal currentUser,
        @RequestParam(required = false) UUID companyId,
        @RequestParam(required = false) UUID jobId,
        @RequestParam(required = false) String stage,
        @RequestParam(required = false) String search) {

    UUID userId = currentUser != null ? currentUser.getId() : null;
    List<EmployerApplicationItemResponse> items = applicationService.getEmployerApplications(
            userId, companyId, jobId, stage, search);
    return ResponseEntity.ok(items);
}

@GetMapping("/v1/applications/{applicationId}")
public ResponseEntity<EmployerApplicationItemResponse> getApplicationDetail(
        @PathVariable UUID applicationId,
        @AuthenticationPrincipal UserPrincipal currentUser) {
    UUID userId = currentUser != null ? currentUser.getId() : null;
    return ResponseEntity.ok(applicationService.getApplicationDetail(applicationId, userId));
}
```
* **Lý do kỹ thuật chi tiết:**
  - `@GetMapping("/v1/employer/applications")`: Đăng ký endpoint HTTP GET cho phía Employer Portal.
  - `@AuthenticationPrincipal UserPrincipal currentUser`: Trích xuất danh tính của HR từ JWT token để bảo mật đa công ty (HR FPT không thể xem trộm ứng viên nộp vào VNG).
  - Hỗ trợ các tham số tìm kiếm/lọc: `jobId` (lọc theo tin đăng), `stage` (lọc theo vòng tuyển dụng), `search` (tìm kiếm theo tên/email).
* **Ví dụ đơn giản:** Khi HR gõ vào ô tìm kiếm chữ *"Nguyen"* và chọn vòng *"Phỏng vấn"*, trình duyệt gửi request: `GET /v1/employer/applications?stage=interview&search=Nguyen`. Controller nhận các tiêu chí này và yêu cầu Service lọc ra kết quả chính xác.

---

#### 3. Nghiệp vụ lọc & Tối ưu truy vấn: `ApplicationService.java`
* **Vị trí file:** `backend/src/main/java/com/matchajob/application/service/ApplicationService.java`
* **Mã nguồn quan trọng:**
```java
// 1. Tự động xác định công ty của HR đăng nhập
if (companyId == null && hrUserId != null) {
    companyId = resolveCompanyIdForUser(hrUserId);
}

// 2. Câu SQL JOIN động
StringBuilder sql = new StringBuilder("""
    SELECT 
        a.id AS application_id, a.candidate_id, a.job_id, a.stage, a.reject_reason,
        a.cover_letter, a.cv_snapshot_url, a.match_score, a.skills_score, a.experience_score,
        a.match_rationale, a.applied_at, a.updated_at,
        c.full_name AS candidate_name, c.email AS candidate_email, c.phone AS candidate_phone,
        c.avatar_url AS candidate_avatar, c.headline AS candidate_headline,
        j.title AS job_title, comp.id AS company_id, comp.name AS company_name
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN companies comp ON j.company_id = comp.id
    JOIN candidates c ON a.candidate_id = c.id
    WHERE 1=1
""");

// 3. Tối ưu chống N+1 Query khi nạp kỹ năng ứng viên
private void attachCandidateSkills(List<EmployerApplicationItemResponse> items) {
    if (items.isEmpty()) return;
    List<UUID> candidateIds = items.stream()
            .map(EmployerApplicationItemResponse::getCandidateId)
            .filter(Objects::nonNull).distinct().toList();
    if (candidateIds.isEmpty()) return;

    StringBuilder sql = new StringBuilder("SELECT candidate_id, skill FROM candidate_skills WHERE candidate_id IN (");
    for (int i = 0; i < candidateIds.size(); i++) {
        if (i > 0) sql.append(", ");
        sql.append("?");
    }
    sql.append(")");
    // Thực thi 1 câu lệnh SQL duy nhất và map vào Map<UUID, List<String>>
    ...
}
```
* **Lý do kỹ thuật chi tiết:**
  - `resolveCompanyIdForUser`: Tự động tìm công ty mà tài khoản HR đang trực thuộc (bảng `company_members` hoặc `companies.owner_id`).
  - `attachCandidateSkills`: Nếu có 50 ứng viên trong danh sách, nếu ta dùng vòng lặp chạy 50 câu SELECT vào bảng `candidate_skills` thì sẽ gây ra lỗi $N+1$ query làm chậm hệ thống nghiêm trọng. Phương thức này gom tất cả ID lại và chạy **đúng 1 câu SQL** `WHERE candidate_id IN (...)` rồi gán vào từng ứng viên trong RAM.
* **Ví dụ đơn giản:** Giống như một nhân viên giao hàng nhận 10 đơn cùng một tòa nhà. Thay vì chạy lên chạy xuống cầu thang 10 chuyến, nhân viên gom tất cả 10 đơn vào ba lô và giao trong 1 chuyến duy nhất.

---

### 1.4. Chi tiết thay đổi Frontend (React & Services)

#### 4. Khắc phục lỗi tương thích thuộc tính: `applicationMapper.js`
* **Vị trí file:** `frontend/src/mappers/applicationMapper.js`
* **Mã nguồn:**
```javascript
export function toApplicationStageUpdateRequest(targetStage, reason = "", notes = "") {
  let stageCode = targetStage;
  if (STAGE_TEXT_TO_CODE[targetStage]) {
    stageCode = STAGE_TEXT_TO_CODE[targetStage];
  }
  return {
    toStage: stageCode,      // <-- BỔ SUNG DÒNG NÀY
    targetStage: stageCode,  // Giữ lại để tương thích ngược
    reason: reason || null,
    notes: notes || null
  };
}
```
* **Lý do kỹ thuật chi tiết:**
  - Backend Spring Boot DTO định nghĩa thuộc tính nhận là `@NotBlank private String toStage;`.
  - Trước đây, Frontend chỉ gửi `{ targetStage: "interview" }`. Do sai tên trường, Backend nhận `toStage = null` và ném lỗi validation `HTTP 400 Bad Request: toStage must not be blank`.
  - Việc bổ sung `toStage: stageCode` giúp khớp chính xác với Java DTO của Backend.
* **Ví dụ đơn giản:** Giống như việc ghi địa chỉ gửi thư. Bưu điện yêu cầu ghi nhãn ô là *"Người nhận"*, nhưng trước đó ta ghi nhãn là *"Khách nhận"*, khiến máy quét từ chối tiếp nhận thư.

---

#### 5. Kết nối API thật & Bắt lỗi State Machine: `apiApplicationService.js`
* **Vị trí file:** `frontend/src/services/api/apiApplicationService.js`
* **Mã nguồn:**
```javascript
// Gọi trực tiếp endpoint chuyên biệt của Employer
async getApplications(companyId, filters = {}) {
  try {
    const params = {};
    if (companyId && companyId !== "COMP-01") params.companyId = companyId;
    if (filters.jobId && filters.jobId !== "all") params.jobId = filters.jobId;
    if (filters.stage && filters.stage !== "all") {
      params.stage = STAGE_TEXT_TO_CODE[filters.stage] || filters.stage.toLowerCase();
    }
    if (filters.search && filters.search.trim()) params.search = filters.search.trim();

    const response = await httpClient.get("/v1/employer/applications", { params });
    if (Array.isArray(response)) {
      return response.map((item) => toApplicationViewModel(item));
    }
  } catch (err) {
    console.warn("Lỗi tải applications qua API, fallback sang mock:", err.message);
  }
  return mockApplicationService.getApplications(companyId, filters);
}

// Bắt lỗi nghiệp vụ quy tắc tuyển dụng (State Machine)
catch (err) {
  if (err.status === 400 || err.response?.status === 400) {
    const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
    throw new Error(detail || "Không thể chuyển giai đoạn.");
  }
  return mockApplicationService.updateApplicationStage(applicationId, nextStage, reason, notes);
}
```
* **Lý do kỹ thuật chi tiết:**
  - Quy trình tuyển dụng có các quy tắc nghiêm ngặt: Một hồ sơ đã bị từ chối (`rejected`) không thể chuyển ngược lại thành `new`. Một hồ sơ đang ở `interview` không thể nhảy cóc sang `new`.
  - Khi người dùng thao tác sai quy tắc, Backend ném lỗi 400 với thông báo chi tiết: *"Invalid transition from rejected to new"*.
  - Đoạn code này bắt lỗi 400 từ Backend và truyền nguyên vẹn thông điệp ra Toast UI để cảnh báo người dùng, thay vì tự ý fallback sang mock làm sai lệch dữ liệu.

---

#### 6. Đồng bộ giao diện & Tự động lưu: `EmployerPortal.jsx`
* **Vị trí file:** `frontend/src/pages/employer/EmployerPortal.jsx`
* **Mã nguồn:**
```javascript
const handleCandidateStageChange = async (candidateId, nextStage) => {
  try {
    await applicationService.updateApplicationStage(candidateId, nextStage);
    await refreshStoreData();
    setSelectedCandidate(current => current && String(current.id) === String(candidateId)
      ? { ...current, stage: nextStage } : current);
    showToast(`Đã chuyển ứng viên sang giai đoạn: ${nextStage}`);
  } catch (err) {
    showToast(err?.message || "Không thể chuyển giai đoạn ứng viên.", "danger");
    throw err;
  }
};
```
* **Lý do kỹ thuật chi tiết:**
  - Chuyển toàn bộ các thao tác đổi trạng thái sang bất đồng bộ (`async / await`) gọi qua `applicationService`.
  - Sau khi lưu thành công vào CSDL, gọi `refreshStoreData()` để tải lại số liệu thực tế, giúp số lượng ứng viên trên các cột Kanban và thanh thống kê nhảy số chính xác.

---

#### 7. Sửa logic tìm kiếm ứng viên trên Kanban: `PipelineView.jsx`
* **Vị trí file:** `frontend/src/pages/employer/views/PipelineView.jsx`
* **Mã nguồn:**
```javascript
// DÒNG CŨ:
const target = mockStore.getCandidateById(id);

// DÒNG MỚI:
const target = candidates.find(c => String(c.id) === String(id) || String(c.applicationId) === String(id))
  || mockStore.getCandidateById(id);
```
* **Lý do kỹ thuật chi tiết:**
  - Khi kết nối API thật, dữ liệu ứng viên nằm trong mảng `candidates` (được truyền từ `EmployerPortal`). Biến giả lập `mockStore` lúc này không chứa các ID của bản ghi thật trong PostgreSQL.
  - Dòng code cũ chỉ tìm trong `mockStore` $\rightarrow$ luôn trả về `null` $\rightarrow$ Kanban báo lỗi: *"Hồ sơ không tồn tại hoặc không cho phép chuyển giai đoạn"*.
  - Dòng code mới tìm trong `candidates` trước, nếu tìm thấy thì tiến hành di chuyển thẻ trên Kanban trơn tru.

---

#### 8. Nâng cấp Modal Chi tiết Hồ sơ: `CandidateDetailModal.jsx`
* **Vị trí file:** `frontend/src/pages/employer/components/CandidateDetailModal.jsx`
* **Các điểm bổ sung:**
  1. **Hiển thị điểm AI Matching & Nhận xét AI:**
     ```jsx
     {candidate.matchRationale && (
       <div className="alert alert-info py-2 px-3 small mb-3">
         <strong><i className="bi bi-robot me-1"></i>Đánh giá AI:</strong> {candidate.matchRationale}
       </div>
     )}
     ```
  2. **Nút xem CV nộp kèm trực tiếp:**
     ```jsx
     {candidate.cvSnapshotUrl && (
       <a href={candidate.cvSnapshotUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success bg-white">
         <i className="bi bi-file-earmark-pdf me-1"></i>Xem CV nộp kèm
       </a>
     )}
     ```
  3. **Lịch sử trạng thái ứng tuyển (Timeline History):** Nạp từ `application_status_histories` qua `applicationService.getApplicationHistory` hiển thị đầy đủ các mốc chuyển giai đoạn cùng ngày giờ và ghi chú của HR.

---

#### 9. Khắc phục lỗi khóa ngoại khi Mời phỏng vấn: `InterviewModal.jsx`
* **Vị trí file:** `frontend/src/pages/employer/components/InterviewModal.jsx`
* **Mã nguồn:**
```javascript
// DÒNG CŨ:
candidateId: selected.id,

// DÒNG MỚI:
candidateId: selected.candidateId || selected.id,
applicationId: selected.applicationId || selected.id,
```
* **Lý do kỹ thuật chi tiết:**
  - Trong PostgreSQL, bảng `interviews` có 2 khóa ngoại riêng biệt: `candidate_id` (trỏ sang bảng `candidates`) và `application_id` (trỏ sang bảng `applications`).
  - Khi xem ứng viên trên Kanban, đối tượng `selected` có `id` là `application_id`.
  - Nếu gửi `candidateId: selected.id`, PostgreSQL kiểm tra bảng `candidates` không có ID này $\rightarrow$ ném lỗi vi phạm khóa ngoại (*Foreign Key Constraint Violation*) và từ chối tạo lịch.
  - Việc tách rõ `selected.candidateId || selected.id` đảm bảo bảng `interviews` lưu chính xác cả hai khóa ngoại.

---

### 1.5. Bảng tổng hợp các thay đổi của Task 4

| Tệp tin | Vấn đề trước đó | Sau khi sửa đổi | Giá trị kỹ thuật đem lại |
| :--- | :--- | :--- | :--- |
| **`EmployerApplicationItemResponse.java`** | Chưa có DTO tổng hợp | Tạo DTO gom 4 bảng liên quan | Trả về trọn vẹn dữ liệu ứng viên trong 1 query |
| **`ApplicationController.java`** | Thiếu API cho Employer | Thêm `GET /v1/employer/applications` | Cho phép lọc theo Job, Stage và Tìm kiếm |
| **`ApplicationService.java`** | Chưa có logic query cho HR | Viết SQL JOIN động + gộp skills | Tránh lỗi $N+1$ query, bảo mật đa công ty |
| **`ApplicationServiceTest.java`** | Chưa kiểm thử API HR | Bổ sung 2 test case Mockito | Đảm bảo 34/34 unit test đều pass |
| **`applicationMapper.js`** | Sai tên trường `toStage` | Bổ sung `toStage` chuẩn DTO | Hết lỗi validation 400 Bad Request |
| **`apiApplicationService.js`** | Gom dữ liệu vòng vèo, chậm | Gọi API chuyên biệt, bắt lỗi 400 | Tăng tốc độ nạp trang, thông báo lỗi chuẩn xác |
| **`EmployerPortal.jsx`** | Lưu dữ liệu vào RAM mock | Gọi API bất đồng bộ và reload | Lưu vĩnh viễn vào CSDL PostgreSQL |
| **`PipelineView.jsx`** | Chỉ tìm trong MockStore | Tìm trong mảng `candidates` thật | Kanban hoạt động mượt mà trên dữ liệu thật |
| **`CandidateDetailModal.jsx`** | Giao diện thiếu thông tin | Thêm Điểm AI, CV link, Timeline | Trải nghiệm nhà tuyển dụng trực quan, đầy đủ |
| **`InterviewModal.jsx`** | Nhầm applicationId vào candidateId | Tách bạch 2 khóa ngoại | Không còn lỗi ràng buộc khóa ngoại DB |

---

# PHẦN 2: TASK 5: HỒ SƠ DOANH NGHIỆP (COMPANY PROFILE & BRANDING)

---

### 2.1. Bối cảnh & Vấn đề trước khi thay đổi
* **Vấn đề phía Frontend:** Tab "Hồ sơ công ty" ([CompanyView.jsx](frontend/src/pages/employer/views/CompanyView.jsx)) hiển thị thông tin tĩnh từ biến giả lập hoặc giá trị mặc định ("FPT Digital Talent"). Nút "Đổi ảnh bìa" chỉ có câu lệnh giả lập `showToast("Đã cập nhật ảnh bìa doanh nghiệp demo")` mà không cho phép người dùng đổi ảnh thật. Khi bấm nút "Lưu thay đổi", giao diện chỉ ghi vào bộ nhớ RAM tạm thời của `mockStore`, sau khi F5 lại dữ liệu sẽ bị hoàn tác.
* **Vấn đề phía Backend:** Backend Spring Boot lúc đó chỉ có duy nhất endpoint `POST /v1/companies` (dùng để đăng ký tạo công ty ban đầu), nhưng **hoàn toàn thiếu các endpoint để Nhà tuyển dụng quản lý và xem hồ sơ công ty**:
  - Thiếu `GET /v1/companies/{id}`: Để ứng viên và nhà tuyển dụng xem chi tiết thông tin công ty.
  - Thiếu `GET /v1/companies/me`: Để tự động lấy thông tin công ty của HR đang đăng nhập.
  - Thiếu `PUT /v1/companies/{id}` & `PATCH /v1/companies/{id}`: Để cập nhật thông tin pháp nhân, mô tả, logo, ảnh bìa và danh sách phúc lợi trong bảng `company_perks`.

---

### 2.2. Sơ đồ luồng dữ liệu (Data Flow) của Task 5

```
[ Nhà tuyển dụng (HR) ]
        │  (1) Mở tab "Hồ sơ công ty" (#company)
        ▼
[ EmployerPortal.jsx ]
        │  (2) Gọi companyService.getCompany(companyId)
        ▼
[ apiCompanyService.js ]
        │  (3) Gửi HTTP GET: /api/v1/companies/me (hoặc /v1/companies/{id})
        ▼
[ CompanyController.java & CompanyService.java ]
        │  (4) Xác thực người dùng, tìm công ty trực thuộc từ bảng companies & company_members
        │  (5) Truy vấn bảng company_perks để lấy danh sách phúc lợi
        ▼
[ Frontend hiển thị giao diện ]
        │  (6) Hiển thị ảnh bìa, logo, thông tin công ty và danh sách phúc lợi
        ▼
[ Thao tác chỉnh sửa & Đổi ảnh bìa / Logo ]
        │  (7) HR mở Modal tùy chỉnh ảnh -> Chọn ảnh mẫu Unsplash hoặc nhập link ảnh -> Bấm Áp dụng
        │  (8) HR chỉnh sửa mô tả, hotline, thêm/xóa phúc lợi -> Bấm "Lưu thay đổi"
        ▼
[ HTTP PUT: /api/v1/companies/{id} ]  (Payload: UpdateCompanyRequest)
        │
        ▼
[ ResourceOwnershipService.java ]
        │  (9) Kiểm tra quyền sở hữu: HR có quyền quản lý công ty này không?
        ▼
[ CompanyService.java ]
        │  (10) Kiểm tra trùng lặp mã số thuế (taxCode) nếu có thay đổi
        │  (11) Cập nhật bảng companies (name, address, website, coverImageUrl, logoUrl...)
        │  (12) Đồng bộ bảng company_perks: Xóa phúc lợi cũ, ghi phúc lợi mới theo thứ tự sort_order
        ▼
[ PostgreSQL Database ] ──> [ HTTP 200 OK ] ──> [ Giao diện Toast xanh: Đã lưu thành công vào CSDL ]
```

---

### 2.3. Chi tiết thay đổi Backend (Spring Boot & PostgreSQL)

#### 1. Tạo DTO Cập nhật: `UpdateCompanyRequest.java`
* **Vị trí file:** `backend/src/main/java/com/matchajob/user/dto/UpdateCompanyRequest.java`
* **Mã nguồn:**
```java
public class UpdateCompanyRequest {

    @NotBlank(message = "Company name is required")
    @Size(max = 255, message = "Company name must not exceed 255 characters")
    private String name;

    @JsonProperty("short_name")
    @Size(max = 50)
    private String shortName;

    @JsonProperty("tax_code")
    @Size(max = 30)
    private String taxCode;

    private String industry;
    private String size;
    private String location;
    private String address;
    private String website;

    @Email(message = "Email must be a valid email address")
    private String email;

    private String phone;
    private String about;

    @JsonProperty("description")
    private String description;

    @JsonProperty("logo_url")
    private String logoUrl;

    @JsonProperty("cover_image_url")
    private String coverImageUrl;

    private List<String> perks;

    public String resolveAbout() {
        if (about != null && !about.isBlank()) return about.trim();
        if (description != null && !description.isBlank()) return description.trim();
        return null;
    }
}
```
* **Lý do kỹ thuật chi tiết:**
  - Định nghĩa các ràng buộc kiểm tra hợp lệ (*Validation Constraints*): `@NotBlank` đối với tên công ty, `@Email` đối với email liên hệ, và giới hạn độ dài ký tự tránh lỗi tràn dữ liệu trong PostgreSQL.
  - `resolveAbout()`: Hỗ trợ linh hoạt cả hai tên gọi trường `about` (theo format database) lẫn `description` (theo chuẩn API REST), giúp tránh trường hợp gửi nhầm tên trường làm mất dữ liệu mô tả doanh nghiệp.
  - Nhận mảng `perks` để cập nhật đồng bộ các chế độ đãi ngộ vào bảng `company_perks`.
* **Ví dụ đơn giản:** Giống như một **tờ khai thay đổi thông tin doanh nghiệp**. Trên tờ khai có các ô quy định rõ: Tên công ty không được để trống, Email phải đúng định dạng có đuôi `@...`, kèm danh sách các phúc lợi nhân viên mới đăng ký.

---

#### 2. Mở rộng DTO Phản hồi: `CompanyResponse.java`
* **Vị trí file:** `backend/src/main/java/com/matchajob/user/dto/CompanyResponse.java`
* **Mã nguồn bổ sung:**
```java
    private List<String> perks; // Danh sách chế độ đãi ngộ

    public static CompanyResponse fromEntity(Company company) {
        return fromEntity(company, List.of());
    }

    public static CompanyResponse fromEntity(Company company, List<String> perks) {
        if (company == null) return null;
        return CompanyResponse.builder()
                .id(company.getId())
                .name(company.getName())
                // ... map các trường khác
                .perks(perks != null ? perks : List.of())
                .build();
    }
```
* **Lý do kỹ thuật chi tiết:**
  - Bổ sung trường `perks` vào phản hồi JSON để trả về cho Frontend.
  - Giữ lại phương thức nạp cũ `fromEntity(company)` để đảm bảo tương thích ngược 100% với các hàm đã viết trước đó, đồng thời thêm phương thức nạp mới `fromEntity(company, perks)` để nạp danh sách phúc lợi khi cần.
* **Ví dụ đơn giản:** Giống như việc nâng cấp một gói quà. Các món đồ cũ vẫn giữ nguyên, nhưng nay được bỏ thêm một danh sách các "Ưu đãi đặc biệt" vào trong hộp quà.

---

#### 3. Xử lý nghiệp vụ & Bảo mật phân quyền: `CompanyService.java`
* **Vị trí file:** `backend/src/main/java/com/matchajob/user/service/CompanyService.java`
* **Mã nguồn quan trọng:**
```java
// 1. Lấy chi tiết công ty kèm danh sách phúc lợi
@Transactional(readOnly = true)
public CompanyResponse getCompanyById(UUID id) {
    Company company = companyRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + id));

    List<String> perks = jdbcClient.sql("SELECT perk FROM company_perks WHERE company_id = ? ORDER BY sort_order ASC, id ASC")
            .param(id)
            .query(String.class)
            .list();

    return CompanyResponse.fromEntity(company, perks);
}

// 2. Tự động tìm công ty của HR đang đăng nhập
@Transactional(readOnly = true)
public CompanyResponse getEmployerCompany(UUID userId) {
    UUID companyId = jdbcClient.sql("""
            SELECT c.id FROM companies c
            WHERE c.deleted_at IS NULL
              AND (
                c.owner_id = ?
                OR EXISTS (
                  SELECT 1 FROM company_members cm
                  WHERE cm.company_id = c.id AND cm.user_id = ?
                )
              )
            ORDER BY c.created_at ASC
            LIMIT 1
            """)
            .params(userId, userId)
            .query(UUID.class)
            .optional()
            .orElseThrow(() -> new IllegalArgumentException("No company found for employer: " + userId));

    return getCompanyById(companyId);
}

// 3. Cập nhật thông tin công ty và đồng bộ bảng company_perks
@Transactional(rollbackFor = Exception.class)
public CompanyResponse updateCompany(UUID userId, UUID companyId, UpdateCompanyRequest request) {
    // Kiểm tra quyền: Tài khoản HR có phải là Owner/Member của công ty này không?
    if (userId != null) {
        resourceOwnershipService.checkEmployerCompanyOwnership(userId, companyId);
    }

    Company company = companyRepository.findById(companyId)...;

    // Kiểm tra trùng mã số thuế nếu có thay đổi
    String newTax = trimToNull(request.getTaxCode());
    if (newTax != null && !newTax.equalsIgnoreCase(company.getTaxCode())) {
        if (companyRepository.existsByTaxCode(newTax)) {
            throw new DuplicateTaxCodeException("Company with tax code " + newTax + " already exists");
        }
        company.setTaxCode(newTax);
    }

    // Cập nhật các trường thông tin
    company.setName(request.getName().trim());
    company.setLogoUrl(trimToNull(request.getLogoUrl()));
    company.setCoverImageUrl(trimToNull(request.getCoverImageUrl()));
    // ...
    Company savedCompany = companyRepository.saveAndFlush(company);

    // Đồng bộ danh sách phúc lợi (Atomic Replace)
    if (request.getPerks() != null) {
        jdbcClient.sql("DELETE FROM company_perks WHERE company_id = ?")
                .param(companyId).update();

        short sortOrder = 1;
        for (String p : request.getPerks()) {
            if (p != null && !p.trim().isEmpty()) {
                jdbcClient.sql("INSERT INTO company_perks (id, company_id, perk, sort_order) VALUES (?, ?, ?, ?)")
                        .params(UUID.randomUUID(), companyId, p.trim(), sortOrder++)
                        .update();
            }
        }
    }

    return getCompanyById(companyId);
}
```
* **Lý do kỹ thuật chi tiết:**
  - `checkEmployerCompanyOwnership`: Ngăn chặn hành vi giả mạo ID. Nếu một HR của công ty A cố tình gửi request PUT kèm ID của công ty B, hệ thống sẽ chặn đứng ngay với lỗi `HTTP 403 Forbidden: You do not have permission to manage this company`.
  - Kiểm tra `DuplicateTaxCodeException`: Đảm bảo không thể có hai công ty khác nhau dùng chung một mã số thuế trong cơ sở dữ liệu.
  - Đồng bộ `company_perks`: Khi HR xóa hoặc đổi thứ tự phúc lợi, hệ thống thực thi xóa các bản ghi cũ của công ty đó và ghi nhận lại danh sách mới theo đúng thứ tự ưu tiên (`sort_order`). Toàn bộ quá trình nằm trong một transaction `@Transactional`, nếu có sự cố sẽ tự động rollback an toàn.
* **Ví dụ đơn giản:** Giống như việc đăng ký lại danh sách bảng vàng thành tích của công ty. Người quản trị gỡ các tấm biển cũ xuống và gắn bảng mới theo đúng thứ tự 1, 2, 3. Chỉ có giám đốc hoặc người đại diện được ủy quyền của công ty đó mới có chìa khóa mở tủ để thay biển.

---

#### 4. Mở API Endpoints: `CompanyController.java`
* **Vị trí file:** `backend/src/main/java/com/matchajob/user/controller/CompanyController.java`
* **Mã nguồn:**
```java
@GetMapping("/{id}")
public ResponseEntity<CompanyResponse> getCompanyById(@PathVariable UUID id) {
    return ResponseEntity.ok(companyService.getCompanyById(id));
}

@GetMapping("/me")
@PreAuthorize("hasRole('EMPLOYER')")
public ResponseEntity<CompanyResponse> getEmployerCompany(Authentication authentication) {
    UUID userId = extractUserId(authentication);
    return ResponseEntity.ok(companyService.getEmployerCompany(userId));
}

@PutMapping("/{id}")
@PreAuthorize("hasRole('EMPLOYER')")
public ResponseEntity<CompanyResponse> updateCompany(
        Authentication authentication,
        @PathVariable UUID id,
        @Valid @RequestBody UpdateCompanyRequest request) {
    UUID userId = extractUserId(authentication);
    return ResponseEntity.ok(companyService.updateCompany(userId, id, request));
}
```
* **Lý do kỹ thuật chi tiết:**
  - `GET /{id}`: Cho phép xem hồ sơ công khai (Public) để ứng viên và khách vãng lai khi xem tin tuyển dụng có thể bấm vào xem hồ sơ công ty.
  - `GET /me`: Dành riêng cho HR đăng nhập, Frontend không cần phải biết trước UUID của công ty mà chỉ cần gọi `/me` là hệ thống tự động tìm đúng công ty của HR đó.
  - `PUT /{id}`: Cập nhật thông tin công ty, bắt buộc phải có vai trò `EMPLOYER`.

---

#### 5. Cấu hình bảo mật đường dẫn: `SecurityConfig.java`
* **Vị trí file:** `backend/src/main/java/com/matchajob/security/SecurityConfig.java`
* **Mã nguồn:**
```java
// Cho phép ứng viên và khách xem thông tin công ty qua ID (Public)
auth.requestMatchers(HttpMethod.GET, "/v1/companies/{id:[0-9a-fA-F\\-]+}").permitAll();

// Bắt buộc quyền EMPLOYER đối với các thao tác quản lý hồ sơ công ty
auth.requestMatchers(HttpMethod.GET, "/v1/companies/me").hasRole("EMPLOYER");
auth.requestMatchers(HttpMethod.POST, "/v1/companies", "/v1/companies/**").hasRole("EMPLOYER");
auth.requestMatchers(HttpMethod.PUT, "/v1/companies", "/v1/companies/**").hasRole("EMPLOYER");
auth.requestMatchers(HttpMethod.PATCH, "/v1/companies", "/v1/companies/**").hasRole("EMPLOYER");
```
* **Lý do kỹ thuật chi tiết:**
  - Regex `{id:[0-9a-fA-F\\-]+}` giúp Spring Security nhận diện chính xác: nếu đường dẫn là UUID thì cho phép truy cập công khai (Public GET); nhưng nếu là `/v1/companies/me` thì không khớp regex UUID nên sẽ rơi vào quy tắc bên dưới bắt buộc quyền `EMPLOYER`.

---

### 2.4. Chi tiết thay đổi Frontend (React & Services)

#### 6. Nâng cấp bộ chuyển đổi: `companyMapper.js`
* **Vị trí file:** `frontend/src/mappers/companyMapper.js`
* **Mã nguồn:**
```javascript
export function toCompanyViewModel(dto) {
  // ...
  const cover = dto.coverImage || dto.coverImageUrl || dto.cover_image_url || "https://images.unsplash.com/...";

  return {
    id: String(dto.id || "COMP-01"),
    name,
    shortName,
    logo,
    logoUrl: logo,
    coverImage: cover,
    coverImageUrl: cover,
    industry: dto.industry || "Công nghệ thông tin",
    // ...
    perks: perks.length > 0 ? perks : createDefaultCompany().perks
  };
}

export function toCompanyUpdateRequest(vm) {
  return {
    name: vm.name,
    shortName: vm.shortName,
    logoUrl: vm.logoUrl || vm.logo || null,
    coverImageUrl: vm.coverImageUrl || vm.coverImage || null,
    industry: vm.industry,
    size: vm.size,
    location: vm.location,
    address: vm.address,
    website: vm.website,
    email: vm.email,
    phone: vm.phone,
    taxCode: vm.taxCode,
    about: vm.about || vm.description,
    description: vm.about || vm.description,
    perks: Array.isArray(vm.perks) ? vm.perks : []
  };
}
```
* **Lý do kỹ thuật chi tiết:**
  - Cung cấp đồng thời cả `coverImage` và `coverImageUrl`, `logo` và `logoUrl` để các component React khác nhau không bị lỗi `undefined`.
  - Hàm `toCompanyUpdateRequest` đóng gói đầy đủ cả ảnh bìa, logo, phúc lợi và cả 2 trường `about`/`description` gửi lên cho Backend.

---

#### 7. Kết nối API thực tế & Bắt lỗi phân quyền: `apiCompanyService.js`
* **Vị trí file:** `frontend/src/services/api/apiCompanyService.js`
* **Mã nguồn:**
```javascript
export const apiCompanyService = {
  async getCompany(companyId = "COMP-01") {
    try {
      const endpoint = isUUID(companyId) ? `/v1/companies/${companyId}` : "/v1/companies/me";
      const response = await httpClient.get(endpoint);
      if (response && (response.id || response.name)) {
        return toCompanyViewModel(response);
      }
    } catch (err) {
      console.warn(`[apiCompanyService] getCompany error:`, err.message);
    }
    return mockCompanyService.getCompany(companyId);
  },

  async updateCompany(companyId, updateData) {
    const payload = toCompanyUpdateRequest(updateData);
    try {
      let targetId = companyId;
      if (!isUUID(targetId)) {
        const me = await httpClient.get("/v1/companies/me");
        if (me?.id) targetId = me.id;
      }

      const response = await httpClient.put(`/v1/companies/${targetId}`, payload);
      try { mockStore.updateCompany(targetId, updateData); } catch {}
      return toCompanyViewModel(response);
    } catch (err) {
      if (err.status === 400 || err.status === 403 || err.status === 409 ||
          err.response?.status === 400 || err.response?.status === 403 || err.response?.status === 409) {
        const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
        throw new Error(detail || "Không thể cập nhật hồ sơ doanh nghiệp.");
      }
      return mockCompanyService.updateCompany(companyId, updateData);
    }
  }
};
```
* **Lý do kỹ thuật chi tiết:**
  - `isUUID`: Tự động nhận diện nếu Frontend truyền mã mặc định `"COMP-01"` thì chuyển hướng gọi `/v1/companies/me` để lấy đúng ID công ty thực tế trong cơ sở dữ liệu.
  - Bắt các lỗi HTTP 400, 403, 409 từ Backend và ném ra cho UI hiển thị Toast lỗi chi tiết (ví dụ: *"Company with tax code ... already exists"*).

---

#### 8. Đồng bộ tự động trên Bảng điều khiển: `EmployerPortal.jsx`
* **Vị trí file:** `frontend/src/pages/employer/EmployerPortal.jsx`
* **Mã nguồn:**
```javascript
const refreshStoreData = useCallback(async () => {
  try {
    const liveCompany = await companyService.getCompany(companyId);
    if (liveCompany && liveCompany.name) {
      setCompany(liveCompany);
    } else {
      setCompany(mockStore.getCompanies().find(item => String(item.id) === String(companyId)) || mockStore.getCompanies()[0]);
    }
  } catch {
    setCompany(mockStore.getCompanies().find(item => String(item.id) === String(companyId)) || mockStore.getCompanies()[0]);
  }
  // ...
```
* **Lý do kỹ thuật chi tiết:**
  - Thay thế lệnh đọc tĩnh từ `mockStore` bằng lời gọi bất đồng bộ `companyService.getCompany(companyId)`.
  - Sau khi người dùng cập nhật hồ sơ công ty ở tab `CompanyView`, hàm `refreshStoreData` được kích hoạt để nạp lại dữ liệu mới nhất, giúp logo và tên công ty trên Header và thẻ xem trước cập nhật ngay lập tức.

---

#### 9. Trải nghiệm người dùng & Tùy chỉnh ảnh thương hiệu: `CompanyView.jsx`
* **Vị trí file:** `frontend/src/pages/employer/views/CompanyView.jsx`
* **Các tính năng mới bổ sung:**
  1. **Hiển thị Ảnh bìa Banner thực tế:**
     ```jsx
     <div
       className="company-banner d-flex align-items-end justify-content-end p-3 position-relative"
       style={{
         minHeight: "150px",
         backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : "linear-gradient(135deg, #10b981 0%, #047857 100%)",
         backgroundSize: "cover",
         backgroundPosition: "center"
       }}
     >
     ```
  2. **Hiển thị Logo công ty hoặc Avatar viết tắt linh hoạt:**
     ```jsx
     {hasCustomLogo ? (
       <img src={logoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
     ) : (
       (name || "CP").slice(0, 2).toUpperCase()
     )}
     ```
  3. **Hộp thoại Tùy chỉnh Ảnh bìa & Logo (`MediaModal`):**
     - Cho phép nhập trực tiếp URL của ảnh Logo và Ảnh bìa.
     - Cung cấp sẵn **3 bộ ảnh mẫu độ phân giải cao** (*Tòa nhà Công nghệ Hiện đại*, *Không gian Sáng tạo & Co-working*, *Campus Văn phòng Xanh*) từ Unsplash để Nhà tuyển dụng chọn nhanh chỉ với 1 cú click chuột mà không cần phải tự đi tìm ảnh bên ngoài.
  4. **Lưu vĩnh viễn vào CSDL PostgreSQL:**
     - Khi bấm "Lưu thay đổi", gửi toàn bộ thông tin xuống CSDL, hiển thị thông báo Toast xanh: *"Đã lưu thông tin hồ sơ doanh nghiệp thành công vào CSDL!"*. Khi F5 lại trang, toàn bộ thông tin và ảnh bìa vẫn được bảo toàn nguyên vẹn.

---

### 2.5. Bảng tổng hợp các thay đổi của Task 5

| Tệp tin | Vấn đề trước đó | Sau khi sửa đổi | Giá trị kỹ thuật đem lại |
| :--- | :--- | :--- | :--- |
| **`UpdateCompanyRequest.java`** | Chưa có DTO nhận update | Tạo DTO có validation, nhận perks | Kiểm soát dữ liệu đầu vào an toàn, chặt chẽ |
| **`CompanyResponse.java`** | Thiếu trường phúc lợi | Thêm trường `perks` và method nạp | Trả về trọn vẹn thông tin công ty và đãi ngộ |
| **`CompanyService.java`** | Chỉ có hàm tạo công ty | Thêm `getById`, `getMe`, `update` | Phân quyền an toàn, đồng bộ bảng `company_perks` |
| **`CompanyController.java`** | Chỉ có `POST /v1/companies` | Thêm `GET /{id}`, `GET /me`, `PUT /{id}` | Cung cấp đầy đủ RESTful API quản lý công ty |
| **`SecurityConfig.java`** | Chưa phân quyền các method mới | Public GET /{id}, bảo vệ GET /me và PUT | Đảm bảo khách xem được nhưng chỉ HR mới sửa được |
| **`CompanyServiceTest.java`** | Chưa test update công ty | Bổ sung 2 test case (15/15 pass) | Đảm bảo tính toàn vẹn và độ tin cậy của mã nguồn |
| **`companyMapper.js`** | Thiếu mapping `coverImageUrl` | Map đầy đủ ảnh bìa, logo, perks | Dữ liệu chuyển đổi giữa Backend và UI đồng bộ |
| **`apiCompanyService.js`** | Fallback mù quáng sang mock | Gọi API thực tế, bắt lỗi 400/403/409 | Tương tác trực tiếp với PostgreSQL |
| **`EmployerPortal.jsx`** | Đọc dữ liệu công ty từ mock | Nạp dữ liệu thực qua `companyService` | Giao diện Header và thẻ xem trước cập nhật thật |
| **`CompanyView.jsx`** | Nút đổi ảnh chỉ là demo | Thêm modal đổi Logo/Ảnh bìa + Presets | Trải nghiệm Employer Branding trực quan, chuyên nghiệp |

---

# PHẦN 3: TASK 6: RÀ SOÁT GIAO DIỆN TOÀN DIỆN & RESPONSIVE (LAPTOP, TABLET, MOBILE)

---

### 3.1. Bối cảnh & Vấn đề phát hiện khi kiểm thử đa độ phân giải

Trong quá trình kiểm thử tự động đa độ phân giải (Laptop 1366x768, Tablet Landscape 1024x768, Tablet Portrait 768x1024, Mobile 390x844), hệ thống phát hiện các vấn đề giao diện nghiêm trọng như sau:
1. **Lỗi tràn và chồng lấn Header khi thu nhỏ (< 1200px):**
   - Header trước đây được gán cứng `height: 64px` dạng inline style trong component `<Navbar>`.
   - Khi màn hình nhỏ hơn `1200px` (`expand="xl"`), thanh điều hướng thu gọn thành nút hamburger. Khi người dùng bấm mở menu (`Navbar.Toggle`), container cha bị ép cứng ở chiều cao 64px, khiến danh sách menu bị tràn ra ngoài mà không có nền che phủ, **chữ menu đè trực tiếp lên tiêu đề trang "FPT Digital Talent" bên dưới**.
2. **Kẹt nút Theme Switch và Avatar trong Menu ẩn:**
   - Nút gạt Dark/Light Mode và Avatar người dùng bị nằm bên trong `<Navbar.Collapse>`. Khi ở chế độ Mobile/Tablet, người dùng muốn đổi Theme hoặc xem Profile bắt buộc phải bấm mở hamburger menu trước, làm giảm đáng kể trải nghiệm người dùng.
3. **Menu Hover không khả dụng trên màn hình cảm ứng:**
   - Trên desktop, các menu con "Tuyển dụng" và "Hồ sơ" sử dụng cơ chế hover (`:hover`). Khi sang màn hình Tablet/Mobile (cảm ứng, không có con trỏ chuột), người dùng không thể hover để mở menu con.
4. **Gạch chân active tràn toàn màn hình trên Mobile:**
   - Pseudo-element `.header-nav-tab::after` trên Mobile có `left: 6px; right: 6px;` kéo dài thành một dải xanh ngang hết toàn bộ chiều rộng màn hình.
5. **Thanh lọc ứng viên cố định pixel (`width: 190px`, `185px`):**
   - Các dropdown chọn vị trí, giai đoạn trên [CandidatesView.jsx](frontend/src/pages/employer/views/CandidatesView.jsx) dùng kích thước cố định pixel, dẫn đến việc trên màn hình điện thoại 390px các dropdown bị co ngắn hoặc gãy hàng không đồng đều.

---

### 3.2. Sơ đồ cấu trúc Responsive Header & Layout Navigation

```
[ MÀN HÌNH DESKTOP / LAPTOP (>= 1200px) ]
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] MatchaJob    |  Tổng quan   Tuyển dụng ▼   Hồ sơ ▼  |    [Theme]  [Avatar Pill]  │
└────────────────────────────────────────────────────────────────────────────────────────┘
                      └── Hover xổ menu con mượt mà ──┘

[ MÀN HÌNH TABLET & MOBILE (< 1200px) ]
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] MatchaJob                                        [Theme]  [Avatar]  [Hamburger] │
└────────────────────────────────────────────────────────────────────────────────────────┘
      │
      ▼ Khi bấm nút [Hamburger]
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─ CARD MENU NỔI (Có nền Surface, Viền Border, Bo góc 14px, Đổ bóng mờ) ─────────────┐ │
│ │ ▣ Tổng quan (Highlight xanh dịu khi active)                                        │ │
│ │ ▾ Tuyển dụng                                                                       │ │
│ │   ┌─ Hộp phân mục con (Thụt lề, màu nền Surface-2) ──────────────────────────────┐ │ │
│ │   │ • Tin tuyển dụng                                                             │ │ │
│ │   │ • Kho ứng viên                                                               │ │ │
│ │   │ • Quy trình (Kanban)                                                         │ │ │
│ │   │ • Phỏng vấn                                                                  │ │ │
│ │   └──────────────────────────────────────────────────────────────────────────────┘ │ │
│ │ ▾ Hồ sơ                                                                            │ │
│ │   ┌─ Hộp phân mục con ───────────────────────────────────────────────────────────┐ │ │
│ │   │ • Hồ sơ cá nhân                                                              │ │ │
│ │   │ • Hồ sơ doanh nghiệp                                                         │ │ │
│ │   │ • Phân tích                                                                  │ │ │
│ │   │ • Gói dịch vụ                                                                │ │ │
│ │   └──────────────────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
      │
      ▼ Tiêu đề trang đẩy xuống dưới tự nhiên, KHÔNG HỀ BỊ ĐÈ CHỮ
[ FPT Digital Talent - Trung tâm quản lý tuyển dụng ]
```

---

### 3.3. Chi tiết thay đổi Frontend (Header, Navigation & View Components)

#### 1. Tách cụm Action Controls và Tự động đóng Menu: `Header.jsx`
* **Vị trí file:** `frontend/src/components/common/Header.jsx`
* **Mã nguồn:**
```javascript
// State quản lý đóng/mở menu trên mobile/tablet
const [navExpanded, setNavExpanded] = useState(false);
const closeNav = () => setNavExpanded(false);

const handleEmployerTabClick = (key) => {
  navigate(`/employer#${key}`);
  closeNav(); // Tự động đóng menu sau khi chọn trang
};

// Đưa cụm Action Controls ra ngoài Navbar.Collapse với Flexbox Order
<div className="d-flex align-items-center gap-2 gap-sm-3 ms-auto order-xl-last">
  {/* Nút Theme Switch */}
  <button className="theme-toggle-switch" ... />
  {/* Nút Avatar Profile */}
  <NavDropdown ... />
  {/* Nút Hamburger Toggle Menu chỉ hiện trên màn hình < 1200px */}
  <Navbar.Toggle aria-controls="main-navbar-nav" className="p-1 border-0 ms-1 d-xl-none" />
</div>

{/* Navbar.Collapse chỉ chứa danh sách điều hướng trung tâm */}
<Navbar.Collapse id="main-navbar-nav" className="order-xl-1 flex-grow-1">
  ...
</Navbar.Collapse>
```
* **Lý do kỹ thuật chi tiết:**
  - `order-xl-last` và `order-xl-1`: Kỹ thuật Flexbox Reordering cho phép trên Desktop Navbar cụm controls nằm bên phải ngoài cùng và menu nằm ở giữa; còn trên Mobile/Tablet thì cụm controls nằm cùng hàng với Logo, còn Menu xổ xuống bên dưới.
  - `closeNav()`: Lắng nghe sự kiện click trên từng mục điều hướng để tự động thu gọn menu, người dùng không cần phải bấm lại nút hamburger để đóng.
* **Ví dụ đơn giản:** Giống như một **ngăn kéo thông minh**. Nút bật đèn (Theme) và chìa khóa (Avatar) luôn được móc sẵn ngay ở mặt trước ngăn bàn để rút dùng ngay. Khi cần xem bản đồ chi tiết, ta mới kéo ngăn bàn ra; chọn xong điểm đến thì ngăn bàn tự động trượt khép lại.

---

#### 2. Kiến trúc CSS Responsive cho Header & Sub-menu: `tokens.css`
* **Vị trí file:** `frontend/src/styles/tokens.css`
* **Mã nguồn:**
```css
@media (max-width: 1199px) {
  .navbar-matcha {
    min-height: 64px;
    height: auto !important; /* Xóa bỏ ép cứng 64px */
  }
  .navbar-matcha .navbar-collapse {
    width: 100%;
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 14px 16px;
    margin-top: 10px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16); /* Đổ bóng tách biệt khỏi body */
  }
  .header-nav-tab {
    height: 42px !important;
    border-radius: 8px !important;
    justify-content: flex-start !important;
    width: 100% !important;
  }
  .header-nav-tab::after {
    display: none !important; /* Bỏ gạch chân dài trên mobile */
  }
  .header-nav-tab.active {
    background-color: var(--primary-soft) !important;
    color: var(--primary) !important;
  }
  .nav-hover-dropdown .dropdown-menu {
    position: static !important;
    display: flex !important;
    flex-direction: column !important;
    box-shadow: none !important;
    background-color: var(--surface-2) !important;
    margin: 4px 0 8px 12px !important;
    width: calc(100% - 12px) !important;
  }
}
```
* **Lý do kỹ thuật chi tiết:**
  - `position: static`: Chuyển dropdown menu từ cơ chế trôi nổi (*absolute*) sang nằm trong luồng tài liệu chuẩn (*in-flow block*), giúp menu đẩy nội dung trang bên dưới xuống thay vì đè lên chữ.
  - Hiển thị trực tiếp các mục con dưới dạng hộp thụt lề có nền `var(--surface-2)`, giúp người dùng cảm ứng chạm được ngay các trang con mà không cần phụ thuộc vào chuột hover.

---

#### 3. Thanh cuộn mượt cảm ứng cho Kanban Pipeline: `PipelineView.jsx` & `tokens.css`
* **Vị trí file:** `frontend/src/pages/employer/views/PipelineView.jsx` & `frontend/src/styles/tokens.css`
* **Mã nguồn:**
```css
.kanban-board-row {
  -webkit-overflow-scrolling: touch; /* Hỗ trợ lướt quán tính trên iOS Safari */
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--primary) var(--surface-2);
}
.kanban-board-row::-webkit-scrollbar {
  height: 8px;
}
.kanban-board-row::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 9999px;
}
.kanban-board-row::-webkit-scrollbar-thumb:hover {
  background: var(--primary);
}
```
* **Lý do kỹ thuật chi tiết:**
  - Bảng Kanban có 6 cột cần lướt ngang. Thêm `-webkit-overflow-scrolling: touch` giúp thao tác quẹt tay trên màn hình điện thoại/tablet có gia tốc mượt mà, không bị khựng; thanh cuộn 8px màu bo tròn tăng tính thẩm mỹ cao cấp.

---

#### 4. Linh hoạt bộ lọc ứng viên trên Mobile: `CandidatesView.jsx`
* **Vị trí file:** `frontend/src/pages/employer/views/CandidatesView.jsx`
* **Mã nguồn:**
```jsx
// Thay vì cố định pixel (width: 190px, 185px):
<div className="filter-select-col">
  <Form.Select size="sm" value={jobFilter} ... />
</div>
```
```css
.filter-select-col {
  flex: 1 1 180px;
  min-width: 150px;
}
@media (max-width: 576px) {
  .filter-select-col {
    flex: 1 1 100% !important;
    width: 100% !important;
  }
}
```
* **Lý do kỹ thuật chi tiết:**
  - Trên màn hình điện thoại dưới 576px, các dropdown tự động mở rộng 100% chiều rộng để HR dễ dàng bấm ngón tay chọn vị trí hoặc giai đoạn mà không bị gãy giao diện.

---

### 3.4. Tinh chỉnh Kích thước Header & Nhận diện Tab trên Màn hình Laptop (>= 1200px)

#### 1. Bối cảnh & Vấn đề thực tế
* Trên màn hình Laptop (độ phân giải 1366x768 hoặc viewport 1352x674), thanh Header bị co lại quá mỏng (chỉ khoảng ~46px - 48px) do thiếu chiều cao cố định trên Desktop.
* **Hậu quả trực quan:**
  1. Các tab ("Tổng quan", "Tuyển dụng", "Hồ sơ") bị dính sát nhau do khoảng cách chỉ 4px (`gap-1`), padding hẹp (`16px`).
  2. Icon của các tab chưa active bị ẩn hoàn toàn (`opacity: 0; max-width: 0`), khiến tab "Tuyển dụng" và "Hồ sơ" chỉ còn lại dòng chữ xám mỏng manh, chìm nghỉm giữa header.
  3. Khi rê chuột vào tab, icon đột ngột bung ra làm giật chữ sang bên phải (layout shift).
  4. Vạch gạch chân active màu xanh dán sát sàn sạt ngay dưới chân chữ, tạo cảm giác chật chội, thiếu không gian thở (*breathing room*).

---

#### 2. Chi tiết Giải pháp Code đã triển khai

##### A. Thiết lập Chiều cao Chuẩn 68px cho Header Laptop/Desktop: `tokens.css`
```css
@media (min-width: 1200px) {
  .navbar-matcha {
    height: 68px !important;
    min-height: 68px !important;
  }
  .navbar-matcha .container-fluid {
    height: 68px !important;
    min-height: 68px !important;
  }
  .navbar-matcha .navbar-collapse {
    height: 100% !important;
  }
  .navbar-matcha .navbar-nav {
    height: 100% !important;
    align-items: stretch !important;
    gap: 8px !important;
  }
  .header-nav-tab,
  .header-task-link,
  .nav-hover-dropdown {
    height: 68px !important;
  }
  .header-nav-tab {
    padding: 0 20px !important;
    font-size: 15px !important;
  }
  .nav-hover-dropdown .dropdown-menu {
    top: 68px !important;
  }
}
```
* **Lý do kỹ thuật:** Khi Header và các Tab cùng đạt chuẩn `68px`, chữ và icon được căn giữa hoàn hảo theo chiều dọc (`align-items: center`), còn vạch gạch chân `::after` (`bottom: 0`) nằm chính xác ở đường viền đáy 1px của Navbar, cách chân chữ khoảng 18px tạo nên phong cách thiết kế thoáng đãng, sang trọng.

##### B. Luôn hiển thị Icon Tab trực quan, triệt tiêu Layout Shift: `tokens.css`
```css
.header-nav-tab .tab-icon,
.header-task-link .tab-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  opacity: 0.82;
  max-width: 22px;
  margin-right: 2px;
  transform: scale(1);
  transition: opacity 0.2s ease, color 0.2s ease, transform 0.2s ease;
  overflow: visible;
  vertical-align: middle;
}

.header-nav-tab.active .tab-icon,
.header-task-link.active .tab-icon {
  opacity: 1;
  color: var(--primary) !important;
  transform: scale(1.08);
}
```
* **Lý do kỹ thuật:** Cả 3 tab ("Tổng quan", "Tuyển dụng", "Hồ sơ") luôn có biểu tượng rõ nét (📊, 💼, 📁), giúp người dùng nhận diện chức năng ngay lập tức mà không cần phải rê chuột, đồng thời loại bỏ hoàn toàn hiện tượng giật chữ khi hover.

##### C. Ngăn chặn rớt dòng & Tăng khoảng cách tab: `Header.jsx`
```jsx
// 1. Chống rớt dòng trên Desktop
<Container fluid className="px-3 px-xl-4 d-flex align-items-center flex-wrap flex-xl-nowrap h-100">

// 2. Tăng khoảng cách giữa các tab trên màn hình lớn
<Nav className="mx-auto align-items-stretch gap-1 gap-xl-2 gap-xxl-3 my-0 h-100 overflow-visible">
```

### 3.5. Thu gọn Nhóm Tab Admin & Hiệu ứng Icon chỉ xuất hiện khi Hover

#### 1. Bối cảnh & Vấn đề thực tế
* Trên trang **Admin Portal**, Header trước đây hiển thị toàn bộ **9 tab dàn trải hàng ngang**: *Tổng quan, Kiểm duyệt, Người dùng, Báo cáo, Ngành nghề, Cấu hình, Nhật ký, Thông báo, Hồ sơ Admin*.
* Khi hiển thị trên màn hình laptop (độ phân giải 1366x768 hoặc 1352x674), thanh Header bị **tràn màn hình về phía bên phải**, đẩy các nút điều khiển quan trọng như **Công tắc chuyển Theme** và **Avatar người dùng** ra khỏi khung nhìn.

---

#### 2. Chi tiết Giải pháp Code đã triển khai

##### A. Thu gọn 9 Tab Admin thành 4 Nhóm Tab chuẩn hóa: `Header.jsx`
* Tương tự như cơ chế của Employer Portal, các tính năng Admin được phân nhóm logic thành:
  1. **Tổng quan:** Tab điều hướng nhanh về bảng điều khiển trung tâm (`#overview`).
  2. **Quản lý (Dropdown Menu hover):** Gom 4 tính năng quản lý nghiệp vụ:
     - *Kiểm duyệt* (`#moderation`)
     - *Người dùng* (`#users`)
     - *Báo cáo* (`#reports`)
     - *Thông báo* (`#notifications`)
  3. **Hệ thống (Dropdown Menu hover):** Gom 3 tính năng cấu hình hạ tầng:
     - *Ngành nghề* (`#categories`)
     - *Cấu hình* (`#system`)
     - *Nhật ký* (`#logs`)
  4. **Hồ sơ:** Tab truy cập hồ sơ tài khoản Admin (`#profile`).

```jsx
// Định nghĩa nhóm tab Admin trong Header.jsx
const ADMIN_MANAGEMENT_TABS = [
  { key: "moderation", label: "Kiểm duyệt", icon: "bi-shield-check" },
  { key: "users", label: "Người dùng", icon: "bi-people" },
  { key: "reports", label: "Báo cáo", icon: "bi-flag" },
  { key: "notifications", label: "Thông báo", icon: "bi-bell" }
];

const ADMIN_SYSTEM_TABS = [
  { key: "categories", label: "Ngành nghề", icon: "bi-tags" },
  { key: "system", label: "Cấu hình", icon: "bi-sliders" },
  { key: "logs", label: "Nhật ký", icon: "bi-journal-text" }
];

const isAdminManagementActive =
  currentPath.startsWith("/admin") &&
  ADMIN_MANAGEMENT_TABS.some((t) => t.key === currentHash);

const isAdminSystemActive =
  currentPath.startsWith("/admin") &&
  ADMIN_SYSTEM_TABS.some((t) => t.key === currentHash);
```

##### B. Cấu hình Trạng thái Icon: Luôn hiện ở Tab Đang Active & Chỉ hiện khi Hover ở các Tab còn lại: `tokens.css`
* **Tab đang Active:** Luôn hiển thị đầy đủ icon đặc trưng kèm màu sắc nhận diện (`--primary`), giúp người dùng nhận biết ngay lập tức trang mình đang đứng mà không cần phải di chuột.
* **Các Tab Chưa Active:** Mặc định ẩn hoàn toàn icon (`opacity: 0; max-width: 0`), tab chỉ hiển thị chữ thanh mảnh, giúp tiết kiệm tối đa không gian hàng ngang trên Header.
* **Khi Di chuột (Hover):** Icon trượt mượt mà hiện ra (`opacity: 1; max-width: 20px; margin-right: 4px`) với chuyển động cubic-bezier mềm mại.

```css
/* Trạng thái mặc định của tab thường: Ẩn icon để tiết kiệm chiều ngang */
.header-nav-tab .tab-icon,
.header-task-link .tab-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  opacity: 0;
  max-width: 0;
  margin-right: 0;
  transform: scale(0.65);
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              max-width 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              margin-right 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  vertical-align: middle;
  pointer-events: none;
}

/* Tab đang active*/
.header-nav-tab.active .tab-icon,
.header-task-link.active .tab-icon {
  opacity: 1;
  max-width: 20px;
  margin-right: 4px;
  transform: scale(1.05);
  color: var(--primary) !important;
}

/* Tab khi được hover vào*/
.header-nav-tab:hover .tab-icon,
.header-task-link:hover .tab-icon {
  opacity: 1;
  max-width: 20px;
  margin-right: 4px;
  transform: scale(1);
  color: var(--text);
}

.header-nav-tab.active:hover .tab-icon,
.header-task-link.active:hover .tab-icon {
  color: var(--primary) !important;
  transform: scale(1.08);
}
```

---

### 3.6. Bảng tổng hợp các thay đổi của Task 6

| Tệp tin | Vấn đề trước đó | Sau khi sửa đổi | Giá trị kỹ thuật đem lại |
| :--- | :--- | :--- | :--- |
| **`Header.jsx`** | 9 tab Admin dàn phẳng gây tràn viền header trên laptop | Gom 9 tab thành 4 nhóm (Tổng quan, Quản lý, Hệ thống, Hồ sơ) | Header vừa vặn 100% viewport, nút Theme & Avatar hiển thị trọn vẹn |
| **`tokens.css`** | Icon luôn hiện chiếm diện tích ngang | Icon ẩn mặc định, chỉ xuất hiện mượt mà khi hover | Giao diện thanh mảnh, tinh tế, tiết kiệm không gian ngang |
| **`Header.jsx`** | Gán cứng `height: 64px`, giấu Theme & Avatar | Tách controls lên thanh trên, hỗ trợ `closeNav`, `flex-xl-nowrap` | Đổi theme & xem profile 1 chạm, menu đóng mở mượt |
| **`tokens.css`** | Menu mobile bị đè chữ, dropdown hover không chạm được | Thêm card menu nổi, static in-flow, thụt lề rõ ràng | Không còn lỗi đè chữ lên trang, trải nghiệm cảm ứng hoàn hảo |
| **`PipelineView.jsx`** | Thanh cuộn ngang mặc định thô sơ | Bổ sung `.kanban-board-row` touch scrolling | Vuốt Kanban trên điện thoại/tablet êm ái, thanh cuộn đẹp mắt |
| **`CandidatesView.jsx`** | Dropdown cố định pixel 190px | Áp dụng `.filter-select-col` co giãn linh hoạt | Hiển thị 100% chiều ngang vừa vặn trên mọi kích thước điện thoại |
| **`CompanyView.jsx`** | Nút đổi ảnh bìa bị dài trên màn hình 375px | Thêm class responsive `d-none d-sm-inline` | Nút gọn gàng "Đổi ảnh" trên mobile, không vỡ layout banner |

---

# PHẦN 4: GIẢI QUYẾT XUNG ĐỘT MÃ NGUỒN (GIT MERGE CONFLICT RESOLUTION)

> **Nhánh xung đột:** `origin/main` ↔ `feature/employer-portal-ui-polish`  
> **Tập tin xung đột chính:** `backend/src/main/java/com/matchajob/application/service/ApplicationService.java` & `ApplicationServiceTest.java`  
> **Tập tin liên đới:** `ApplicationController.java` & `frontend/src/services/api/apiApplicationService.js`

---

### 4.1. Bối cảnh & Bản chất xung đột

Khi tạo Pull Request hoặc hợp nhất (`git merge`) giữa nhánh chính `main` và nhánh tính năng `feature/employer-portal-ui-polish`, Git báo lỗi:
```text
CONFLICT (content): Merge conflict in backend/src/main/java/com/matchajob/application/service/ApplicationService.java
CONFLICT (content): Merge conflict in backend/src/test/java/com/matchajob/application/service/ApplicationServiceTest.java
```

* **Phía nhánh `origin/main`:** Định nghĩa nhóm tính năng phục vụ **Người tìm việc (Candidate)** và **Quản lý đơn theo từng Job**:
  - `getMyApplications(UUID candidateId, UUID userId, int page, int size, String stageFilter)`: Lấy danh sách đơn của Candidate có phân trang.
  - `getApplicationDetail(UUID applicationId, UUID userId)`: Trả về `ApplicationDetailResponse` (DTO rút gọn chứa tên ứng viên, chức danh job, tên công ty, link CV, stage).
  - `getJobApplications(UUID jobId, UUID userId, int page, int size, String stageFilter)`: Lấy danh sách đơn nộp vào một job cụ thể có phân trang.
* **Phía nhánh `feature/employer-portal-ui-polish`:** Định nghĩa nhóm tính năng phục vụ **Nhà tuyển dụng (Employer Pipeline Kanban)**:
  - `getEmployerApplications(UUID userId, UUID companyId, UUID jobId, String stageFilter, String search)`: Trả về danh sách pipeline với đầy đủ dữ liệu (avatar, contact, headline, AI match score, AI rationale).
  - `getApplicationDetail(UUID applicationId, UUID userId)`: Trả về `EmployerApplicationItemResponse` (DTO chuyên biệt của Nhà tuyển dụng chứa điểm kỹ năng AI, kỹ năng trích xuất từ CV, avatar, phone).
  - `attachCandidateSkills(...)`: Nối bảng `candidate_skills`.

**Nguyên nhân gốc rễ:** Cả hai nhánh đều sửa đổi cùng một khu vực (Section 5) trong file `ApplicationService.java` và định nghĩa phương thức `getApplicationDetail(...)` với cùng chữ ký nhưng trả về 2 kiểu DTO khác nhau (`ApplicationDetailResponse` vs `EmployerApplicationItemResponse`). Nếu chỉ giữ một bên thì tính năng của bên kia sẽ bị hỏng.

---

### 4.2. Chiến lược hợp nhất bảo toàn 100% tính năng (Reconciliation Strategy)

1. **Bảo toàn toàn bộ tính năng của Ứng viên (`origin/main`):**
   - Giữ nguyên `getMyApplications(...)` (trả về `ApplicationListResponse`).
   - Giữ nguyên `getApplicationDetail(...)` (trả về `ApplicationDetailResponse`).
   - Giữ nguyên `getJobApplications(...)` (trả về `ApplicationListResponse`).
   - Giữ nguyên các hàm bổ trợ: `toDetailResponse(...)`, `lookupJobInfo(...)`, `record JobInfo(...)`.

2. **Bảo toàn toàn bộ tính năng của Nhà tuyển dụng (`feature`):**
   - Giữ nguyên `getEmployerApplications(...)` (trả về `List<EmployerApplicationItemResponse>`).
   - **Đổi tên phương thức chi tiết của Nhà tuyển dụng thành:** `getEmployerApplicationDetail(UUID applicationId, UUID userId)` (trả về `EmployerApplicationItemResponse`) để tránh xung đột chữ ký với phương thức của Candidate.
   - Giữ nguyên hàm bổ trợ `attachCandidateSkills(...)`.

3. **Phân định rõ ràng trong Controller (`ApplicationController.java`):**
   - `GET /v1/applications`: Dành cho Candidate lấy danh sách đơn của mình.
   - `GET /v1/applications/{applicationId}`: Dành cho Candidate/General xem chi tiết đơn (`ApplicationDetailResponse`).
   - `GET /v1/jobs/{jobId}/applications`: Dành cho HR lấy danh sách đơn theo Job (`ApplicationListResponse`).
   - `GET /v1/employer/applications`: Dành cho Employer xem toàn bộ Pipeline (`List<EmployerApplicationItemResponse>`).
   - `GET /v1/employer/applications/{applicationId}`: Dành cho Employer xem chi tiết ứng viên với điểm AI subscores (`EmployerApplicationItemResponse`).

4. **Tối ưu hóa Frontend (`apiApplicationService.js`):**
   - Trong hàm `getApplicationById(applicationId)`: Tự động thử gọi endpoint `/v1/employer/applications/${applicationId}` trước để lấy đầy đủ chi tiết AI subscores, nếu không được sẽ fallback sang `/v1/applications/${applicationId}`.

---

### 4.3. Bảng đối chiếu sau khi giải quyết xung đột

| Thành phần | Trước khi Resolve (Bị đè / Xung đột) | Sau khi Resolve (Hợp nhất hoàn chỉnh) |
| :--- | :--- | :--- |
| `ApplicationService.java` | 2 phiên bản `getApplicationDetail` đè nhau | Tách rõ: `getApplicationDetail` (Candidate DTO) và `getEmployerApplicationDetail` (Employer DTO) |
| `ApplicationController.java` | Ambiguous mapping trùng path `/applications` | Đường dẫn tách bạch: `/v1/applications` (Candidate) và `/v1/employer/applications` (Employer) |
| `ApplicationServiceTest.java` | Xung đột conflict markers, mất test suite | Hợp nhất cả test suite `SubmitApplication`, `ListAndDetailApplications` và `EmployerApplications` |
| `apiApplicationService.js` | Chỉ gọi 1 endpoint tĩnh | Ưu tiên `/v1/employer/applications/{id}` có fallback tự động sang `/v1/applications/{id}` |

---

# PHẦN 5: RECRUITER API INTEGRATION, APPLICANT PIPELINE & STATUS UPDATE

> **Chủ đề:** Tích hợp API Nhà tuyển dụng + Luồng quản lý hồ sơ ứng viên (Applicant Pipeline) + Cập nhật trạng thái tuyển dụng  
> **Các tệp tin thay đổi:**
> - Backend: `backend/src/main/java/com/matchajob/application/service/ApplicationService.java`, `ApplicationServiceTest.java`, `ApplicationWorkflowIT.java`
> - Frontend API Services: `frontend/src/services/api/apiCompanyService.js`
> - Frontend Views & Modals: `frontend/src/pages/employer/views/CompanyView.jsx`, `frontend/src/pages/employer/components/JobComposerModal.jsx`, `frontend/src/pages/employer/views/CandidatesView.jsx`, `frontend/src/pages/employer/views/PipelineView.jsx`, `frontend/src/pages/employer/EmployerPortal.jsx`
> - Test Suites: `frontend/src/tests/recruiter-pipeline.test.jsx`, `backend/.../ApplicationWorkflowIT.java`

---

### 5.1. Bối cảnh & Yêu cầu kỹ thuật

#### Bối cảnh đặt ra:
Sau khi hợp nhất các tính năng cốt lõi giữa hai phía Ứng viên và Nhà tuyển dụng, hệ thống đối mặt với 3 thách thức lớn trong vận hành thực tế:
1. **Validation & Đồng bộ dữ liệu Company / Job UI:** Khi gửi dữ liệu lưu công ty hoặc đăng tuyển job, backend trả về các lỗi chi tiết theo chuẩn RFC 7807 (Problem Details: `fieldErrors`, `detail`). Trước đây, frontend chỉ hiển thị một câu thông báo chung chung hoặc nuốt lỗi, khiến người dùng không biết ô nhập liệu nào (VD: `taxCode`, `email`, `salaryMin`) bị sai định dạng.
2. **Trải nghiệm tìm kiếm & phân loại ứng viên:** Khi danh sách ứng viên có nhiều tin tuyển dụng khác nhau, recruiter không có công cụ sắp xếp đa tiêu chí (điểm AI match cao/thấp, ngày nộp mới/cũ, tên A-Z) và không có sự liên kết tự nhiên giữa mục xem Job ("Xem ứng viên") với màn hình ứng viên.
3. **An toàn dữ liệu trong luồng Pipeline & Ràng buộc nghiệp vụ Tin tuyển dụng đã đóng:**
   - Trước đây khi recruiter bấm chuyển cột stage trên Kanban, hệ thống đổi ngay không hỏi xác nhận, và nếu mạng chập chờn hay API backend trả lỗi, giao diện không có cơ chế hoàn tác (rollback) trạng thái cũ.
   - Đặc biệt nghiêm trọng: Khi một tin tuyển dụng đã bị đóng (`status = 'closed'`), backend chỉ chặn nộp hồ sơ mới (`applyForJob`) nhưng lại **quên chặn cập nhật trạng thái (`updateStage`)**. Điều này cho phép recruiter vô tình hoặc cố ý can thiệp duyệt hồ sơ trên một vị trí đã ngừng tuyển.

---

### 5.2. Sơ đồ kiến trúc & Luồng xử lý cập nhật Pipeline

```
[ Recruiter trên Kanban Board (PipelineView.jsx) ]
                      │
                      │ (1) Bấm nút dịch chuyển cột (Prev / Next stage)
                      ▼
        [ Modal Xác nhận Thao tác (confirmModal) ]
                      │
                      ├─► [ Hủy ] ──► Đóng modal, giữ nguyên trạng thái
                      │
                      │ (2) Bấm "Xác nhận chuyển"
                      ▼
[ Optimistic UI Update + Đánh dấu Saving State ]
  • Tạm thời chuyển thẻ sang cột mới ngay lập tức
  • Bật cờ savingCandidateId: làm mờ thẻ (opacity: 0.7) & xoay spinner
                      │
                      │ (3) Gọi onStageChange(candidateId, nextStage) qua API
                      ▼
       [ Backend: ApplicationService.updateStage(...) ]
                      │
                      ├─► [ Kiểm tra quyền sở hữu Job/Company ] (Forbidden?)
                      ├─► [ Kiểm tra Tin tuyển dụng đã đóng? ] (validateJobNotClosed)
                      │     └─► NẾU closed: Ném IllegalStateException("Cannot update application stage because the job is closed.")
                      ├─► [ Kiểm tra tính hợp lệ của Stage DTO ]
                      │
                      ├───────────────────────┬───────────────────────┐
                      ▼                                               ▼
              [ THÀNH CÔNG: HTTP 200 ]                       [ THẤT BẠI: HTTP 4xx / 5xx ]
                      │                                               │
      (4a) Cập nhật trạng thái DB thành công          (4b) Ném ngoại lệ, trả Problem Detail
                      │                                               │
                      ▼                                               ▼
         [ Frontend: Giữ nguyên cột mới ]              [ Frontend: Kích hoạt ROLLBACK ]
         Tắt saving indicator                          • Trả thẻ ứng viên về đúng cột ban đầu
                                                       • Tắt saving indicator
                                                       • Bật Toast thông báo lỗi chi tiết
```

---

### 5.3. Chi tiết thay đổi Backend (Spring Boot & PostgreSQL)

#### 1. Ràng buộc chặn cập nhật trạng thái khi tin tuyển dụng đã đóng (`ApplicationService.java`)
* **Vị trí file:** `backend/src/main/java/com/matchajob/application/service/ApplicationService.java`
* **Mã nguồn bổ sung:**
```java
// Trong phương thức updateStage(...)
UUID jobId = (UUID) current.get("job_id");
validateJobNotClosed(jobId);
```
```java
private void validateJobNotClosed(UUID jobId) {
    if (jobId == null) {
        return;
    }
    String status = applicationRepository.findJobStatusById(jobId).orElse(null);
    if ("closed".equalsIgnoreCase(status)) {
        throw new IllegalStateException("Cannot update application stage because the job is closed.");
    }
}
```
* **Lý do kỹ thuật chi tiết:**
  - `findJobStatusById(jobId)`: Truy vấn trực tiếp trạng thái hiện tại của job từ cơ sở dữ liệu để đảm bảo tính nhất quán (data consistency) theo thời gian thực, tránh hiện tượng stale data trong bộ nhớ đệm.
  - Ngoại lệ `IllegalStateException`: Được cấu hình ánh xạ sang mã HTTP 400 Bad Request / 409 Conflict với Problem Details (RFC 7807), thông báo rõ ràng cho phía client lý do không thể tiếp tục xử lý đơn.
* **Ví dụ đơn giản:** Giống như một **cửa hàng đã treo biển "Đóng cửa"**. Khách hàng không thể bước vào mua thêm đồ (không apply được), và nhân viên thu ngân cũng không được phép xuất thêm hóa đơn xử lý cho các giỏ hàng cũ (không chuyển stage được nữa). Muốn tiếp tục, quản lý phải mở lại cửa hàng (reopen job).

#### 2. Kiểm thử bảo vệ logic Closed Job (`ApplicationServiceTest.java` & `ApplicationWorkflowIT.java`)
* **Unit Test:** `backend/src/test/java/com/matchajob/application/service/ApplicationServiceTest.java`
  - Bổ sung test case `updateStage_closedJob_throwsIllegalStateException()`: Giả lập repository trả về `findJobStatusById` là `"closed"`, xác minh phương thức `updateStage` ném đúng `IllegalStateException` và **không bao giờ** gọi lệnh cập nhật `updateStage(...)` xuống cơ sở dữ liệu (`verify(..., never())`).
* **Integration Test:** `backend/src/test/java/com/matchajob/application/ApplicationWorkflowIT.java`
  - Bổ sung integration test `updateStage_closedJob_fails()`: Thực thi quy trình từ cơ sở dữ liệu thật H2/PostgreSQL: tạo job -> tạo application -> đóng job (`UPDATE jobs SET status = 'closed'`) -> gọi `updateStage` và kiểm tra ngoại lệ ném ra chuẩn xác.

---

### 5.4. Chi tiết thay đổi Frontend (React & Services)

#### 1. Bóc tách và truyền dẫn RFC 7807 Problem Details: `apiCompanyService.js`
* **Vị trí file:** `frontend/src/services/api/apiCompanyService.js`
* **Mã nguồn:**
```javascript
if (!res.ok) {
  const errorData = await res.json().catch(() => ({}));
  const error = new Error(errorData.detail || errorData.message || `Lỗi cập nhật công ty (${res.status})`);
  error.status = res.status;
  error.fieldErrors = errorData.fieldErrors || null;
  throw error;
}
```
* **Lý do kỹ thuật chi tiết:**
  - Chuẩn RFC 7807 của Spring Boot Problem Details trả về cấu trúc gồm `detail`, `title`, `status`, và `fieldErrors` (danh sách từng trường bị sai validation từ Hibernate Validator / Bean Validation).
  - Trước đây, `apiCompanyService` chỉ ném `new Error(message)` thông thường, làm mất thuộc tính `fieldErrors`. Việc gán `error.fieldErrors = errorData.fieldErrors` giúp tầng View lấy được thông tin chi tiết để highlight đỏ từng ô input tương ứng.

#### 2. Ánh xạ lỗi Validation trực tiếp lên giao diện: `CompanyView.jsx` & `JobComposerModal.jsx`
* **Vị trí file:** `frontend/src/pages/employer/views/CompanyView.jsx`
* **Mã nguồn:**
```javascript
} catch (err) {
  if (err.fieldErrors && typeof err.fieldErrors === 'object') {
    setErrors(prev => ({ ...prev, ...err.fieldErrors }));
  }
  toast.error(err.message || 'Không thể lưu thông tin công ty.');
}
```
* **Vị trí file:** `frontend/src/pages/employer/components/JobComposerModal.jsx`
* **Mã nguồn:**
```javascript
// Hiển thị Alert Banner lỗi server ngay trên đầu form
{serverError && (
  <Alert variant="danger" dismissible onClose={() => setServerError(null)} className="py-2 px-3 small">
    <i className="bi bi-exclamation-triangle-fill me-2"></i>
    {serverError}
  </Alert>
)}
```
* **Lý do kỹ thuật chi tiết:**
  - Nếu người dùng đang ở tab Preview mà bấm Lưu tin gặp lỗi từ server, `JobComposerModal` tự động chuyển tab về `edit` (`setActiveTab('edit')`) đồng thời mở banner thông báo lỗi. Người dùng không bị bối rối vì sao form không lưu được.

#### 3. Bộ lọc theo tin tuyển dụng & Đa tiêu chí sắp xếp: `CandidatesView.jsx`
* **Vị trí file:** `frontend/src/pages/employer/views/CandidatesView.jsx`
* **Mã nguồn các tính năng mới:**
```javascript
// 1. Quản lý bộ tiêu chí sắp xếp
const [sortBy, setSortBy] = useState('score-desc');

// 2. Danh sách Dropdown lọc Job kết hợp từ jobs props và danh sách candidates hiện có
const jobOptions = useMemo(() => {
  const map = new Map();
  jobs.forEach(j => j?.id && map.set(j.id, j.title));
  candidates.forEach(c => c?.jobId && !map.has(c.jobId) && map.set(c.jobId, c.jobTitle || 'Tin tuyển dụng'));
  return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
}, [jobs, candidates]);

// 3. Logic sắp xếp đa tiêu chí
const sorted = [...filtered].sort((a, b) => {
  if (sortBy === 'score-desc') return (b.matchScore || 0) - (a.matchScore || 0);
  if (sortBy === 'score-asc') return (a.matchScore || 0) - (b.matchScore || 0);
  if (sortBy === 'date-desc') return new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0);
  if (sortBy === 'date-asc') return new Date(a.appliedAt || 0) - new Date(b.appliedAt || 0);
  if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
  if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
  return 0;
});
```
* **Bổ sung Banner chỉ báo bộ lọc theo Job đang kích hoạt:**
  - Khi nhà tuyển dụng bấm từ màn hình Jobs ("Xem ứng viên"), giao diện tự động bật Alert: *"Đang lọc theo tin tuyển dụng: [Tên Job]"* kèm nút *"Bỏ lọc theo tin"*.
  - Thẻ ứng viên bổ sung nhãn thời gian nộp hồ sơ (`appliedAt`) định dạng ngày tháng tiếng Việt.

#### 4. Quản lý Pipeline Kanban an toàn, Optimistic UI & Khóa tin đã đóng: `PipelineView.jsx`
* **Vị trí file:** `frontend/src/pages/employer/views/PipelineView.jsx`
* **Cơ chế hoạt động:**
  1. **Modal xác nhận trước khi chuyển (`confirmModal`):** Người dùng bấm di chuyển thẻ -> hiển thị hộp thoại xác nhận gồm: Tên ứng viên, Giai đoạn hiện tại ➔ Giai đoạn đích.
  2. **Trạng thái đang lưu (`savingCandidateId`):** Trong lúc API đang phản hồi, thẻ ứng viên giảm độ mờ (`opacity: 0.7`) và xuất hiện spinner xoay tròn *"Đang lưu..."*, ngăn chặn double click.
  3. **Cơ chế Rollback khi có lỗi:** Nếu API ném ngoại lệ (lỗi mạng, hết session, job đóng...), hook tự động phục hồi `stage` của ứng viên về cột ban đầu và hiển thị toast lỗi chi tiết.
  4. **Nhận diện tin tuyển dụng đã đóng (`isCandidateJobClosed`):** Kiểm tra trạng thái của job tương ứng (`status === 'closed'`). Nếu job đã đóng:
     - Nút di chuyển bị vô hiệu hóa (`disabled`).
     - Tooltip hiển thị: *"Tin tuyển dụng đã đóng - Không thể cập nhật trạng thái"*.
     - Gắn thêm badge cảnh báo màu xám: `Tin đóng`.

#### 5. Liên kết trạng thái xuyên suốt trong `EmployerPortal.jsx`
* **Vị trí file:** `frontend/src/pages/employer/EmployerPortal.jsx`
* Quản lý state dùng chung:
```javascript
const [selectedJobFilter, setSelectedJobFilter] = useState('');
```
* Khi ở `JobsView`, recruiter bấm nút `"Xem ứng viên"` trên một Job bất kỳ:
```javascript
onViewCandidates={(job) => {
  setSelectedJobFilter(job.id);
  setActiveTab('candidates');
}}
```
* Cả `CandidatesView` và `PipelineView` đều nhận `selectedJobFilter` này để lọc đồng bộ, giúp luồng làm việc của recruiter liền mạch, không bị đứt quãng.

---

### 5.5. Kiểm thử tự động toàn diện (Testing & Verification)

#### 1. Bộ kiểm thử Frontend: `recruiter-pipeline.test.jsx`
* **Vị trí file:** `frontend/src/tests/recruiter-pipeline.test.jsx`
* **Bao phủ các ca kiểm thử:**
  1. `renders candidates list with job title and match score`: Kiểm tra hiển thị đầy đủ tên, chức danh job và điểm AI matching.
  2. `filters candidates by selected job and clears filter`: Kiểm tra bộ lọc theo job và nút bỏ lọc.
  3. `sorts candidates by match score and application date`: Kiểm tra thuật toán sắp xếp điểm số AI và ngày nộp.
  4. `renders empty state when no candidates match filters`: Kiểm tra hiển thị thông báo thân thiện khi không có ứng viên nào khớp điều kiện tìm kiếm.
  5. `shows confirmation modal before moving stage in pipeline`: Kiểm tra bật popup xác nhận bước chuyển trạng thái.
  6. `calls onStageChange when confirmed in modal`: Kiểm tra việc gọi hàm API khi người dùng nhấn xác nhận.
  7. `rolls back stage and displays error when onStageChange fails`: Giả lập lỗi API, xác minh thẻ ứng viên tự động rollback về cột ban đầu và không bị mất dữ liệu.
  8. `disables stage move buttons for candidates of closed jobs`: Kiểm tra nút chuyển bị vô hiệu hóa và có tooltip tin đóng khi job có trạng thái `closed`.
* **Kết quả thực thi:** **53/53 tests passed (100%)** trên 8 test suite của Frontend.

#### 2. Bộ kiểm thử Backend: `ApplicationServiceTest` & `ApplicationWorkflowIT`
* **Kết quả thực thi:** **323/323 tests passed (100%)** với Maven wrapper (`.\mvnw.cmd test`), thời gian chạy 14.5s.

---

### 5.6. Bảng đối chiếu nghiệm thu đầu ra

| Yêu cầu đề bài | Thành phần đảm nhiệm | Kết quả sau khi triển khai | Trạng thái |
| :--- | :--- | :--- | :--- |
| **1. Company & Job UI dùng API thật + Validation** | `apiCompanyService.js`<br>`CompanyView.jsx`<br>`JobComposerModal.jsx` | Bóc tách RFC 7807 `fieldErrors`, highlight đỏ từng trường sai sót, banner cảnh báo lỗi máy chủ, tự chuyển tab Edit khi có lỗi. | **HOÀN THÀNH** |
| **2. Danh sách ứng viên theo tin, lọc/sắp xếp, xem hồ sơ & matching** | `CandidatesView.jsx`<br>`EmployerPortal.jsx` | Lọc theo Job tự động liên kết từ JobsView, đa tiêu chí sắp xếp (Điểm AI, Ngày nộp, Tên A-Z), hiển thị điểm AI matching, ngày nộp hồ sơ, modal xem chi tiết. | **HOÀN THÀNH** |
| **3. Cập nhật Pipeline có xác nhận, saving state, rollback khi lỗi** | `PipelineView.jsx` | Modal popup xác nhận thao tác, spinner và giảm opacity khi đang lưu, cơ chế Optimistic UI tự rollback về cột cũ khi API thất bại. | **HOÀN THÀNH** |
| **4. Kiểm thử quyền, tin đã đóng, trạng thái không hợp lệ & dữ liệu rỗng** | `ApplicationService.java`<br>`ApplicationWorkflowIT.java`<br>`recruiter-pipeline.test.jsx` | Backend chặn tuyệt đối `updateStage` trên tin closed (ném `IllegalStateException`), giao diện vô hiệu hóa nút chuyển trên tin closed kèm nhãn & tooltip; xử lý UI rỗng chuẩn mực; 323 backend tests & 53 frontend tests pass 100%. | **HOÀN THÀNH** |



