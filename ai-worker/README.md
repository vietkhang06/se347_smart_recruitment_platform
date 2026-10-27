# MatchaJob AI Worker — Foundation & Health Check (Phase 2)

Dịch vụ vi mô tính toán trí tuệ nhân tạo phi trạng thái (Stateless AI Compute Microservice) cho nền tảng MatchaJob (SE347).

---

## 1. Cấu Trúc Thư Mục
```text
ai-worker/
├── Dockerfile                   # Dockerfile nền python:3.11-slim (Debian Bookworm)
├── requirements.txt             # Thư viện ghim phiên bản ổn định cho Pha 2
├── README.md                    # Tài liệu hướng dẫn
├── app/
│   ├── main.py                  # Điểm khởi chạy FastAPI app & lifespan
│   ├── core/
│   │   ├── config.py            # Quản lý Settings bằng pydantic-settings
│   │   └── logging.py           # Structured JSON logging
│   ├── schemas/
│   │   ├── health.py            # Pydantic schemas cho health endpoints
│   │   └── errors.py            # RFC 7807 Problem Details schemas
│   └── api/
│       └── health.py            # Endpoints: /health, /health/live, /health/ready, /health/startup
└── tests/
    └── test_health.py           # Unit tests kiểm tra sức khỏe và vòng đời
```

---

## 2. Các Endpoint Kiểm Tra Sức Khỏe (Health Probes)
* `GET /health`: Tổng quan trạng thái sức khỏe, phiên bản và thời gian uptime (không để lộ API key hoặc secrets).
* `GET /health/live`: Liveness probe (kiểm tra tiến trình còn sống, không gọi I/O bên ngoài).
* `GET /health/ready`: Readiness probe (trả về `200` khi sẵn sàng nhận việc, `503` khi chưa sẵn sàng hoặc đang tắt).
* `GET /health/startup`: Startup probe (xác nhận hoàn tất nạp cấu hình ban đầu).

---

## 3. Môi Trường Vận Hành & Ghi Chú Phụ Thuộc (Dependencies)
- **Môi trường Container:** `python:3.11-slim` (nền tảng Debian Bookworm).
- **Môi trường Host phát triển:** Python 3.12 LTS.
- **Thư viện chính:** FastAPI 0.111.1, Uvicorn 0.30.3, Pydantic 2.8.2, Pydantic-Settings 2.3.4, HTTPX 0.27.0.
- **Kế hoạch Pha 3:** Các phiên bản hiện tại được giữ ổn định cho Pha 2 Foundation. Trước khi bước vào Pha 3 (xử lý file CV và kết nối mô hình LLM/Embeddings), sẽ tiến hành rà soát bảo mật và độ tươi mới của dependencies.

---

## 4. Khởi Chạy Cục Bộ (Local Run)
```bash
# 1. Kích hoạt môi trường ảo Python
python -m venv .venv
source .venv/bin/activate  # Trên Linux/macOS
.venv\Scripts\activate     # Trên Windows

# 2. Cài đặt dependencies
pip install -r requirements.txt

# 3. Khởi chạy Uvicorn trên cổng 8001 (hoặc 8000)
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

---

## 5. Chạy Kiểm Thử (Tests)
```bash
pytest tests/ -v
```


---

## 6. Đo Lường & Bằng Chứng Thời Gian Xử Lý (Processing Time Benchmarks)

* **Lệnh chạy đo:**
  ```powershell
  $env:PYTHONPATH="ai-worker"; uv run --with-requirements ai-worker/requirements.txt python ai-worker/benchmarks/benchmark_processing_time.py 5 50
  ```
* **Môi trường:** Python 3.12 LTS, Windows x86_64, `time.perf_counter()`.
* **Cấu hình:** 5 lần warm-up, 50 lần lặp chính thức mỗi tác vụ.

| Phân đoạn xử lý | Tệp / Đầu vào | Lần lặp | Mean (ms) | p50 (ms) | p95 (ms) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Document Extraction** | `cv_en_backend.pdf` (873 B) | 50 | 0.729 | 0.698 | 0.806 |
| **Document Extraction** | `cv_minimal.pdf` (598 B) | 50 | 0.449 | 0.435 | 0.552 |
| **Document Extraction** | `cv_en_backend.docx` (36.9 KB) | 50 | 8.245 | 5.783 | 24.974 |
| **Document Extraction** | `cv_vi_backend.docx` (36.9 KB) | 50 | 8.385 | 5.815 | 24.449 |
| **Normalization** | Chuẩn hóa CV Tiếng Anh (`cv_en_backend`, ~1.2 KB) | 50 | 2.021 | 2.015 | 2.054 |
| **Normalization** | Chuẩn hóa CV Tiếng Việt (`cv_vi_backend`, ~1.2 KB) | 50 | 1.384 | 1.376 | 1.411 |
| **Normalization** | Chuẩn hóa JD Tiếng Anh (`jd_en_freeform.txt`, 633 B) | 50 | 1.899 | 1.894 | 1.928 |
| **Normalization** | Chuẩn hóa JD Tiếng Việt (`jd_vi_freeform.txt`, 839 B) | 50 | 1.842 | 1.836 | 1.885 |
| **Baseline Matching** | Tính điểm đối sánh Tiếng Anh (EN candidate & JD) | 50 | 2.315 | 2.304 | 2.368 |
| **Baseline Matching** | Tính điểm đối sánh Tiếng Việt (VI candidate & JD) | 50 | 1.713 | 1.702 | 1.793 |
| **End-to-End Pipeline** | Trọn gói Tiếng Anh (DOCX bóc tách → Chuẩn hóa → Chấm điểm) | 50 | 12.482 | 9.868 | 30.263 |
| **End-to-End Pipeline** | Trọn gói Tiếng Việt (DOCX bóc tách → Chuẩn hóa → Chấm điểm) | 50 | 11.475 | 9.016 | 27.269 |
