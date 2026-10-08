# MatchaJob — Kiến Trúc Nền Tảng Backend & Kết Nối PostgreSQL (Backend Foundation & PostgreSQL Integration)

> **Tài liệu Kỹ thuật Pha 1 (Phase 1 — Technical Architecture Document)**  
> **Phiên bản:** 1.1 (Hiệu chỉnh Tính Nhất Quán & Khắc Phục Lệch Kiến Trúc)  
> **Dự án:** MatchaJob — Nền tảng tuyển dụng thông minh (SE347.R11 - Nhóm 7)  
> **Trạng thái:** Hoàn tất rà soát Pha 1 (Phase 1 Final Architecture — Ready for Phase 2 Implementation)  
> **Người thực hiện:** Phúc Khang (Backend Architect & Engineer)  
> **Tham chiếu nghiên cứu:** GPT-Researcher targeted synthesis report (`research_outputs/targeted_corrections_research.md`, `research_outputs/backend_research.md`), `compose.yaml`, `.env.example`, `scripts/start-dev.ps1`, `docs/development-environment.md`, `Thiết Kế CSDL - MatchaJob.pdf`.

---

## 1. Mục Đích và Trách Nhiệm (Purpose & Responsibilities)

### 1.1. Phạm vi Trách nhiệm (What the Backend IS responsible for)
Backend là hệ thống trung tâm quản lý giao dịch và điều phối nghiệp vụ (System-of-Record Orchestrator) duy nhất của nền tảng MatchaJob:
1. **Chủ Quyền Lưu Trữ Giao Dịch Duy Nhất (Sole Transactional Persistence Owner):** Backend chịu trách nhiệm 100% việc kết nối, truy vấn, ghi dữ liệu và kiểm soát giao dịch ACID trên PostgreSQL. Không có dịch vụ nào khác (kể cả AI Worker) được kết nối trực tiếp vào cơ sở dữ liệu `matchajob_db`.
2. **Quản lý Định danh & Kiểm soát Truy cập (Identity & Access Management):** Xác thực tài khoản, băm mật khẩu BCrypt, cấp phát token JWT vô trạng thái, phân quyền 3 vai trò người dùng (`CANDIDATE`, `HR`, `ADMIN`).
3. **Quản trị Thực thể Nghiệp vụ Nòng cốt (Core Business Domain):** Quản lý hồ sơ công ty (`companies`), hồ sơ nhân sự (`recruiter_profiles`), hồ sơ ứng viên (`candidate_profiles`), tin tuyển dụng (`jobs`, `job_requirements`), và toàn bộ vòng đời nộp đơn (`applications`).
4. **Bảo toàn Dữ liệu Tuyển dụng Bất biến (Immutable Snapshot Preservation):** Khi ứng viên nộp hồ sơ, Backend lưu một bản sao bất biến của CV vào bảng `application_cv_snapshots` để chống sai lệch điểm số khi ứng viên chỉnh sửa CV sau này.
5. **Tiến Hóa Lược Đồ Bằng Flyway (Schema Evolution Owner):** Làm chủ toàn bộ vòng đời DDL của CSDL thông qua Flyway migration. Đảm bảo tính nhất quán dữ liệu qua các ràng buộc khóa ngoại và chỉ mục B-Tree/HNSW.
6. **Điều Phối Tác Vụ Tính Toán AI (AI Orchestrator):** Tạo các bản ghi hàng đợi `processing_jobs`, kích hoạt và truyền dữ liệu sang AI Worker qua HTTP REST (`AiWorkerClient`), tiếp nhận kết quả trả về và lưu vào bảng `embeddings`, `match_results`.
7. **Giám sát & Sức khỏe Vận hành (Operational Readiness & Observability):** Cung cấp các endpoint thăm dò sức khỏe (`/api/actuator/health`, `/api/actuator/health/liveness`, `/api/actuator/health/readiness`), kiểm tra độ khả dụng của cơ sở dữ liệu và xác thực extension `vector` đã kích hoạt qua system catalog `pg_extension`.

