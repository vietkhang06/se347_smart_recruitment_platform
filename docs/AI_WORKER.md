# MatchaJob — Kiến Trúc Nền Tảng AI Worker (AI Worker Foundation Architecture)

> **Tài liệu Kỹ thuật Pha 1 (Phase 1 — Technical Architecture Document)**  
> **Phiên bản:** 1.1 (Hiệu chỉnh Tính Nhất Quán & Khắc Phục Lệch Kiến Trúc)  
> **Dự án:** MatchaJob — Nền tảng tuyển dụng thông minh (SE347.R11 - Nhóm 7)  
> **Trạng thái:** Hoàn tất rà soát Pha 1 (Phase 1 Final Architecture — Ready for Phase 2 Implementation)  
> **Người thực hiện:** Khải Vạn (AI Worker Architect & Engineer)  
> **Tham chiếu nghiên cứu:** GPT-Researcher targeted synthesis report (`research_outputs/targeted_corrections_research.md`, `research_outputs/ai_worker_research.md`), `compose.yaml`, `.env.example`, `scripts/start-dev.ps1`, `docs/development-environment.md`, `Thiết Kế CSDL - MatchaJob.pdf`.

---

## 1. Mục Đích và Trách Nhiệm (Purpose & Responsibilities)

### 1.1. Phạm vi Trách nhiệm (What the AI Worker IS responsible for)
AI Worker là dịch vụ vi mô tính toán chuyên biệt (Specialized Stateless Compute Worker) phụ trách xử lý trí tuệ nhân tạo và xử lý ngôn ngữ tự nhiên:
1. **Trích xuất & Chuẩn hóa Tài liệu (Document Extraction & Normalization):** Tiếp nhận nội dung văn bản CV (PDF, DOCX) và tin tuyển dụng (JD) từ Backend, bóc tách thực thể và chuẩn hóa cấu trúc JSON theo lược đồ nghiệp vụ (kỹ năng, kinh nghiệm, học vấn, dự án).
2. **Tạo Vector Biểu diễn Ngữ nghĩa (Vector Embedding Generation):** Chuyển đổi khối văn bản CV và JD thành vector đặc trưng (hỗ trợ cả OpenAI 1536 chiều và BGE-M3/Nomic 1024 chiều theo thiết kế CSDL).
3. **Đối sánh & Tính điểm Đa tiêu chí (Multi-Factor Matching & Scoring):** Thực hiện thuật toán đối sánh giữa CV và JD theo công thức trọng số (`core_score` 85%, `github_score` 15%), cung cấp trích dẫn bằng chứng minh bạch (grounded evidence snippets) cho từng tiêu chí.
4. **Phân tích Tín hiệu Kỹ thuật GitHub (GitHub Signal Analytics):** Thu thập và tính toán chỉ số năng lực thực tế từ tài khoản GitHub công khai của ứng viên.
5. **Cung cấp Giao diện Kiểm tra Vận hành (Operational Health Probes):** Cung cấp các endpoint thăm dò sức khỏe (`/health`, `/health/live`, `/health/ready`, `/health/startup`) phục vụ giám sát nội bộ từ Backend và Docker orchestration.

### 1.2. Ngoài phạm vi Trách nhiệm (What the AI Worker is NOT responsible for)
Để đảm bảo tính độc lập và toàn vẹn kiến trúc (Zero Contradiction):
* **Tuyệt đối KHÔNG kết nối trực tiếp đến PostgreSQL:** AI Worker là **stateless**. Toàn bộ dữ liệu vào/ra đều qua REST request/response với Backend. AI Worker không có driver CSDL (không dùng asyncpg hay SQLAlchemy), không lưu trữ thông tin kết nối database, không trực tiếp truy vấn hay ghi vào bảng `processing_jobs` hoặc `embeddings`.
* **Không quản lý phiên đăng nhập và bảo mật:** Không xử lý người dùng, mật khẩu, JWT hay phân quyền RBAC.
* **Không làm chủ cơ sở dữ liệu giao dịch (System of Record):** Mọi hành vi lưu trữ giao dịch và bản sao bất biến đều do Spring Boot Backend thực hiện.
* **Không cung cấp public API cho trình duyệt:** Trình duyệt người dùng không bao giờ gọi trực tiếp AI Worker. AI Worker chỉ lắng nghe trong mạng nội bộ Docker (`matchajob_network`).

