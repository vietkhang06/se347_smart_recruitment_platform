# MatchaJob Backend (Spring Boot 3.3 + Java 21)

Backend service for the **MatchaJob — Smart Recruitment Platform** (SE347).

## Architecture Highlights
- **Java 21 LTS** with **Spring Boot 3.3.4**
- **Servlet Context Path**: `/api` (Endpoints mapped without duplicate `/api` prefix, e.g. `/v1/...`)
- **Actuator Health & Probes**: Available at `/api/actuator/health`, `/api/actuator/health/liveness`, `/api/actuator/health/readiness`
- **Database Schema Ownership**: 100% managed by **Flyway migrations** (`db/migration/V1__init_extensions.sql`). Hibernate `ddl-auto` is strictly set to `validate`.
- **Custom Health Indicator**: `PgVectorHealthIndicator` directly queries `pg_extension` system catalog to verify `vector` is installed and active.
- **AI Worker Client**: Synchronous `RestClient` configured with 3000ms connect timeout and 5000ms read timeout.
- **Error Handling**: Standardized RFC 7807 `ProblemDetail` responses via `GlobalExceptionHandler`.
- **Test Isolation**: Complete separation between unit/slice tests and PostgreSQL integration tests. Test database is strictly `matchajob_test`.

---

## Local Development Requirements
- **Java 21 JDK** (Adoptium Temurin 21 recommended)
- **Apache Maven 3.9+**
- **PostgreSQL 16 with pgvector** (running via Docker or local service on port 5433)

---

## Building and Testing Locally

### 1. Run Unit Tests (Fast, Database-Independent)
Runs all unit/slice tests without requiring PostgreSQL to be running:
```powershell
mvn clean test
```

### 2. Run Integration Tests (Requires Real PostgreSQL)
Runs `MatchaJobApplicationIT` against the isolated test database `matchajob_test` on port 5433:
```powershell
mvn verify -Pintegration-test
```

### 3. Package the Application
```powershell
mvn clean package -DskipTests
```

### 4. Run Locally (Dev Profile)
```powershell
mvn spring-boot:run
```
By default, the `dev` profile connects to PostgreSQL at `localhost:5433` and AI Worker at `http://localhost:8001`.

---

## Running with Docker
A multi-stage `Dockerfile` is provided based on `maven:3.9-eclipse-temurin-21-alpine` (builder) and `eclipse-temurin:21-jre-alpine` (runtime).
It includes an Alpine-compatible health check using BusyBox `wget`:
```dockerfile
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD wget -qO- http://127.0.0.1:8080/api/actuator/health/readiness > /dev/null || exit 1
```

To build and run standalone container:
```powershell
docker build -t matchajob-backend:latest .
docker run -p 8081:8080 --name matchajob-backend matchajob-backend:latest
```

---

## Ports and Network Map
- **Container Port**: `8080`
- **Host Port**: `8081` (`http://localhost:8081/api`)
- **Internal Docker Network (`matchajob_network`)**:
  - Connects to PostgreSQL at `database:5432`
  - Connects to AI Worker at `http://ai-worker:8000`