### 1.2. Ngoài phạm vi Trách nhiệm (What the Backend is NOT responsible for)
* **Không nhúng thư viện Machine Learning nặng vào JVM:** Không nhúng PyTorch/ONNX bên trong Spring Boot để tránh tranh chấp tài nguyên bộ nhớ RAM/CPU với luồng giao dịch.
* **Không tính toán vector embeddings hay đối sánh ngữ nghĩa cục bộ:** Ủy thác hoàn toàn các tác vụ tính toán này cho AI Worker qua REST call.
* **Không lưu trữ tệp nhị phân trong CSDL:** Tệp PDF/DOCX CV gốc chỉ lưu trên đĩa lưu trữ hoặc volume mount; CSDL chỉ lưu đường dẫn `file_path` và văn bản trích xuất.

---

## 2. Kiến Trúc Backend (Backend Architecture)

Backend được tổ chức theo kiến trúc phân tầng sạch (**Layered Enterprise Architecture**):

```
+-------------------------------------------------------------------------------+
|                            Presentation / Web Layer                           |
|  - Servlet Context Path: /api                                                 |
|  - RestControllers: /v1/auth, /v1/jobs, /v1/candidates, /v1/applications      |
|  - Request/Response DTOs (Java Records), Jakarta Validation (@Valid)          |
|  - GlobalExceptionHandler (RFC 7807 Problem Details)                          |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                                 Service Layer                                 |
|  - Core Domain Services (JobService, ApplicationService, UserService)         |
|  - Declarative Transaction Demarcation (@Transactional)                       |
|  - AI Orchestration & Task Queue Dispatcher                                   |
+-------------------------------------------------------------------------------+
                         |                               |
                         v                               v
+------------------------------------+       +----------------------------------+
|      Persistence Layer             |       |     Integration Gateway Layer    |
|  - Spring Data JPA (Relational)    |       |  - AiWorkerClient (RestClient)   |
|  - Spring JdbcClient (pgvector)    |       |  - Timeout & Circuit Breaking    |
|  - Flyway Migrations (Schema DDL)  |       |                                  |
+------------------------------------+       +----------------------------------+
                         |                               |
                         | JDBC                          | HTTP RestClient
                         v                               v (Internal Port 8000)
+-----------------------------------------------+   +---------------------------+
|         PostgreSQL 16 + pgvector              |   |    AI Worker (FastAPI)    |
|  - HikariCP: jdbc:postgresql://database:5432  |   |    http://ai-worker:8000  |
+-----------------------------------------------+   +---------------------------+
```

---

## 3. Cấu Hình Cổng Dịch Vụ & Mạng Docker (Docker Ports & Networking)

Căn cứ vào `compose.yaml`, `.env.example`, `scripts/start-dev.ps1` và `docs/development-environment.md`, quy chuẩn cổng và mạng được xác lập như sau:

| Dịch vụ (Service) | Cổng Container Nội bộ | Cổng Host Ánh xạ | Giao tiếp Container-to-Container (Nội bộ) | Giao tiếp Host-to-Container (Dev/Browser) |
| :--- | :---: | :---: | :--- | :--- |
| **PostgreSQL Database** (`database`) | `5432` | `5433` | `database:5432` | `localhost:5433` |
| **Backend API** (`backend`) | `8080` | `8081` | `http://backend:8080` | `http://localhost:8081` (hoặc `/api`) |
| **AI Worker** (`ai-worker`) | `8000` | `8001` | `http://ai-worker:8000` | `http://localhost:8001` |
| **Frontend Web** (`frontend`) | `5173` | `5173` | `http://frontend:5173` | `http://localhost:5173` |