---

## 2. Vai Trò Kiến Trúc trong Hệ Thống (Architectural Role)

Trong cấu trúc tổng thể của MatchaJob, hệ thống áp dụng mô hình **Decoupled Polyglot Architecture**:
* **Backend (Spring Boot 3 / Java 21):** Giữ vai trò Hạt nhân Giao dịch (Transactional System-of-Record Orchestrator). Quản lý 100% việc đọc/ghi PostgreSQL và điều phối tác vụ.
* **AI Worker (FastAPI / Python 3.11+):** Giữ vai trò Máy trạm Tính toán Phi trạng thái (Stateless Compute Engine). Tiếp nhận dữ liệu qua HTTP từ Backend, trả về kết quả JSON đã phân tích.

```
+-------------------------------------------------------------------------------+
|                            Client Web Browser                                 |
+-------------------------------------------------------------------------------+
                                        |
                                        v (Port 5173 / HTTP)
+-------------------------------------------------------------------------------+
|                        Frontend (Vite + React 19)                             |
+-------------------------------------------------------------------------------+
                                        |
                                        v (Port 8081 / REST API)
+-------------------------------------------------------------------------------+
|                        Backend (Spring Boot 3)                                |
|  - Sole System-of-Record (Manages 100% PostgreSQL Transactions)                |
|  - Creates & updates processing_jobs records                                 |
|  - Dispatches compute payloads to AI Worker via RestClient                   |
+-------------------------------------------------------------------------------+
       |                                                 |
       | JDBC (Container: 5432 / Host: 5433)             | HTTP Internal
       v                                                 v (Container Port: 8000)
+-----------------------------+         +---------------------------------------+
|  PostgreSQL 16 + pgvector   |         |         AI Worker (FastAPI)           |
|  - 42 Physical Tables       |         |  - Pure Stateless Compute             |
|  - HNSW Vector Indexes      |         |  - No Database Connection             |
|  - Owned by Spring Flyway   |         |  - Invoked strictly by Backend        |
+-----------------------------+         +---------------------------------------+
```

### Phân định Rõ ràng 3 Mức độ Thực tế trong Dự án:
* **[CONFIRMED] Đã xác nhận trên Repository:**
  * Dịch vụ: `ai-worker` (mạng nội bộ `matchajob_network`).
  * Cổng container nội bộ: `8000` (Uvicorn bind `0.0.0.0:8000`).
  * Cổng host ánh xạ ra ngoài: `8001` (`${AI_WORKER_HOST_PORT:-8001}:8000`).
  * Giao tiếp giữa Container với Container: Backend gọi `http://ai-worker:8000`.
  * Giao tiếp từ Host (máy dev) tới Worker: `http://localhost:8001`.
* **[RECOMMENDED] Đề xuất:**
  * Tách biệt 4 endpoint health check (`/health`, `/health/live`, `/health/ready`, `/health/startup`).
  * Sử dụng Docker native healthcheck bằng module chuẩn `python urllib` thay vì phụ thuộc `curl`.
* **[FUTURE - PHASE 3] Pha sau:**
  * Hiện thực hóa pipeline bóc tách PDF/DOCX sang cấu trúc JSON, sinh embedding vector, tính ma trận matching điểm và trích xuất bằng chứng.

---

## 3. Quyết Định Công Nghệ (Technology Decisions)

| Thành phần | Lựa chọn công nghệ | Căn cứ dự án & Bằng chứng nghiên cứu GPT-Researcher |
| :--- | :--- | :--- |
| **Ngôn ngữ** | Python 3.11 / 3.12 | Hệ sinh thái AI/NLP phong phú; tương thích với image `python:3.11-slim`. |
| **Web Framework** | FastAPI (v0.111.1) | Asynchronous I/O hiệu năng cao; tài liệu `development-environment.md` đã chỉ định; tự động sinh OpenAPI spec. |
| **ASGI Server** | Uvicorn (v0.30.3) | Máy chủ ASGI tiêu chuẩn, tốc độ cao, quản lý signal tiến trình chuẩn POSIX. |
| **Data Validation** | Pydantic v2 (v2.8.2) | Xác thực dữ liệu đầu vào/ra nghiêm ngặt, parse JSON nhanh vượt trội nhờ lõi Rust. |
| **Client HTTP** | HTTPX (v0.27.0) | Gọi bất đồng bộ tới các upstream AI Provider (OpenAI, Gemini) hoặc GitHub API. |
| **Quản lý Môi trường** | `pydantic-settings` (v2.3.4) & `python-dotenv` (v1.0.1) | Quản lý biến môi trường an toàn kiểu tĩnh (type-safe), tương thích 100% với `.env.example`. |

