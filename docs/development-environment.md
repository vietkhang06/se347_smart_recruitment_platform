# MatchaJob - Hướng Dẫn Môi Trường Phát Triển (Development Environment)

Tài liệu này hướng dẫn thiết lập, vận hành và kiểm tra môi trường phát triển cục bộ của dự án **MatchaJob** bằng Docker và Docker Compose.

---

## 1. Điều Kiện Cài Đặt (Prerequisites)

Trước khi bắt đầu, đảm bảo máy phát triển đã cài đặt:
- **Hệ điều hành**: Windows 10/11 (khuyến nghị kích hoạt WSL2).
- **Docker Desktop**: Phiên bản 20.x trở lên (đã kiểm tra tương thích với Docker Engine v29+).
- **Docker Compose**: Phiên bản v2.x trở lên (đã kiểm tra tương thích với Compose v5.x / v2.x).
- **Node.js**: (Tùy chọn nếu chạy ngoài container) Node v20+ hoặc v22+.

---

## 2. Bảng Cổng Kết Nối & Tránh Xung Đột (Port Conflict Prevention with MidCV)

Để đảm bảo có thể chạy đồng thời dự án **MatchaJob** và dự án Đồ Án 1 (**MidCV / se121-midcv-ai-recruitment-platform**) trên cùng một máy mà không xảy ra bất kỳ xung đột cổng nào:

| Dịch vụ | MidCV Port (Đồ Án 1) | MatchaJob Host Port | Container Port | Public / Browser URL | Trạng thái hiện tại |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Frontend UI** | `3000` (Next.js) | `5173` (Vite) | `5173` | `http://localhost:5173` | ✅ Sẵn sàng (Active) |
| **Database** | `5432` (PostgreSQL) | `5433` | `5432` | `localhost:5433` | ✅ Healthy (`pg_isready`) |
| **Backend API** | `8080` (Spring Boot) | `8081` | `8080` | `http://localhost:8081/api` | Mã nguồn hoàn tất (Chờ Docker runtime) |
| **AI Worker** | `8000` (FastAPI) | `8001` | `8000` | `http://localhost:8001` | Mã nguồn hoàn tất (Chờ Docker runtime) |

### Quy tắc định tuyến mạng:
- **Trình duyệt Web** kết nối Frontend tại: `http://localhost:5173`.
- **Trình duyệt Web** gọi API Backend tại: `http://localhost:8081/api` (thông qua biến `VITE_API_BASE_URL`).
- **Backend container** kết nối Database thông qua hostname nội bộ `database:5432` trong mạng `matchajob_network`.
- **Backend container** gọi AI Worker thông qua hostname nội bộ `http://ai-worker:8000`.
- Tuyệt đối không sử dụng `localhost` cho giao tiếp giữa các container bên trong Docker network `matchajob_network`.

---

## 3. Quản Lý Biến Môi Trường (Environment Configuration)

Tất cả cấu hình được quản lý qua file `.env` ở thư mục gốc của repository.

### Khởi tạo file `.env`:
Sao chép từ file mẫu `.env.example`:
```bash
# Trên Windows PowerShell
Copy-Item .env.example .env

# Hoặc trên Bash / CMD
cp .env.example .env
```

### Danh mục biến môi trường chuẩn:
- `COMPOSE_PROJECT_NAME`: Tên project Docker (`matchajob`).
- `APP_ENV`: Môi trường triển khai (`development`).
- `FRONTEND_HOST_PORT` / `FRONTEND_CONTAINER_PORT`: Cổng Frontend (`5173`).
- `VITE_API_BASE_URL`: Endpoint API backend mà trình duyệt sẽ gửi request tới (`http://localhost:8081/api`).
- `POSTGRES_HOST_PORT` / `POSTGRES_CONTAINER_PORT`: Cổng database (`5433` trên host, `5432` trong container).
- `POSTGRES_DB`: Tên cơ sở dữ liệu (`matchajob_db`).
- `POSTGRES_USER`: Tên người dùng database (`matchajob_user`).
- `POSTGRES_PASSWORD`: Mật khẩu database (`matchajob_password`).
- `BACKEND_HOST_PORT` / `BACKEND_CONTAINER_PORT`: Cổng Backend (`8081` / `8080`).
- `SPRING_DATASOURCE_URL`: Chuỗi kết nối JDBC nội bộ (`jdbc:postgresql://database:5432/matchajob_db`).
- `AI_WORKER_BASE_URL`: Endpoint nội bộ để Backend gọi AI Worker (`http://ai-worker:8000`).
- `AI_WORKER_HOST_PORT` / `AI_WORKER_CONTAINER_PORT`: Cổng AI Worker (`8001` trên host, `8000` trong container).

> ⚠️ **Bảo mật**: Tuyệt đối không commit file `.env` hoặc các secret thực tế lên Git repository. `.env` đã được cấu hình trong `.gitignore`.

---