### Quy tắc Kết Nối Rõ Ràng:
1. **Trong môi trường Docker Compose (`matchajob_network`):**
   * Backend kết nối CSDL tại: `jdbc:postgresql://database:5432/matchajob_db`.
   * Backend gọi AI Worker tại: `AI_WORKER_BASE_URL=http://ai-worker:8000` (**Sử dụng cổng container 8000, tuyệt đối không dùng cổng host 8001**).
2. **Trong môi trường Local Dev ngoài Container (Host-mode):**
   * Backend kết nối CSDL tại: `jdbc:postgresql://localhost:5433/matchajob_db`.
   * Backend gọi AI Worker tại: `AI_WORKER_BASE_URL=http://localhost:8001`.

---

## 4. Quyết Định Công Nghệ (Technology Decisions)

| Thành phần | Lựa chọn công nghệ | Căn cứ dự án & Bằng chứng nghiên cứu GPT-Researcher |
| :--- | :--- | :--- |
| **Ngôn ngữ** | Java 21 LTS | Hỗ trợ Virtual Threads (Project Loom), Record classes bất biến, hiệu năng cao và bảo mật kiểu tĩnh nghiêm ngặt. |
| **Framework** | Spring Boot 3.3+ (Spring Framework 6.1+) | Tiêu chuẩn phát triển backend doanh nghiệp; tương thích hoàn toàn với Java 21; tích hợp sẵn Actuator, Spring Data JPA. |
| **Build Tool** | Apache Maven 3.9+ | Quản lý dependency chuẩn tắc; định nghĩa sẵn trong `development-environment.md`. |
| **HTTP Client** | `RestClient` (Spring Framework 6.1+) | Client HTTP đồng bộ hiện đại, fluent API, tích hợp sẵn trong `spring-boot-starter-web`. Không cần cài thêm `WebFlux` chỉ để ping health check. |
| **Hệ CSDL** | PostgreSQL 16 + pgvector v0.8.6 | CSDL quan hệ tin cậy hàng đầu kết hợp mở rộng vector embedding 1536/1024 chiều. |
| **Connection Pool** | HikariCP | Connection pool mặc định của Spring Boot, tối ưu bytecode không khóa (lock-free), độ trễ kết nối cực thấp. |
| **Schema Migration** | Flyway 10+ | Chủ sở hữu duy nhất của lược đồ CSDL (`V1__...sql`). Ngăn chặn lỗi lệch lược đồ và tự động hóa CI/CD. |
| **Data Access** | Spring Data JPA + Spring `JdbcClient` | Lai ghép tối ưu: Spring Data JPA cho các quan hệ ORM; `JdbcClient` cho các câu lệnh SQL native truy vấn vector nhanh. |
| **Giám sát & Sức khỏe** | Spring Boot Actuator | Cung cấp endpoints `/api/actuator/health` và các chỉ số đo lường chi tiết của pool HikariCP. |

---

## 5. Chủ Quyền Lược Đồ PostgreSQL & Phân Định Phạm Vi Pha 2 vs Pha 3

### 5.1. Chủ Quyền Lược Đồ (Schema Ownership)
* **Chủ quyền 100% thuộc về: Spring Boot Flyway Migrations.**
* Container Docker PostgreSQL (`pgvector/pgvector:pg16`) là vanilla container, **không gắn volume `/docker-entrypoint-initdb.d`** và không chứa script khởi tạo riêng.
* Hibernate được cấu hình nghiêm ngặt: `spring.jpa.hibernate.ddl-auto=validate`. Hibernate chỉ xác thực tính khớp nối giữa Entity Java và bảng CSDL, không bao giờ tự ý sửa đổi schema.

### 5.2. Phân Định Phạm Vi CSDL Giữa Pha 2 và Pha 3 (Phasing Scope Separation)