---

## 4. Cấu Trúc Dự Án Đề Xuất (Project Structure)

Cấu trúc mã nguồn chuẩn hóa cho thư mục `ai-worker/` cho Pha 2:

```text
ai-worker/
├── Dockerfile                   # Multi-stage Dockerfile nền python:3.11-slim (non-root)
├── requirements.txt             # Pinned versions cố định, tái lập 100%
├── README.md                    # Hướng dẫn chạy local & test
└── app/
    ├── __init__.py
    ├── main.py                  # Khởi tạo FastAPI app, lifespan handler, router
    ├── core/
    │   ├── __init__.py
    │   ├── config.py            # Pydantic BaseSettings đọc biến môi trường
    │   └── logging.py           # Structured JSON logging
    ├── api/
    │   ├── __init__.py
    │   └── health.py            # Endpoints /health, /health/live, /health/ready, /health/startup
    └── schemas/
        ├── __init__.py
        ├── health.py            # Pydantic models cho Health responses
        └── errors.py            # RFC 7807 Problem Details schemas
```

> **Quy tắc Biên giới Pha 1 & 2:** Tuyệt đối không tạo các thư mục kết nối CSDL (`db/`, `models/orm/`) hay thư mục nghiệp vụ AI (`services/matching/`, `services/parser/`) trong Pha 2.

---

## 5. Cấu Hình & Biến Môi Trường (Configuration & Environment Variables)

Phân loại cấu hình chi tiết theo nguyên tắc **12-Factor App**:

### 5.1. Bảng Biến Môi Trường Thực Tế

| Tên Biến | Giá trị Mặc định Dev | Mục đích & Phạm vi | Phân loại |
| :--- | :--- | :--- | :--- |
| `APP_ENV` | `development` | Môi trường triển khai (`development`, `production`) | Bắt buộc |
| `AI_WORKER_HOST_PORT` | `8001` | Cổng ánh xạ trên máy host để dev kiểm tra | Bắt buộc |
| `AI_WORKER_CONTAINER_PORT` | `8000` | Cổng HTTP mà Uvicorn lắng nghe trong container | Bắt buộc |
| `LOG_LEVEL` | `INFO` | Mức độ log (`DEBUG`, `INFO`, `WARNING`, `ERROR`) | Tùy chọn |
| `DEBUG` | `true` | Bật chế độ debug khi chạy local | Dev-only |
| `AI_PROVIDER` | `openai` | Nhà cung cấp LLM | Tương lai (Pha 3) |
| `AI_MODEL` | `gpt-4o-mini` | Tên mô hình ngôn ngữ | Tương lai (Pha 3) |
| `AI_API_KEY` | *(khóa API)* | Khóa xác thực nhà cung cấp LLM | Tương lai (Pha 3) |

> **Lưu ý Kiến trúc:** Loại bỏ biến `CORS_ORIGINS` khỏi AI Worker vì AI Worker là dịch vụ nội bộ (internal service), không bao giờ nhận request trực tiếp từ trình duyệt web.

---

## 6. Thiết Kế Kiểm Tra Sức Khỏe (Health Check Design)

### 6.1. Chi tiết các Endpoint Health Check
AI Worker thiết lập 4 endpoint rõ ràng:

1. **`GET /health` (Aggregate Health Probe):**
   * **Mục đích:** Cung cấp thông tin tổng thể cho Backend và người vận hành.
   * **Mã HTTP:** `200 OK`.
   * **JSON Response:**
     ```json
     {
       "status": "healthy",
       "service": "matchajob-ai-worker",
       "version": "1.0.0",
       "environment": "development",
       "uptime_seconds": 45.2
     }
     ```