## 4. Hướng Dẫn Khởi Động & Vận Hành

### Bước 1: Build image
```bash
docker compose build
```

### Bước 2: Khởi động các service ở chế độ nền
```bash
docker compose up -d
```

### Bước 3: Kiểm tra trạng thái hoạt động và Health Check
```bash
docker compose ps
```
Cột `STATUS` của database hiển thị `healthy` và cổng ánh xạ là `0.0.0.0:5433->5432/tcp`.

### Bước 4: Xem logs thời gian thực
```bash
# Xem log toàn bộ hệ thống
docker compose logs -f

# Xem log riêng Database
docker compose logs -f database

# Xem log riêng Frontend
docker compose logs -f frontend
```

### Bước 5: Dừng hệ thống (Bảo toàn dữ liệu)
```bash
# Dừng các container nhưng giữ nguyên dữ liệu trong database volume
docker compose down

# HOẶC tạm dừng không hủy container
docker compose stop
```
> ⚠️ **Lưu ý**: KHÔNG dùng cờ `-v` (`docker compose down -v`) vì thao tác đó sẽ xóa sạch volume dữ liệu PostgreSQL (`matchajob_postgres_data`).

### 4.1. Kịch Bản Khởi Động Nhanh Bằng 1-Click (Scripts)
Dành cho người dùng Windows muốn khởi chạy và quản lý môi trường nhanh chóng với giao diện dòng lệnh màu sắc trực quan (như MidCV), tự động kiểm tra xung đột cổng, tối ưu bộ nhớ:

| Tập tin Launcher | Kịch bản PowerShell tương ứng | Chức năng | Thao tác |
| :--- | :--- | :--- | :--- |
| [`start-dev.bat`](file:///d:/UIT-2026_2027_HK1/Cn%20web/DA/29-9-26/se347_smart_recruitment_platform-main/start-dev.bat) | [`scripts/start-dev.ps1`](file:///d:/UIT-2026_2027_HK1/Cn%20web/DA/29-9-26/se347_smart_recruitment_platform-main/scripts/start-dev.ps1) | Kiểm tra Docker, Node, khởi động PostgreSQL Docker (port 5433), khởi động Frontend Vite (port 5173), kiểm tra Backend/AI Worker, mở trình duyệt. | Double-click `start-dev.bat` |
| [`stop-dev.bat`](file:///d:/UIT-2026_2027_HK1/Cn%20web/DA/29-9-26/se347_smart_recruitment_platform-main/stop-dev.bat) | [`scripts/stop-dev.ps1`](file:///d:/UIT-2026_2027_HK1/Cn%20web/DA/29-9-26/se347_smart_recruitment_platform-main/scripts/stop-dev.ps1) | Dừng an toàn Frontend (5173), Backend (8081), AI Worker (8001) và dừng container DB mà không làm mất dữ liệu. | Double-click `stop-dev.bat` |
| [`status-dev.bat`](file:///d:/UIT-2026_2027_HK1/Cn%20web/DA/29-9-26/se347_smart_recruitment_platform-main/status-dev.bat) | [`scripts/status-dev.ps1`](file:///d:/UIT-2026_2027_HK1/Cn%20web/DA/29-9-26/se347_smart_recruitment_platform-main/scripts/status-dev.ps1) | Kiểm tra trạng thái Docker, PostgreSQL, Frontend, Backend, AI Worker cùng bảng kiểm tra xung đột cổng MidCV. | Double-click `status-dev.bat` |
| [`reset-db-dev.bat`](file:///d:/UIT-2026_2027_HK1/Cn%20web/DA/29-9-26/se347_smart_recruitment_platform-main/reset-db-dev.bat) | [`scripts/reset-db-dev.ps1`](file:///d:/UIT-2026_2027_HK1/Cn%20web/DA/29-9-26/se347_smart_recruitment_platform-main/scripts/reset-db-dev.ps1) | Xóa volume database cũ (`matchajob_postgres_data`) và tái tạo database mới (yêu cầu xác nhận Y/N an toàn). | Double-click `reset-db-dev.bat` |


---

## 5. Kiểm Tra Chi Tiết Từng Service

### 5.1. Database (PostgreSQL 16 + pgvector)
Kiểm tra sức khỏe database từ container:
```bash
docker compose exec database pg_isready -U matchajob_user -d matchajob_db
```
*Kết quả:* `/var/run/postgresql:5432 - accepting connections`

Kiểm tra module pgvector đã sẵn sàng:
```bash
docker compose exec database psql -U matchajob_user -d matchajob_db -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
```
*Kết quả:* `vector | 0.8.7 | vector data type and ivfflat and hnsw access methods`

### 5.2. Frontend (Vite + React)
- Mở trình duyệt tại: `http://localhost:5173`.
- Hot reload: Chỉnh sửa bất kỳ file nào trong `frontend/src/` (ví dụ `frontend/src/App.jsx`), thay đổi sẽ được cập nhật tức thì trên trình duyệt nhờ cơ chế polling watch (`usePolling: true`) thích ứng với môi trường Windows bind-mount.

## 6. Trạng Thái Thực Tế & Phân Định Trách Nhiệm Pha 2

### Bảng trạng thái dịch vụ Pha 2:

| Service | Mã nguồn (Source) | Đóng gói (Build/Package) | Unit Tests | Runtime Kiểm Thử | Trạng thái Nghiệm thu |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **PostgreSQL Database** (`database`) | ✅ `compose.yaml` | ✅ `pgvector:pg16` | N/A | Cổng host 5433 | Chờ Docker Desktop khởi động |
| **Backend API** (`backend`) | ✅ Java 21 / Spring Boot 3.3.4 | ✅ JAR executable (`BUILD SUCCESS`) | ✅ 7 unit tests PASSED | Actuator `/api` ready | Chờ Docker & PostgreSQL để chạy integration test |
| **AI Worker** (`ai-worker`) | ✅ Python / FastAPI | ✅ Image Dockerfile ready | ✅ 6 unit tests PASSED | ✅ Native port 8001 (HTTP 200) | Chờ Docker runtime container |
| **Frontend Web** (`frontend`) | ✅ React 19 + Vite | ✅ `Dockerfile.dev` | N/A | Cổng host 5173 | Sẵn sàng |

---

## 7. Quy Trình Nghiệm Thu Cuối Cùng Cho Pha 2 (Final Acceptance Procedure)

Khi người dùng khởi động Docker Desktop trên máy trạm Windows, thực hiện đúng tuần tự 11 bước sau để nghiệm thu toàn bộ Pha 2:

### Bước 1 — Khởi động Docker Desktop
Người dùng khởi động ứng dụng Docker Desktop trên Windows (chấp thuận thông báo cập nhật hoặc UAC nếu được yêu cầu).

### Bước 2 — Xác thực Docker Engine sẵn sàng
```powershell
docker info
```

### Bước 3 — Khởi động cụm dịch vụ hệ thống
```powershell
cd "D:\Khai Van\KhaiVan Data\Dai Hoc\se347\repo"
docker compose up -d --build
```

### Bước 4 — Kiểm tra trạng thái containers và Health Checks
```powershell
docker compose ps
```
Xác nhận các service `database`, `backend`, `ai-worker`, và `frontend` đều ở trạng thái `running` (hoặc `healthy`).

### Bước 5 — Đảm bảo Test Database (`matchajob_test`) tồn tại
Database `matchajob_test` được tự động tạo qua init script `/docker-entrypoint-initdb.d/01-init-test-db.sh` khi khởi tạo volume mới.  
Trường hợp volume đã tồn tại từ trước, chạy script khởi tạo idempotent:
```powershell
.\scripts\init-test-db.ps1
```
Xác nhận database `matchajob_test` đã được tạo thành công (rỗng, không chứa bảng nghiệp vụ nào).

### Bước 6 — Chạy kiểm thử tích hợp thực tế với PostgreSQL
Thực thi kiểm thử tích hợp chuyên biệt kết nối trực tiếp vào PostgreSQL `matchajob_test`:
```powershell
cd backend
mvn verify -Pintegration-test
```
*(Lưu ý: Đối với vòng lặp phát triển thường ngày không cần DB, lệnh `mvn test` chỉ chạy các unit tests độc lập).*

### Bước 7 — Xác thực Flyway Migration V1
Kiểm tra bảng lịch sử di trú trong CSDL test:
```powershell
docker compose exec database psql -U matchajob_user -d matchajob_test -c "SELECT version, description, success FROM flyway_schema_history;"
```
Xác nhận bản ghi: `1 | init extensions | t`.

### Bước 8 — Xác thực Extension pgvector đã được kích hoạt
```powershell
docker compose exec database psql -U matchajob_user -d matchajob_test -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```
Xác nhận trả về extension `vector` (phiên bản thực tế `0.8.7`).

### Bước 9 — Xác thực AI Worker Health từ bên ngoài
```powershell
Invoke-RestMethod http://localhost:8001/health
Invoke-RestMethod http://localhost:8001/health/live
Invoke-RestMethod http://localhost:8001/health/ready
```

### Bước 10 — Xác thực Backend Actuator Health từ bên ngoài
```powershell
Invoke-RestMethod http://localhost:8081/api/actuator/health
Invoke-RestMethod http://localhost:8081/api/actuator/health/readiness
```

### Bước 11 — Xác thực mạng nội bộ Backend gọi sang AI Worker
Thực hiện lệnh kiểm tra mạng nội bộ từ bên trong container Backend gọi sang container AI Worker theo địa chỉ `http://ai-worker:8000`:
```powershell
docker compose exec backend wget -qO- http://ai-worker:8000/health
```
Kết quả trả về JSON `{"status":"healthy",...}` chứng minh thông tuyến hoàn toàn mạng Docker nội bộ.