| Hạng mục CSDL | Phạm vi Pha 2 (Foundation) | Phạm vi Pha 3 (CV/Application Domain) |
| :--- | :--- | :--- |
| **Mục tiêu chính** | Khởi tạo kết nối, pool, kích hoạt extension, kiểm tra sức khỏe | Triển khai thực thể nghiệp vụ CV, đơn ứng tuyển, matching |
| **Migration SQL** | Duy nhất `V1__init_extensions.sql` kích hoạt `vector` (UUID sử dụng `gen_random_uuid()` có sẵn của PostgreSQL 16) | `V2__init_domain_schema.sql` (tạo `users`, `jobs`, `cvs`, `applications`), `V3__init_ai_schema.sql` (tạo `processing_jobs`, `embeddings`, `match_results`) |
| **Số lượng Bảng** | **0 bảng nghiệp vụ** (chỉ có bảng hệ thống `flyway_schema_history`) | Đầy đủ 42 bảng vật lý theo đặc tả `Thiết Kế CSDL - MatchaJob.pdf` |
| **Thực thể JPA** | Không tạo Entity nghiệp vụ nào | Tạo các Entity `User`, `Job`, `Application`, `CvVersion`, etc. |
| **Quy tắc Kiểm soát** | Tuân thủ tuyệt đối quy tắc không triển khai sớm (no premature implementation) | Hiện thực hóa chi tiết cùng logic nghiệp vụ tương ứng |

#### Nội dung script `V1__init_extensions.sql` trong Pha 2:
```sql
-- V1__init_extensions.sql: Kích hoạt extension thiết yếu cho PostgreSQL
-- Lưu ý: Hàm gen_random_uuid() đã được tích hợp sẵn trong PostgreSQL 16 core (pg_catalog), không cần uuid-ossp.
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 6. Quy Chuẩn Tiền Tố Đường Dẫn API (API Path Prefix Convention)

Nhằm loại bỏ hoàn toàn nguy cơ trùng lặp tiền tố (`/api/api/...`), hệ thống thống nhất quy ước:
1. **Cấu hình Servlet Context Path trong `application.yml`:**
   ```yaml
   server:
     servlet:
       context-path: /api
   ```
2. **Khai báo `@RequestMapping` trong Spring RestControllers:**
   * Các controller **không** được lặp lại tiền tố `/api`.
   * Ví dụ: `@RequestMapping("/v1/jobs")`, `@RequestMapping("/v1/auth")`.
3. **Đường dẫn gọi từ Client (Frontend / Browser):**
   * Endpoint thực tế: `http://localhost:8081/api/v1/jobs`.
   * Khớp hoàn toàn với biến `VITE_API_BASE_URL=http://localhost:8081/api` trong `compose.yaml` và `.env.example`.
4. **Đường dẫn Actuator:**
   * Nằm dưới context path: `http://localhost:8081/api/actuator/health`.

---

## 7. Cấu Hình HikariCP Nhất Quán (HikariCP Configuration)

### 7.1. Cấu hình Chuẩn Mực cho Môi Trường Phát Triển Pha 2 (Baseline Dev Config)
Sử dụng cấu hình fixed pool cố định, tránh hiện tượng co giãn pool gây overhead trên máy phát triển:
```yaml
spring:
  datasource:
    hikari:
      pool-name: MatchaJobHikariPool
      maximum-pool-size: 10
      minimum-idle: 10
      idle-timeout: 300000
      max-lifetime: 1800000
      connection-timeout: 20000
      leak-detection-threshold: 5000
```
* `maximum-pool-size = 10` & `minimum-idle = 10`: Hồ chứa 10 kết nối cố định, phù hợp cấu hình container Docker cấp phát 2 vCPU.
* `leak-detection-threshold = 5000ms`: Phát hiện ngay luồng nào chiếm giữ kết nối JDBC quá 5 giây (cảnh báo sớm trường hợp gọi AI bên trong `@Transactional`).
* `connection-timeout = 20000ms`: Chờ tối đa 20s trước khi báo lỗi nếu pool bị cạn kiệt.