2. **`GET /health/live` (Liveness Probe):**
   * **Mục đích:** Giám sát tiến trình Python/Uvicorn có đang sống và phản hồi I/O không (phát hiện deadlock hoặc crash).
   * **Nguyên tắc bất khả xâm phạm:** Không gọi bất kỳ tài nguyên mạng hay mô hình AI nào. Phản hồi hoàn toàn trong bộ nhớ (< 10ms).
   * **Mã HTTP:** `200 OK`.
   * **JSON Response:** `{"status": "alive"}`.
3. **`GET /health/ready` (Readiness Probe):**
   * **Mục đích:** Xác nhận worker đã sẵn sàng tiếp nhận yêu cầu phân tích từ Backend hay chưa.
   * **Kiểm tra:** Cờ trạng thái `is_ready = True` và không nằm trong trạng thái graceful shutdown.
   * **Mã HTTP:** `200 OK` (hoặc `503 Service Unavailable` nếu đang tắt).
   * **JSON Response:** `{"status": "ready"}`.
4. **`GET /health/startup` (Startup Probe):**
   * **Mục đích:** Báo cáo tiến trình nạp cấu hình ban đầu hoàn tất.
   * **Mã HTTP:** `200 OK`.
   * **JSON Response:** `{"status": "initialized"}`.

### 6.2. Docker Container Health Check Phù Hợp Thực Tế
Image nền `python:3.11-slim` **không có sẵn `curl` hay `wget`**. Do đó, Docker healthcheck phải sử dụng module chuẩn `urllib.request` của Python:
```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=5s \
  CMD ["python", "-c", "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').getcode() == 200 else 1)"]
```
Cơ chế này hoàn toàn độc lập, không yêu cầu cài thêm gói ngoài, không gây phình to image và an toàn bảo mật.

---

## 7. Vòng Đời Hoạt Động của Worker (Worker Lifecycle)

1. **Khởi động (Startup):**
   * Sử dụng `@asynccontextmanager` (`lifespan`) của FastAPI.
   * Đọc và xác thực cấu hình từ `Settings`.
   * Khởi tạo structured logging.
   * Đặt cờ `state.is_ready = True`.
2. **Vận hành (Normal Operation):**
   * Xử lý các request thuần I/O trên event loop.
   * Khi thực hiện các tác vụ tính toán nặng (trong Pha 3), sử dụng `starlette.concurrency.run_in_threadpool` để giải phóng GIL và không phong tỏa event loop.
3. **Dừng hoạt động an toàn (Graceful Shutdown):**
   * Khi nhận tín hiệu `SIGTERM`, lập tức chuyển `state.is_ready = False` để `/health/ready` trả về `503`.
   * Chờ hoàn tất các request HTTP đang dở dang trước khi đóng tiến trình.

---

## 8. Ranh Giới Giao Tiếp Backend ↔ AI Worker (Communication Boundary)

### 8.1. Ranh giới Pha 2 (Baseline Infrastructure Connectivity)
* Backend gọi AI Worker qua HTTP REST nội bộ bằng Spring Boot 3 `RestClient`.
* Endpoint kiểm tra: `GET http://ai-worker:8000/health`.
* Không truyền nhận dữ liệu nghiệp vụ CV/JD trong Pha 2.

### 8.2. Ranh giới Pha 3 (Phase 3 Processing Boundary)
* Backend giữ vai trò điều phối viên:
  1. Khi người dùng nộp đơn hoặc đăng tin, Backend tạo bản ghi trong bảng `processing_jobs` với trạng thái `QUEUED`.
  2. Backend Native Pipeline Dispatcher đọc job và gửi payload văn bản sang AI Worker qua HTTP REST endpoint (ví dụ: `POST /api/v1/extract` hoặc `POST /api/v1/match`).
  3. AI Worker thực thi tính toán và trả về kết quả JSON có cấu trúc.
  4. Backend lưu kết quả vào `match_results`, `embeddings`, cập nhật `processing_jobs` thành `SUCCEEDED`.
* AI Worker **không bao giờ trực tiếp đọc hay ghi vào database**.

---

