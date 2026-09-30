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
| **Backend API** | `8080` (Spring Boot) | `8081` | `8080` | `http://localhost:8081/api` | Chờ bàn giao source code |
| **AI Worker** | `8000` (FastAPI) | `8001` | `8000` | `http://localhost:8001` | Chờ bàn giao source code |

### Quy tắc định tuyến mạng:
- **Trình duyệt Web** kết nối Frontend tại: `http://localhost:5173`.
- **Trình duyệt Web** gọi API Backend tại: `http://localhost:8081/api` (thông qua biến `VITE_API_BASE_URL`).
- **Backend container** (khi có) kết nối Database thông qua hostname nội bộ `database:5432` trong mạng `matchajob_network`.
- **Backend container** (khi có) gọi AI Worker thông qua hostname nội bộ `http://ai-worker:8001`.
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
- `AI_WORKER_BASE_URL`: Endpoint nội bộ để Backend gọi AI Worker (`http://ai-worker:8001`).
- `AI_WORKER_HOST_PORT` / `AI_WORKER_CONTAINER_PORT`: Cổng AI Worker (`8001`).

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
*Kết quả:* `vector | 0.8.6 | vector data type and ivfflat and hnsw access methods`

### 5.2. Frontend (Vite + React)
- Mở trình duyệt tại: `http://localhost:5173`.
- Hot reload: Chỉnh sửa bất kỳ file nào trong `frontend/src/` (ví dụ `frontend/src/App.jsx`), thay đổi sẽ được cập nhật tức thì trên trình duyệt nhờ cơ chế polling watch (`usePolling: true`) thích ứng với môi trường Windows bind-mount.

---

## 6. Trạng Thái Thực Tế & Báo Cáo Blocker

### Bảng trạng thái dịch vụ:

| Service | Source tồn tại | Build | Startup | Health | Connectivity | Ghi chú |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Database** | ✅ Có (Image) | ✅ Đã có image | ✅ Thành công | ✅ Healthy (`pg_isready`) | ✅ Kết nối cổng 5433 từ Host | Host dùng cổng 5433 tránh đụng container cũ trên 5432. Đã test `pg_isready` và pgvector v0.8.6. |
| **Frontend** | ✅ Có | ⏳ Chờ mạng pull node image / chạy local | ✅ Sẵn sàng config | N/A (Web UI) | ✅ Cổng 5173 | Giao diện React 19 + Vite. Dockerfile.dev & config polling đã sẵn sàng. |
| **Backend** | ❌ Chưa có | ⏸️ Chưa có source | ⏸️ Chưa có source | ⏸️ Chưa có source | ⏸️ Chưa có source | **Blocker**: Thư mục `backend/` chỉ có `.gitkeep`, chưa có mã nguồn Spring Boot / `pom.xml`. Đã cấu hình trước cổng host 8080 để tránh đụng cổng 3000 của Đồ Án 1. |
| **AI Worker** | ❌ Chưa có | ⏸️ Chưa có source | ⏸️ Chưa có source | ⏸️ Chưa có source | ⏸️ Chưa có source | **Blocker**: Thư mục `ai-worker/` chỉ có `.gitkeep`, chưa có mã nguồn FastAPI / `requirements.txt`. Đã dự trù sẵn cổng 8000. |

---

## 7. Hướng Dẫn Bổ Sung Backend & AI Worker Khi Có Mã Nguồn

Khi các nhóm phụ trách bàn giao mã nguồn cho `backend/` và `ai-worker/`, thực hiện các bước sau để đưa vào Docker Compose:

### 7.1. Bổ sung Backend (Spring Boot)
1. Thêm `backend/Dockerfile`:
```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

2. Bật service trong `compose.yaml`:
```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "${BACKEND_HOST_PORT:-8080}:${BACKEND_CONTAINER_PORT:-8080}"
    environment:
      SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-dev}
      SPRING_DATASOURCE_URL: ${SPRING_DATASOURCE_URL:-jdbc:postgresql://database:5432/matchajob_db}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER:-matchajob_user}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD:-matchajob_password}
      AI_WORKER_BASE_URL: ${AI_WORKER_BASE_URL:-http://ai-worker:8000}
    depends_on:
      database:
        condition: service_healthy
    networks:
      - matchajob_network
```

### 7.2. Bổ sung AI Worker (FastAPI)
1. Thêm `ai-worker/Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. Bật service trong `compose.yaml`:
```yaml
  ai-worker:
    build:
      context: ./ai-worker
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "${AI_WORKER_HOST_PORT:-8000}:${AI_WORKER_CONTAINER_PORT:-8000}"
    environment:
      AI_PROVIDER: ${AI_PROVIDER}
      AI_MODEL: ${AI_MODEL}
      AI_API_KEY: ${AI_API_KEY}
    networks:
      - matchajob_network
```