### 7.2. Cân Nhắc Điều Chỉnh Khi Triển Khai Production (Production Tuning Guidelines)
* Khi vận hành sản xuất thực tế, kích thước pool sẽ được tính toán lại theo công thức lý thuyết hàng đợi:
  $$\text{Pool Size} = (\text{CPU Cores} \times 2) + \text{Effective Spindle Count}$$
* Giám sát thông qua chỉ số Actuator: `hikaricp.connections.pending` (số luồng chờ) và `hikaricp.connections.active`.

---

## 8. Hỗ Trợ Kích Thước Vector Đa Dạng (Reconciled Embedding Dimensions)

Căn cứ vào `Thiết Kế CSDL - MatchaJob.pdf` (Trang 15, bảng `embeddings`):
* CSDL MatchaJob được thiết kế để hỗ trợ **cả hai chuẩn kích thước vector** thông qua hai cột riêng biệt:
  1. `embedding_vector vector(1536)`: Dành cho mô hình thương mại OpenAI (`text-embedding-3-small`). Có chỉ mục HNSW `idx_embeddings_vector_hnsw` (`m=16, ef_construction=64`).
  2. `embedding_vector_1024 vector(1024)`: Dành cho mô hình mã nguồn mở BGE-M3 hoặc Nomic. Có chỉ mục HNSW `idx_embeddings_vector_1024_hnsw` (`m=16, ef_construction=64`).
* **Khẳng định Biên giới:** Cả hai cột và bảng `embeddings` thuộc phạm vi **Pha 3**. Pha 2 chỉ chịu trách nhiệm kích hoạt extension `vector`.

---

## 9. Kiểm Tra Sức Khỏe Extension `pgvector` Chính Xác

Health check của Backend không dùng `pg_available_extensions` (vốn chỉ hiển thị file extension có trên ổ đĩa), mà truy vấn trực tiếp bảng hệ thống **`pg_extension`** để xác thực extension đã thực sự được cài đặt và kích hoạt trong database `matchajob_db`:

```java
package com.matchajob.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class PgVectorHealthIndicator implements HealthIndicator {

    private final JdbcClient jdbcClient;

    public PgVectorHealthIndicator(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public Health health() {
        try {
            // Truy vấn system catalog pg_extension để xác thực vector đã kích hoạt
            Optional<String> versionOpt = jdbcClient.sql("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
                    .query(String.class)
                    .optional();

            if (versionOpt.isPresent()) {
                return Health.up()
                        .withDetail("extension", "vector")
                        .withDetail("version", versionOpt.get())
                        .withDetail("status", "INSTALLED_AND_ACTIVE")
                        .build();
            } else {
                return Health.down()
                        .withDetail("extension", "vector")
                        .withDetail("error", "Extension 'vector' is not installed in current database")
                        .build();
            }
        } catch (Exception ex) {
            return Health.down(ex)
                    .withDetail("error", "Cannot query PostgreSQL pg_extension catalog")
                    .build();
        }
    }
}
```

### Ý nghĩa Đo lường của Chỉ Số Sức Khỏe Này:
1. Xác nhận kết nối mạng JDBC tới PostgreSQL thành công.
2. Xác nhận thông tin xác thực (`matchajob_user`) chính xác.
3. Xác nhận lệnh `CREATE EXTENSION vector` đã thực thi thành công, kiểu dữ liệu `vector` và toán tử khoảng cách `<=>` đã sẵn sàng hoạt động.

---

## 10. Giao Tiếp HTTP Tới AI Worker Trong Pha 2 (`AiWorkerClient`)

Trong Pha 2, Backend chỉ cần thực hiện kiểm tra kết nối hạ tầng tới AI Worker. Thay vì thêm dependency cồng kềnh `spring-boot-starter-webflux`, Backend sử dụng **`RestClient`** chuẩn của Spring Boot 3.2+:

```java
package com.matchajob.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

@Component
public class AiWorkerClient {

    private final RestClient restClient;

    public AiWorkerClient(@Value("${ai-worker.base-url:http://ai-worker:8000}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public Map<String, Object> checkHealth() {
        return restClient.get()
                .uri("/health")
                .retrieve()
                .body(Map.class);
    }
}
```

---

## 11. Docker Health Check Tương Thích Thực Tế

Image runtime của Backend là `eclipse-temurin:21-jre-alpine`. Image Alpine **không có sẵn `curl`**, nhưng có sẵn **`wget`** của BusyBox:
```dockerfile
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/actuator/health || exit 1
```

---

## 12. Chiến Lược Kiểm Thử Pha 2 (Testing Strategy)

* **Phân Tách Nghiêm Ngặt Giữa Unit Test & Integration Test:**
  * **Kiểm Thử Đơn Vị (Unit / Slice Tests - `mvn test`):**
    * Chạy toàn bộ các test case độc lập (`GlobalExceptionHandlerTest`, `PgVectorHealthIndicatorTest`, `AiWorkerClientTest`).
    * Sử dụng Mockito và Spring `MockRestServiceServer`.
    * Không phụ thuộc bất kỳ CSDL nào, chạy cực nhanh trong vòng 1-2 giây.
    * **Tuyệt đối không sử dụng H2 giả lập:** Đã gỡ bỏ hoàn toàn `h2` khỏi `pom.xml` để tránh tình trạng false-positive.
  * **Kiểm Thử Tích Hợp PostgreSQL Thật (`MatchaJobApplicationIT` - `mvn verify -Pintegration-test`):**
    * Được cô lập hoàn toàn dưới Maven Profile `integration-test` thông qua `maven-failsafe-plugin`.
    * Kết nối trực tiếp vào cơ sở dữ liệu test riêng biệt: `jdbc:postgresql://localhost:5433/matchajob_test` (tách biệt 100% khỏi CSDL phát triển `matchajob_db`).
    * Kiểm tra vòng đời khởi tạo thực tế: Spring Boot context, pool HikariCP, thực thi Flyway `V1__init_extensions.sql`, Hibernate `ddl-auto=validate`, và xác thực extension `vector` trong system catalog `pg_extension`.

* **Quyết Định Kỹ Thuật Về Extension `vector` và Hàm UUID Trong `V1__init_extensions.sql`:**
  * Toàn bộ 42 bảng trong bản thiết kế CSDL thực tế (`database/design/schema.sql`) đều khai báo `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`. Không có bất kỳ bảng nào sử dụng `uuid_generate_v4()`.
  * Trong PostgreSQL 16 (`pgvector/pgvector:pg16`), `gen_random_uuid()` là hàm tích hợp sẵn thuộc core `pg_catalog`, không yêu cầu bất kỳ extension phụ trợ nào như `uuid-ossp` hay `pgcrypto`.
  * Do đó, script di trú `V1__init_extensions.sql` được tinh giản chỉ kích hoạt duy nhất extension `vector`:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```
  * *Chủ quyền Schema:* Container PostgreSQL chỉ khởi tạo database rỗng `matchajob_test`. Toàn bộ extension và bảng hệ thống di trú thuộc 100% quyền sở hữu của Spring Boot Flyway.

---

## 13. Cấu Trúc Thư Mục & Kế Hoạch Hiện Thực Hóa Pha 2 (Phase 2 Plan)

### Cấu Trúc Mã Nguồn Dự Kiến:
```text
backend/
├── Dockerfile                           # Multi-stage build (Temurin 21)
├── pom.xml                              # Khai báo dependency chính xác
├── README.md                            # Hướng dẫn build & test
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/
    │   │       └── matchajob/
    │   │           ├── MatchaJobApplication.java       # Main class
    │   │           ├── client/
    │   │           │   └── AiWorkerClient.java         # RestClient kết nối AI Worker
    │   │           ├── config/
    │   │           │   ├── DatabaseConfig.java         # Cấu hình JdbcClient & HikariCP
    │   │           │   └── AiWorkerConfig.java         # Cấu hình bean RestClient
    │   │           ├── health/
    │   │           │   └── PgVectorHealthIndicator.java# Kiểm tra pg_extension
    │   │           └── common/
    │   │               └── exception/
    │   │                   └── GlobalExceptionHandler.java # Bắt lỗi RFC 7807
    │   └── resources/
    │       ├── application.yml          # Cấu hình chuẩn server & context-path
    │       ├── application-dev.yml      # Cấu hình môi trường dev
    │       └── db/
    │           └── migration/
    │               └── V1__init_extensions.sql # Kích hoạt extension vector (UUID dùng gen_random_uuid)
    └── test/
        ├── java/
        │   └── com/
        │       └── matchajob/
        │           └── MatchaJobApplicationTests.java # ContextLoads test
        └── resources/
            └── application-test.yml     # Cấu hình test trỏ tới port 5433