## 9. Xử Lý Lỗi và Ghi Nhật Ký (Error Handling & Logging)

* **Chuẩn Lỗi RFC 7807 (Problem Details):** Mọi lỗi đều trả về cấu trúc thống nhất (`type`, `title`, `status`, `detail`, `instance`).
* **Structured Logging:** Ghi log định dạng JSON gồm `timestamp`, `level`, `service`, `message`.
* Trích xuất tiêu đề `X-Request-ID` hoặc W3C `traceparent` do Backend gửi sang để đồng bộ trace giữa Java và Python.

---

## 10. Chiến Lược Phụ Thuộc Tái Lập (Reproducible Dependencies)

Để tránh hiện tượng trôi phiên bản (version drift), tệp `ai-worker/requirements.txt` cho Pha 2 ghim chính xác phiên bản đã được kiểm chứng tương thích:
```text
fastapi==0.111.1
uvicorn[standard]==0.30.3
pydantic==2.8.2
pydantic-settings==2.3.4
python-dotenv==1.0.1
httpx==0.27.0
```

---

## 11. Kế Hoạch Hiện Thực Hóa Pha 2 (Phase 2 Implementation Plan)

### Mục tiêu: Khởi tạo AI Worker Foundation + Health Check
Xây dựng khung ứng dụng FastAPI hoàn chỉnh, build image Docker thành công, khởi chạy độc lập và vượt qua kiểm tra sức khỏe từ host (`http://localhost:8001/health`) và container (`http://ai-worker:8000/health`).

### Danh sách tệp cần tạo mới trong `ai-worker/`:
1. `requirements.txt`: Các thư viện ghim cứng phiên bản như trên.
2. `Dockerfile`: Multi-stage build trên nền `python:3.11-slim`, tạo non-root user, tích hợp healthcheck qua Python urllib.
3. `app/__init__.py`: Package init.
4. `app/core/__init__.py` & `app/core/config.py`: `Settings` class kế thừa `BaseSettings`.
5. `app/core/logging.py`: Structured logger.
6. `app/schemas/__init__.py`, `app/schemas/health.py`: Pydantic models cho health responses.
7. `app/schemas/errors.py`: Pydantic models cho RFC 7807 Problem Details.
8. `app/api/__init__.py`, `app/api/health.py`: APIRouter cho `/health`, `/health/live`, `/health/ready`, `/health/startup`.
9. `app/main.py`: FastAPI app với lifespan handler, gắn router health.
10. `README.md`: Hướng dẫn chạy local (`uvicorn app.main:app --port 8000`) và Docker.

---

## 12. Bằng Chứng Nghiên Cứu Xác Thực (Verifiable Research Evidence)

1. **FastAPI Containerization & Lifespan Management:**  
   * Nguồn: Ramírez, S. (2026). *FastAPI in Containers - Docker*. FastAPI Documentation. URL: [https://fastapi.tiangolo.com/deployment/docker/](https://fastapi.tiangolo.com/deployment/docker/)  
   * Căn cứ: Khuyến nghị sử dụng lifespan context manager thay cho sự kiện startup/shutdown cũ; hướng dẫn tối ưu Dockerfile cho Python ASGI.
2. **Zero-Dependency Docker Healthchecks:**  
   * Nguồn: Docker Documentation (2026). *Dockerfile reference: HEALTHCHECK*. URL: [https://docs.docker.com/reference/dockerfile/#healthcheck](https://docs.docker.com/reference/dockerfile/#healthcheck) & Python Software Foundation (2026). *urllib.request — Extensible library for opening URLs*. URL: [https://docs.python.org/3/library/urllib.request.html](https://docs.python.org/3/library/urllib.request.html)  
   * Căn cứ: Xác thực giải pháp dùng `python -c "import urllib.request..."` để kiểm tra container sức khỏe mà không cần cài thêm `curl` vào image `python:3.11-slim`.
3. **Decoupled Liveness vs Readiness Probes:**  
   * Nguồn: Kubernetes Documentation (2026). *Configure Liveness, Readiness and Startup Probes*. URL: [https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)  
   * Căn cứ: Chứng minh liveness probe không được kiểm tra phụ thuộc bên ngoài để ngăn chặn cascade crash-loop.