```

### Danh mục Dependencies Chính Xác trong `pom.xml`:
* `org.springframework.boot:spring-boot-starter-web` (Spring MVC + RestClient)
* `org.springframework.boot:spring-boot-starter-data-jpa` (JPA + Hibernate + HikariCP)
* `org.springframework.boot:spring-boot-starter-actuator` (Health checks & metrics)
* `org.postgresql:postgresql` (PostgreSQL JDBC driver)
* `org.flywaydb:flyway-core` & `org.flywaydb:flyway-database-postgresql` (Flyway schema management)
* `org.projectlombok:lombok` (Optional/Dev convenience)
* `org.springframework.boot:spring-boot-starter-test` (Testing framework)

---

## 14. Bằng Chứng Nghiên Cứu Xác Thực (Verifiable Research Evidence)

1. **Spring Framework 6.1+ `RestClient`:**  
   * Nguồn: Spring Framework Documentation (2026). *RestClient: Synchronous HTTP client*. Broadcom / VMware Tanzu. URL: [https://docs.spring.io/spring-framework/reference/integration/rest-clients.html#rest-restclient](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html#rest-restclient)  
   * Căn cứ: Xác thực `RestClient` là client đồng bộ chính thức mới thay thế `RestTemplate`, cung cấp fluent API giống `WebClient` mà không cần phụ thuộc `spring-boot-starter-webflux`.
2. **PostgreSQL System Catalogs for Active Extensions:**  
   * Nguồn: PostgreSQL Global Development Group (2026). *PostgreSQL 16 System Catalogs: pg_extension*. URL: [https://www.postgresql.org/docs/current/catalog-pg-extension.html](https://www.postgresql.org/docs/current/catalog-pg-extension.html)  
   * Căn cứ: Chứng minh bảng hệ thống `pg_extension` lưu các extension đã thực sự được cài đặt vào CSDL hiện hành, phân biệt với view `pg_available_extensions` chỉ liệt kê các file có sẵn trên đĩa.
3. **Alpine Linux Docker Healthcheck via `wget`:**  
   * Nguồn: Docker Documentation (2026). *Dockerfile reference: HEALTHCHECK*. URL: [https://docs.docker.com/reference/dockerfile/#healthcheck](https://docs.docker.com/reference/dockerfile/#healthcheck)  
   * Căn cứ: Xác thực cú pháp `wget --spider` trên nền Alpine Linux để kiểm tra HTTP response code mà không cần cài thêm `curl`.
4. **HikariCP Pool Sizing & Leak Detection:**  
   * Nguồn: Brett Wooldridge (2026). *HikariCP: About Pool Sizing*. URL: [https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)  
   * Căn cứ: Xác thực khuyến nghị giữ pool cố định (`maximumPoolSize = minimumIdle`) và bật `leakDetectionThreshold` để bảo vệ tài nguyên kết nối.
