# MatchaJob AI Worker & Hybrid Matching — Báo Cáo Đóng Băng Mô Hình, Methodology, Benchmark & Vận Hành Fallback

- **Người thực hiện (Owner):** Khải Vạn (`Zikenic`)
- **Phiên bản đóng băng (Freeze Version):** `1.0.0-demo-freeze` (`2026-11-21`)
- **Nhánh / Commit tham chiếu:** `feat/w2-ai-worker-runtime-scoring` (sync `main` tại commit `14d957d`)
- **Manifest đóng băng chuẩn:** [`evaluation/model_freeze_manifest.json`](../evaluation/model_freeze_manifest.json)
- **Script & Artifact Benchmark tái lập:** [`evaluation/run_final_benchmark.py`](../evaluation/run_final_benchmark.py), [`evaluation/results/expected_benchmark_snapshot.json`](../evaluation/results/expected_benchmark_snapshot.json), [`evaluation/results/final_benchmark_results.json`](../evaluation/results/final_benchmark_results.json)

---

## 1. AI Model Freeze Summary (Chốt Phiên Bản Mô Hình, Trọng Số, Ngưỡng & Schema)

### 1.1. Phiên bản dịch vụ, thuật toán và dependency đã ghim cứng

| Thành phần | Giá trị đóng băng (Frozen Value) | Vị trí khai báo trên mã nguồn |
|---|---|---|
| **Freeze Manifest Version** | `1.0.0-demo-freeze` | `ai-worker/app/core/config.py`, `evaluation/model_freeze_manifest.json` |
| **AI Worker Service / API Version** | `matchajob-ai-worker` / `1.0.0` | `ai-worker/app/core/config.py` |
| **Document Extractor Version** | `extractor-v1.0.0` | `ai-worker/app/services/extractor.py` |
| **Bilingual Normalizer Version** | `normalizer-v1.0.0` | `ai-worker/app/services/normalizer.py` |
| **Rule Scoring Algorithm Version** | `baseline-rule-v1.0.0` | `ai-worker/app/services/providers.py` |
| **Backend Hybrid Algorithm ID** | `hybrid-rule-semantic-v1` | `backend/src/main/java/com/matchajob/matching/service/MatchingScoringProperties.java`, `application.yml` |
| **Backend Scoring Config Version** | `v1.0-hybrid-60-40` | `MatchingScoringProperties.java`, `application.yml`, `.env.example` |
| **Canonical Skill Taxonomy** | `116` alias entries -> `75` canonical skills (`NFKC`) | `ai-worker/app/services/normalizer.py` |
| **Vector Store / Index Engine** | PostgreSQL 16 + `pgvector` (`pgvector/pgvector:pg16`, HNSW cosine `<=>`) | `compose.yaml`, `EmbeddingRepository.java` |

**Pinned Python Runtime Dependencies (`ai-worker/requirements.txt`):**
`fastapi==0.111.1`, `uvicorn[standard]==0.30.3`, `pydantic==2.8.2`, `pydantic-settings==2.3.4`, `python-dotenv==1.0.1`, `httpx==0.27.0`, `pytest==8.2.2`, `pytest-asyncio==0.23.8`, `python-multipart==0.0.33`, `pypdf==6.21.4`, `python-docx==1.2.0`.

### 1.2. Embedding Providers, Trọng số (Weights) và Ngưỡng (Thresholds)

| Cấu hình | Giá trị chốt cho Demo | Vai trò / Dự phòng |
|---|---|---|
| **Default AI Provider (`AI_PROVIDER`)** | `deterministic` (`DeterministicTestProvider`) | Zero-network, tái lập 100%, không cần OpenAI key khi demo |
| **Deterministic Embedding Model** | `deterministic-sha256-1536d-v1` (1536 chiều, L2 unit-norm) | Trả về trực tiếp từ `/api/v1/embeddings` khi chạy deterministic |
| **Fallback Embedding Model Tag** | `deterministic-sha256-1536d-v1-fallback` | Gắn nhãn rõ khi `OpenAIProvider` fallback sang SHA-256 |
| **Production Embedding Provider** | `openai` / `text-embedding-3-small` (`dimensions=1536`, timeout `10.0s`) | Bật khi cấu hình `AI_PROVIDER=openai` và `AI_API_KEY` hợp lệ |
| **Production LLM Placeholder** | `gpt-4o-mini` | Chỉ dùng cho metadata cấu hình (`AI_MODEL`); extraction/scoring hiện tại thuần deterministic |
| **Backend Offline Stub Model** | `stub-deterministic` (`1536d`) | Profile Spring `ai-stub` (`AiWorkerStub.java`) khi không chạy container AI Worker |
| **Rule Engine Weights (`AI Worker`)** | `skills_weight = 0.60`, `experience_weight = 0.40` | Cộng điểm có điều kiện (gating nếu `required_skills_matched == []`) |
| **Hybrid Fusion Weights (`Backend`)** | `rule_weight = 0.60`, `semantic_weight = 0.40` | Hợp nhất rule score với pgvector cosine similarity |
| **Pure Rule Baseline Weights** | `rule_weight = 1.00`, `semantic_weight = 0.00` | Chế độ baseline thuần rule khi tắt semantic hoặc cô lập dịch vụ ngoài |
| **3-Tier Decision Thresholds** | `>= 85`: **Strong Match**<br>`>= 70`: **Shortlist Threshold** (Ưu tiên Precision)<br>`50–69`: **Review Threshold** (Ưu tiên Recall)<br>`< 50`: **Not Recommended** | Khi chạy với vector SHA-256 (có xu hướng trực giao ~50 điểm semantic), ngưỡng `70` đạt Precision `1.0000` (0 FP) và ngưỡng `50` đạt Recall `1.0000` (100% ứng viên đạt chuẩn lọt vòng Review) |
| **Deterministic Tie-Breaking** | `overallScore DESC NULLS LAST` -> `applied_at ASC` -> `a.id ASC` | Thực thi nhất quán ở tầng SQL (`ApplicationRepository.java`) và UI ranking |

### 1.3. Chốt Schema & Checksum SHA-256

Toàn bộ schema giao tiếp nội bộ (`snake_case` giữa Backend <-> AI Worker), schema public (`camelCase` giữa Backend <-> Frontend) và bộ dữ liệu chuẩn đều được băm SHA-256 trong `evaluation/model_freeze_manifest.json` và kiểm tra tự động qua `evaluation/test_model_freeze_reproducibility.py`:

| Artifact | SHA-256 (16 ký tự đầu) | Ghi chú |
|---|---|---|
| `ai-worker/app/schemas/ai.py` | `070102869d201606` | `MatchScoreRequest`/`Response` (`ConfigDict(extra="forbid")`, `StrictInt`, `StrictStr`) |
| `docs/contracts/schemas/ai-match-score-response.schema.json` | `5cf2f8f78a20677c` | JSON Schema Draft 2020-12 cho `POST /api/v1/match/score` |
| `docs/contracts/schemas/matching-result.schema.json` | `e0c58c44b120b449` | Public `MatchingResultResponse` (`NOT_STARTED`/`PENDING`/`PROCESSING`/`COMPLETED`/`FAILED`) |
| `evaluation/datasets/pilot_cv_jd_eval_dataset.json` | `a58d24cb9bfb74a2` | Dataset `1.1.0-frozen` (3 JDs, 18 CV–JD pairs) |
| `evaluation/results/expected_benchmark_snapshot.json` | `c8acb0ea9ded3d84` | Snapshot expected-vs-actual bất biến theo seed `20261120` |
| `ai-worker/requirements.txt` | `768f9d1f6fcc7124` | Dependency manifest đã ghim version |

---

## 2. Methodology — Kiến Trúc & Thuật Toán Chi Tiết

Luồng xử lý CV–JD tách bạch hoàn toàn giữa **Spring Boot Backend** (quản lý giao dịch PostgreSQL/pgvector, trạng thái `processing_jobs` theo lease, kết hợp hybrid) và **FastAPI AI Worker** (stateless compute engine chạy trong threadpool để không block ASGI event loop):

```text
[CV Binary PDF/DOCX] ──> AI Worker (/api/v1/cv/extract) ──> Raw Text + ParsedCVData
                     └──> AI Worker (/api/v1/embeddings) ──> 1536d Vector (pgvector: cv_version)

[Job Description]    ──> JobEmbeddingService (/api/v1/embeddings) ──> 1536d Vector (pgvector: job)

[Application Match]  ──> MatchingService (Backend)
                           ├── 1. AI Worker /api/v1/match/score ──> rule_score + breakdown + rationale
                           ├── 2. pgvector <=> cosine distance  ──> semantic_score = (1 - d/2) * 100
                           └── 3. Hybrid Fusion (0.60/0.40)     ──> overallScore + breakdown + explanation
```

### 2.1. Parsing (Bóc tách tài liệu CV — `extractor.py`)

1. **Giới hạn an toàn đầu vào (Guardrails):**
   - Kích thước file tối đa: `MAX_FILE_SIZE_BYTES = 10 MiB` (`10,485,760` bytes), đọc tối đa `MAX_FILE_SIZE_BYTES + 1` bytes ở streaming endpoint (`/api/v1/cv/extract`) để trả HTTP `413` trước khi tràn bộ nhớ.
   - Số trang PDF tối đa: `MAX_PDF_PAGES = 20`.
   - Độ dài văn bản sau làm sạch tối đa: `MAX_CHARACTERS = 500,000` ký tự.
   - Chặn double-extension spoofing (`lower_filename.count(".") != 1`, ví dụ `resume.exe.pdf` bị từ chối với HTTP `400`).
2. **Xác thực Magic Bytes & Bóc tách nội dung:**
   - **PDF (`.pdf`):** Kiểm tra prefix `%PDF`, trích xuất từng trang qua `pypdf.PdfReader`. Nếu PDF không có lớp text (scanned PDF), trả về chuỗi đánh dấu an toàn `"CV Document (Non-text or scanned PDF)"` để không bị sập pipeline.
   - **DOCX (`.docx`):** Kiểm tra prefix `PK\x03\x04`, trích xuất cả `doc.paragraphs` lẫn bảng biểu `doc.tables` (nối cell bằng `" | "`) qua `python-docx`.
3. **Làm sạch văn bản (`sanitize_text`):** Loại bỏ null bytes (`\x00`), trim từng dòng, bỏ dòng trống thừa và cắt trần tại `500,000` ký tự.

### 2.2. Normalization (Chuẩn hóa thực thể song ngữ Việt–Anh — `normalizer.py`)

1. **Chuẩn hóa Unicode & Không bịa đặt (Zero-Fabrication Policy):**
   - Toàn văn bản được đưa về chuẩn Unicode `NFKC` và lowercase trước khi khớp regex (`_normalize_text_for_search`), đảm bảo nhất quán giữa tiếng Việt dựng sẵn và tổ hợp.
   - Nếu một trường (email, số điện thoại, số năm kinh nghiệm, học vấn, kỹ năng) không xuất hiện trong văn bản, normalizer **bắt buộc trả `None` hoặc `[]`** — tuyệt đối không suy đoán hoặc điền giá trị mặc định.
2. **Trích xuất & Chuẩn hóa Kỹ năng (`CANONICAL_SKILL_MAP`):**
   - Gồm `116` biến thể ánh xạ về `75` kỹ năng chuẩn thuộc các nhóm: Ngôn ngữ lập trình, Framework, CSDL, Cloud/DevOps, Kiến trúc/Giao thức, Web/UI, và Analytics/BI (`Power BI`, `Tableau`, `Data Warehousing`).
   - Áp dụng **Longest-Span Non-Overlapping Matching**: sắp xếp từ khóa theo độ dài giảm dần (`_SORTED_SKILL_KEYS`) và theo dõi `used_spans` để tránh khớp nhầm chuỗi con (ví dụ `"Spring Boot"` không bị tách thành `"Spring"`, `"JavaScript"` không bị trùng `"Java"`).
   - Xử lý biên ký tự đặc biệt cho `c#`, `c++`, `.net`, `.net core` bằng negative lookaround `(?<![\w#+])...(?![\w#+])`.
   - Bộ lọc ngữ cảnh học thuật cho `"spring"`: bỏ qua các cụm như `spring 2024`, `spring semester`, `spring break`, `spring kỳ`.
3. **Kinh nghiệm, Học vấn, Chức danh & Ngôn ngữ:**
   - **Kinh nghiệm (`extract_experience_years`):** Hỗ trợ mẫu tiếng Việt (`năm kinh nghiệm`, `tháng kinh nghiệm`, làm tròn `>= 1` năm nếu tính theo tháng) và tiếng Anh (`years of experience`, `yrs`). Nhận diện phủ định rõ ràng (`chưa có kinh nghiệm`, `no experience`, `0 years`) để trả `0`; không bóc tách năm sinh (`1999`) hoặc thời gian học đại học (`Học đại học 4 năm`) làm kinh nghiệm đi làm.
   - **Chức danh & Cấp bậc (`normalize_job_title`):** Chuẩn hóa 30+ chức danh song ngữ (`Lập trình viên Backend` -> `Backend Developer`, `Kỹ sư phần mềm` -> `Software Engineer`) và cấp bậc (`Intern`, `Junior`, `Mid-level`, `Senior`, `Lead`, `Principal`, `Staff`, `Manager`, `Director`).
   - **Ngoại ngữ (`extract_languages_from_text`):** Tách theo mệnh đề (`, ; |`) để gắn chứng chỉ (`IELTS x.x`, `TOEIC xxx`, `JLPT N1..N5`) hoặc mức độ (`Native`, `Fluent`, `Professional`, `Intermediate`, `Basic`) đúng với từng ngôn ngữ.
   - **Chuẩn hóa JD (`normalize_jd`):** Tách phần `Preferred / Nice to have / Ưu tiên` ra khỏi `required_skills` để tránh phạt ứng viên vì thiếu kỹ năng ưu tiên.

### 2.3. Matching & Ranking (Đối sánh điểm & Xếp hạng ứng viên)

#### Tầng 1 — Rule-Based Scoring trên AI Worker (`DeterministicTestProvider.calculate_match`)
Gọi $S_{\text{req}}$ là tập kỹ năng yêu cầu từ JD, $S_{\text{cand}}$ là hợp của kỹ năng rút từ `cv_text` và `candidate_skills` (sau chuẩn hóa), $E_{\text{req}}$ là số năm kinh nghiệm JD yêu cầu, $E_{\text{cand}}$ là số năm kinh nghiệm CV (`None` nếu không rõ):

- **Điểm kỹ năng (`skills_score`):** Nếu $|S_{\text{req}}| > 0$:
  $$\text{skills\_score} = \text{round}\!\left(\frac{|S_{\text{req}} \cap S_{\text{cand}}|}{|S_{\text{req}}|} \times 100\right), \quad \text{ngược lại } \text{None}.$$
- **Điểm kinh nghiệm (`experience_score`):** Nếu $E_{\text{req}} > 0$ và $E_{\text{cand}} \neq \text{None}$:
  $$\text{experience\_score} = \text{round}\!\left(\min\!\left(1.0,\ \frac{E_{\text{cand}}}{E_{\text{req}}}\right) \times 100\right), \quad \text{ngược lại } \text{None}.$$
- **Chính sách Gating Kinh nghiệm & Chuẩn hóa theo Tiêu chí khả dụng (Applicability-Aware):**
  1. **JD yêu cầu cả kỹ năng và kinh nghiệm:**
     - Nếu $|S_{\text{req}} \cap S_{\text{cand}}| = 0$ (không khớp kỹ năng nào): đặt **`experience_gated = true`**, ép **`experience_score = 0`** (nếu $E_{\text{cand}} \neq \text{None}$) và tính `overall_score = 0`. Ngăn tuyệt đối việc đầu bếp/nhân sự ngoài ngành có 8–10 năm kinh nghiệm được cộng 40 điểm nền.
     - Nếu khớp $\ge 1$ kỹ năng:
       $$\text{rule\_score} = \text{round}\!\left(0.60 \times \text{skills\_score} + 0.40 \times (\text{experience\_score} \text{ hoặc } 0)\right).$$
  2. **JD chỉ có kỹ năng (không rõ $E_{\text{req}}$):** $\text{rule\_score} = \text{skills\_score}$ (chuẩn hóa 100% vào tiêu chí kỹ năng).
  3. **JD chỉ có kinh nghiệm ($S_{\text{req}} = \emptyset$):** $\text{rule\_score} = \text{experience\_score}$ (hoặc $0$ nếu $E_{\text{cand}} = \text{None}$).
  4. **JD không trích xuất được tiêu chí nào:** $\text{rule\_score} = 0$.

#### Tầng 2 — Semantic Similarity & Hybrid Fusion trên Backend (`MatchingService.integrateSemanticSimilarity`)
1. **Khoảng cách vector (`EmbeddingRepository.calculateCosineDistance`):**
   Truy vấn `pgvector` toán tử cosine distance $d = 1 - \cos(\mathbf{v}_{\text{cv}}, \mathbf{v}_{\text{jd}}) \in [0, 2]$ giữa vector `cv_version` và `job` (1536 chiều). Nếu job chưa có vector trong DB, Backend thử sinh lười (lazy backfill) qua `JobEmbeddingService`.
2. **Chuẩn hóa điểm ngữ nghĩa (`normalizeCosineDistance`):**
   $$\text{semantic\_score} = \text{round}_{0.1}\!\left(\text{clamp}\!\left(1.0 - \frac{d}{2.0},\ 0.0,\ 1.0\right) \times 100.0\right) \in [0.0,\ 100.0].$$
   ($d = 0.0 \Rightarrow 100.0$; $d = 1.0 \text{ (trực giao)} \Rightarrow 50.0$; $d = 2.0 \Rightarrow 0.0$.)
3. **Hợp nhất Hybrid & Cơ chế Fallback sạch (`rule_based_fallback`):**
   - Khi có đủ vector hợp lệ ($d$ tồn tại):
     $$\text{overall\_score} = \text{clamp}\!\left(\text{round}\!\left(w_{\text{rule}} \cdot \text{rule\_score} + w_{\text{sem}} \cdot \text{semantic\_score}\right),\ 0,\ 100\right)$$
     với mặc định đóng băng $w_{\text{rule}} = 0.60,\ w_{\text{sem}} = 0.40$; gán `scoring_mode = "hybrid"`.
   - Khi thiếu vector hoặc DB vector lỗi: **không bịa đặt số 0**, giữ nguyên `overall_score = rule_score`, đặt `semantic_score = null`, `semantic_similarity = null`, và gán `scoring_mode = "rule_based_fallback"`.
4. **Xếp hạng ứng viên (`Ranking`):**
   Sắp xếp giảm dần theo `overallScore NULLS LAST`, hòa điểm phân tách theo `applied_at ASC` (nộp sớm hơn xếp trên) và `application_id ASC`.

### 2.4. Explanation & Transparency (Giải thích kết quả & Truy vết)

1. **Tầng AI Worker:** Trả kèm `breakdown` (`algorithm_version`, `required_skills`, `required_skills_matched`, `missing_skills`, `experience_gated`, `candidate_experience_years`, `required_experience_years`) và chuỗi `rationale` tự nhiên phản ánh chính xác trường hợp tính điểm (đủ tiêu chí, thiếu kinh nghiệm trên CV, không xác định yêu cầu, hay bị gate kinh nghiệm về 0%).
2. **Tầng Backend (`MatchingService` + `MatchingResultMapper`):**
   - `MatchingService` bổ sung metadata cấu hình (`scoring_mode`, `config_version`, `algorithm_id`, `shortlist_threshold`, `review_threshold`, `rule_score`, `rule_weight`, `semantic_score`, `semantic_weight`, `semantic_similarity`, `cosine_distance`) vào `breakdown`, đồng thời nối câu tóm tắt công thức Hybrid vào `explanation`.
   - `MatchingResultMapper` chuẩn hóa các key `snake_case` của worker sang `camelCase` (`requiredSkills`, `matchedSkills`, `missingSkills`) cho API công khai `GET /api/v1/applications/{id}/matching-result`, không tự suy diễn missing/matched khi một trong hai vắng mặt.
3. **Tầng Frontend (`MatchingResultPanel.jsx` & `RankingView.jsx`):** Hiển thị 3 thẻ điểm tổng/kỹ năng/kinh nghiệm, progress bar từng tiêu chí, badge xanh/vàng cho kỹ năng khớp/thiếu, khung JSON `Chi tiết breakdown`, văn bản `Giải thích kết quả` và bộ lọc ngưỡng `>= 85`, `>= 70`, `>= 50`.

**Ví dụ đầu ra thực tế đã xác minh từ AI Worker:**

- **Case A — Strong Match (`pair-013`, Data Analyst, 4 năm vs 2 năm):**
```json
{
  "overall_score": 100,
  "skills_score": 100,
  "experience_score": 100,
  "breakdown": {
    "algorithm_version": "baseline-rule-v1.0.0",
    "required_skills": ["Data Warehousing", "Power BI", "Python", "SQL", "Tableau"],
    "required_skills_matched": ["Data Warehousing", "Power BI", "Python", "SQL", "Tableau"],
    "missing_skills": [],
    "experience_gated": false,
    "candidate_experience_years": 4,
    "required_experience_years": 2
  },
  "rationale": "Candidate matches all 5 required skill(s) with 4 of 2 required year(s) of experience."
}
```

- **Case B — Gated Unrelated Match (`pair-017`, Executive Chef 8 năm ứng tuyển Data Analyst):**
```json
{
  "overall_score": 0,
  "skills_score": 0,
  "experience_score": 0,
  "breakdown": {
    "algorithm_version": "baseline-rule-v1.0.0",
    "required_skills": ["Data Warehousing", "Power BI", "Python", "SQL", "Tableau"],
    "required_skills_matched": [],
    "missing_skills": ["Data Warehousing", "Power BI", "Python", "SQL", "Tableau"],
    "experience_gated": true,
    "candidate_experience_years": 8,
    "required_experience_years": 2
  },
  "rationale": "Candidate matches 0 of 5 required skill(s). Experience credit (8 of 2 year(s)) is gated to 0% because no required technical skills were verified. Missing skills: Data Warehousing, Power BI, Python, SQL, Tableau."
}
```

- **Case C — Verified Skills với Kinh nghiệm CV không xác định (`test_scenario_4`):**
```json
{
  "overall_score": 60,
  "skills_score": 100,
  "experience_score": null,
  "breakdown": {
    "algorithm_version": "baseline-rule-v1.0.0",
    "required_skills": ["Java", "Spring Boot"],
    "required_skills_matched": ["Java", "Spring Boot"],
    "missing_skills": [],
    "experience_gated": false,
    "required_experience_years": 3
  },
  "rationale": "Candidate matches all 2 required skill(s) (60% verified match). Required experience (3 year(s)) could not be verified from CV."
}
```

---

## 3. Reproducible Fixed-Fixture Benchmark Results (Kết Quả Benchmark Tái Lập)

### 3.1. Lệnh tái lập chuẩn & Thông số môi trường

- **Seed cố định:** `20261120`
- **Môi trường đo:** Python `3.12.14` trên `Windows-10-10.0.19045-SP0` | `git commit: 14d957d`
- **Lưu ý minh bạch:** Toàn bộ số liệu bên dưới chạy trên **chế độ đóng băng mặc định (`AI_PROVIDER=deterministic`)**, tức embedding semantic 1536d được sinh từ hàm băm SHA-256 + lượng giác để đảm bảo zero-network, determinism 100%, không phản ánh chất lượng ngữ nghĩa của `text-embedding-3-small` thật.

```powershell
# 1. Chạy toàn bộ Final Benchmark và kiểm chứng khớp 100% với Expected Snapshot
$env:PYTHONPATH="ai-worker"
uv run --python 3.12 --with-requirements ai-worker/requirements.txt python evaluation/run_final_benchmark.py `
  --seed 20261120 --warmup 5 --iterations 50 --stability-iterations 30 `
  --output evaluation/results/final_benchmark_results.json `
  --verify-expected evaluation/results/expected_benchmark_snapshot.json

# 2. Chạy toàn bộ unit test AI Worker + Evaluation + Freeze Reproducibility
uv run --python 3.12 --with-requirements ai-worker/requirements.txt python -m pytest -p no:cacheprovider -v `
  ai-worker/tests evaluation/test_ranking_metrics.py evaluation/test_input_robustness.py evaluation/test_model_freeze_reproducibility.py
```

### 3.2. Suite 1 — Parsing & Normalization trên Fixed Fixtures (`13/13 PASS`)

| Fixture | Loại | Expected | Actual | Kết quả |
|---|---|---|---|---|
| `cv_en_backend.pdf` | CV | `OK`, 1 page, `Johnathan Doe`, exp=4, 6 backend skills | `OK`, 1 page, 277 chars, `Johnathan Doe`, `john.doe@example.test`, exp=4, 6 skills | **PASS** |
| `cv_en_backend.docx` | CV | `OK`, 1 page, `Johnathan Doe`, `+84901234567`, exp=4, EN+VI | `OK`, 1 page, 542 chars, `Johnathan Doe`, `+84901234567`, exp=4, 10 skills, `['English','Vietnamese']` | **PASS** |
| `cv_vi_backend.docx` | CV | `OK`, 1 page, `Nguyễn Văn An`, `0987654321`, exp=4, EN+VI | `OK`, 1 page, 409 chars, `Nguyễn Văn An`, `0987654321`, exp=4, 8 skills, `['English','Vietnamese']` | **PASS** |
| `cv_minimal.docx` | CV | `OK`, `Nguyen Minimal`, `phone=None`, `skills=[]`, `exp=None` | `OK`, 42 chars, `Nguyen Minimal`, `phone=None`, `skills=[]`, `exp=None`, `edu=None` | **PASS** |
| `cv_minimal.pdf` | CV | `OK`, `Candidate Name Only`, `email=None`, `skills=[]`, `exp=None` | `OK`, 19 chars, `Candidate Name Only`, `email=None`, `skills=[]`, `exp=None` | **PASS** |
| `cv_unrelated.docx` | CV | `OK`, `Jane Designer`, `skills=[]`, `exp=3` | `OK`, 92 chars, `Jane Designer`, `skills=[]`, `exp=3` | **PASS** |
| `corrupt.pdf` | CV (Neg) | `ValueError`: `Corrupted or invalid PDF header` | `ValueError`: `Corrupted or invalid PDF header.` | **PASS** |
| `corrupt.docx` | CV (Neg) | `ValueError`: `Corrupted or invalid DOCX header` | `ValueError`: `Corrupted or invalid DOCX header.` | **PASS** |
| `unsupported.txt` | CV (Neg) | `ValueError`: `Unsupported file format` | `ValueError`: `Unsupported file format. Only PDF (.pdf) and Word (.docx) files are supported.` | **PASS** |
| `jd_en_backend.json` | JD_JSON | `Backend Developer` (`Senior`), 6 skills, exp=4 | `Backend Developer` (`Senior`), 6 skills, exp=4 | **PASS** |
| `jd_vi_backend.json` | JD_JSON | `Backend Developer` (`Senior`), 5 skills, exp=3 | `Backend Developer` (`Senior`), 5 skills, exp=3 | **PASS** |
| `jd_en_freeform.txt` | JD_TEXT | `Backend Developer` (`Senior`), `Kafka` ở `preferred`, exp=4 | `Backend Developer` (`Senior`), 9 req skills, `preferred=['Kafka']`, exp=4 | **PASS** |
| `jd_vi_freeform.txt` | JD_TEXT | `Backend Developer` (`Senior`), `Kafka/Redis` ở `preferred`, exp=3 | `Backend Developer` (`Senior`), 6 req skills, `preferred=['Kafka','Redis']`, exp=3 | **PASS** |

### 3.3. Suite 2 — Matching, Ranking & Threshold Classification trên 18 Cặp Cố Định

#### A. Tổng hợp độ chính xác Ranking & Classification (`evaluation/datasets/pilot_cv_jd_eval_dataset.json` v1.1.0-frozen)

| Chỉ số | Frozen Hybrid (`0.60 / 0.40`, SHA-256) | Pure Rule Baseline (`1.00 / 0.00`) | Ghi chú |
|---|---:|---:|---|
| **Comparable Pairs** | 42 | 42 | Bỏ qua các cặp cùng grade trong mỗi JD |
| **Concordant / Discordant / Ties** | **40 / 0 / 2** | **38 / 0 / 4** | **0 discordant pairs** ở cả hai chế độ |
| **Pooled Pairwise Accuracy** | **97.62%** (`0.9762`) | **95.24%** (`0.9524`) | Hybrid phá bớt tie ở nhóm 0 điểm |
| **Macro Pairwise Accuracy** | **98.67%** (`0.9867`) | **97.33%** (`0.9733`) | Backend `0.96`/`0.92`, Fullstack `1.00`, Data Analyst `1.00` |
| **Expected Macro NDCG@3** | **1.0000** | **1.0000** | Không còn tie giả top-3 sau khi bổ sung BI taxonomy |
| **Shortlist `TH = 70` (P / R / F1)** | `1.0000` / `0.5000` / `0.6667` (`TP=3, FP=0, TN=10, FN=3`) | `1.0000` / `0.6667` / `0.8000` (`TP=4, FP=0, TN=10, FN=2`) | Vector SHA-256 ~50 kéo hybrid score xuống ~14–20 điểm ở top đầu |
| **Review `TH = 50` (P / R / F1)** | `0.8571` / `1.0000` / `0.9231` (`TP=6, FP=1, TN=9, FN=0`) | `0.8571` / `1.0000` / `0.9231` (`TP=6, FP=1, TN=9, FN=0`) | Bắt trọn 100% ứng viên `shortlist_eligible=true` |

#### B. Phân tách điểm theo Relevance Grade (Hybrid 60/40)

| Ground-Truth Grade | Số cặp | Mean Score | Min Score | Max Score |
|---|---:|---:|---:|---:|
| **Grade 0** (Unrelated) | 4 | **20.0** | 20 | 20 |
| **Grade 1** (Minimal) | 3 | **22.7** | 20 | 27 |
| **Grade 2** (Partial) | 5 | **40.0** | 32 | 51 |
| **Grade 3** (Meets Requirements) | 3 | **58.3** | 55 | 62 |
| **Grade 4** (Exceeds Requirements) | 3 | **75.3** | 72 | 80 |

#### C. Threshold Sweep (50–85) & Weight Sweep (`TH = 70`)

| Threshold | Hybrid 60/40 (`TP/FP/TN/FN`) | Hybrid P / R / F1 | Rule 100/0 (`TP/FP/TN/FN`) | Rule P / R / F1 |
|---:|---|---|---|---|
| **50** | `6 / 1 / 9 / 0` | `0.8571 / 1.0000 / 0.9231` | `6 / 1 / 9 / 0` | `0.8571 / 1.0000 / 0.9231` |
| **60** | `4 / 0 / 10 / 2` | `1.0000 / 0.6667 / 0.8000` | `5 / 0 / 10 / 1` | `1.0000 / 0.8333 / 0.9091` |
| **65** | `3 / 0 / 10 / 3` | `1.0000 / 0.5000 / 0.6667` | `4 / 0 / 10 / 2` | `1.0000 / 0.6667 / 0.8000` |
| **70** | `3 / 0 / 10 / 3` | `1.0000 / 0.5000 / 0.6667` | `4 / 0 / 10 / 2` | `1.0000 / 0.6667 / 0.8000` |
| **75** | `1 / 0 / 10 / 5` | `1.0000 / 0.1667 / 0.2857` | `3 / 0 / 10 / 3` | `1.0000 / 0.5000 / 0.6667` |
| **80** | `1 / 0 / 10 / 5` | `1.0000 / 0.1667 / 0.2857` | `3 / 0 / 10 / 3` | `1.0000 / 0.5000 / 0.6667` |
| **85** | `0 / 0 / 10 / 6` | `0.0000 / 0.0000 / 0.0000` | `3 / 0 / 10 / 3` | `1.0000 / 0.5000 / 0.6667` |

| `rule_weight` / `semantic_weight` | Pooled Acc | Macro Acc | NDCG@3 | P (`TH=70`) | R (`TH=70`) | F1 (`TH=70`) |
|---|---:|---:|---:|---:|---:|---:|
| `1.00 / 0.00` (Rule Baseline) | `0.9524` | `0.9733` | `1.0000` | `1.0000` | `0.6667` | `0.8000` |
| `0.70 / 0.30` | `0.9762` | `0.9867` | `1.0000` | `1.0000` | `0.5000` | `0.6667` |
| **`0.60 / 0.40` (Frozen Demo)** | **`0.9762`** | **`0.9867`** | **`1.0000`** | **`1.0000`** | **`0.5000`** | **`0.6667`** |
| `0.50 / 0.50` | `0.9881` | `0.9933` | `1.0000` | `1.0000` | `0.3333` | `0.5000` |
| `0.40 / 0.60` | `0.9881` | `0.9933` | `1.0000` | `1.0000` | `0.1667` | `0.2857` |
| `0.00 / 1.00` (SHA-256 only) | `0.5119` | `0.3981` | `0.5986` | `0.0000` | `0.0000` | `0.0000` |

> **Giải thích sự nén điểm của Hybrid trên vector SHA-256:** Khi `rule_score = 100` kết hợp với vector giả SHA-256 gần trực giao (`semantic_score ≈ 50.0`), điểm hybrid trần đạt $0.6 \times 100 + 0.4 \times 50 = 80$, còn `rule_score = 64` cho hybrid $58$. Khi dùng OpenAI `text-embedding-3-small` thật ở môi trường production, cặp tương đồng cao có semantic score ~80–90 sẽ đẩy nhóm Grade 3–4 vượt lại ngưỡng `>= 70`.

#### D. Bảng Expected vs Actual đầy đủ cho toàn bộ 18 cặp CV–JD

| Pair | JD | CV ID (Chars) | Exp Grade / Ord / Short | Rank (Hyb/Rule) | Skills / Exp | Rule | Sem (SHA) | Hybrid | Gate | Matched / Missing Skills |
|---|---|---|---|---:|---|---:|---:|---:|:---:|---|
| `pair-001` | `backend-sr` | `cv-en-sr-java-perfect` (170) | G4 / #1 / `True` | #1 / #1 | 86 / `None` | 86 | 57.0 | **74** | No | 6/7 (`System Design` miss) |
| `pair-018` | `backend-sr` | `cv-edge-excessive-length` (4626) | G3 / #2 / `True` | #2 / #2 | 71 / `None` | 71 | 49.4 | **62** | No | 5/7 (`Kubernetes, System Design`) |
| `pair-002` | `backend-sr` | `cv-en-sr-java-standard` (161) | G3 / #2 / `True` | #3 / #3 | 57 / `None` | 57 | 51.1 | **55** | No | 4/7 (`K8s, Microservices, SysDes`) |
| `pair-003` | `backend-sr` | `cv-en-mid-java-partial` (114) | G2 / #3 / `False` | #4 / #4 | 29 / `None` | 29 | 50.5 | **38** | No | 2/7 (`Java, Spring Boot`) |
| `pair-004` | `backend-sr` | `cv-en-frontend-react` (139) | G1 / #4 / `False` | #5 / #5 | 0 / `None` | 0 | 52.5 | **21** | No | 0/7 |
| `pair-005` | `backend-sr` | `cv-en-graphic-designer` (146) | G0 / #5 / `False` | #6 / #6 | 0 / `None` | 0 | 49.7 | **20** | No | 0/7 |
| `pair-006` | `backend-sr` | `cv-en-missing-skills-high-exp` (133) | G1 / #5 / `False` | #7 / #7 | 0 / `None` | 0 | 49.5 | **20** | No | 0/7 |
| `pair-007` | `backend-sr` | `cv-en-minimal-unspecified` (85) | G0 / #7 / `False` | #8 / #8 | 0 / `None` | 0 | 48.9 | **20** | No | 0/7 |
| `pair-008` | `fullstack-mid` | `cv-vi-fullstack-excellent` (172) | G4 / #1 / `True` | #1 / #1 | 78 / 100 | 87 | 50.1 | **72** | No | 7/9 (`JavaScript, MySQL` miss) |
| `pair-011` | `fullstack-mid` | `cv-vi-junior-fullstack` (116) | G2 / #4 / `False` | #2 / #2 | 44 / 33 | 40 | 50.0 | **44** | No | 4/9 (`Java, MySQL, React, Spring Boot`) |
| `pair-009` | `fullstack-mid` | `cv-vi-backend-pure` (137) | G2 / #2 / `Null` | #3 / #3 | 44 / 0 | 26 | 49.6 | **35** | No | 4/9 (xem ghi chú phủ định ở Mục 4) |
| `pair-010` | `fullstack-mid` | `cv-vi-frontend-react-only` (128) | G2 / #3 / `Null` | #4 / #4 | 33 / 0 | 20 | 50.0 | **32** | No | 3/9 (xem ghi chú phủ định ở Mục 4) |
| `pair-012` | `fullstack-mid` | `cv-vi-marketing-digital` (102) | G0 / #5 / `False` | #5 / #5 | 0 / 0 | 0 | 50.8 | **20** | **Yes** | 0/9 (exp gated 4->0%) |
| `pair-013` | `data-analyst` | `cv-en-senior-bi-analyst` (159) | G4 / #1 / `True` | #1 / #1 | 100 / 100 | 100 | 49.5 | **80** | No | 5/5 (`Data Warehousing, Power BI, Python, SQL, Tableau`) |
| `pair-014` | `data-analyst` | `cv-en-mid-sql-analyst` (122) | G3 / #2 / `True` | #2 / #2 | 40 / 100 | 64 | 50.2 | **58** | No | 2/5 (`SQL, Tableau`) |
| `pair-015` | `data-analyst` | `cv-en-python-backend-dev` (110) | G2 / #3 / `False` | #3 / #3 | 20 / 100 | 52 | 49.2 | **51** | No | 1/5 (`Python`) |
| `pair-016` | `data-analyst` | `cv-en-fresh-finance-grad` (120) | G1 / #4 / `False` | #4 / #4 | 20 / `None` | 12 | 50.1 | **27** | No | 1/5 (`SQL`, exp missing on CV) |
| `pair-017` | `data-analyst` | `cv-en-culinary-chef` (125) | G0 / #5 / `False` | #5 / #5 | 0 / 0 | 0 | 49.8 | **20** | **Yes** | 0/5 (exp gated 8->0%) |

### 3.4. Suite 3 & 4 — Stability (30 vòng) & Fallback Resilience (`6/6 PASS`)

- **Stability (`evaluation/evaluate_stability.py`, 30 lần lặp):**
  - `Strong Candidate`: Mean = `80.0`, $\sigma = 0.0$, Min/Max = `80/80`
  - `Partial Candidate`: Mean = `39.0`, $\sigma = 0.0$, Min/Max = `39/39`
  - `Unrelated Candidate`: Mean = `20.0`, $\sigma = 0.0$, Min/Max = `20/20`
  - `ranking_consistency_rate = 1.0`, `observed_rank_changes = 0`, `ranking_sanity_passed = true` (`Strong (80.0) > Partial (39.0) > Unrelated (20.0)`).
- **Fallback & Failure Resilience (`6/6 PASS`):**
  - `openai_empty_api_key` -> trả vector 1536d, `model="deterministic-sha256-1536d-v1"`.
  - `openai_http_429_fallback_enabled` / `openai_http_500_fallback_enabled` / `openai_timeout_fallback_enabled` -> trả vector 1536d, `model="deterministic-sha256-1536d-v1-fallback"`.
  - `openai_timeout_fallback_disabled_strict` -> ném `RuntimeError` chống trộn vector space (HTTP `503` qua API `/api/v1/embeddings`).
  - `zero_skill_experience_gating` -> `overall_score=0, skills_score=0, experience_score=0, experience_gated=true`.

### 3.5. Suite 5 — Latency Profile (18 Stages, `warmup=5`, `iterations=50`)

| Stage | Fixture | Mean (ms) | p50 (ms) | p95 (ms) | Min (ms) | Max (ms) |
|---|---|---:|---:|---:|---:|---:|
| Document Extraction | PDF Extraction (EN, 873 B) | 0.806 | 0.691 | 0.782 | 0.666 | 5.558 |
| Document Extraction | PDF Extraction (Minimal, 598 B) | 0.445 | 0.435 | 0.515 | 0.419 | 0.606 |
| Document Extraction | DOCX Extraction (EN, 36.9 KB) | 7.633 | 5.244 | 21.584 | 4.956 | 22.335 |
| Document Extraction | DOCX Extraction (VI, 36.9 KB) | 8.075 | 5.288 | 23.075 | 4.908 | 27.018 |
| Normalization | CV Normalization (EN text, ~1.2 KB) | 2.131 | 2.123 | 2.190 | 2.106 | 2.192 |
| Normalization | CV Normalization (VI text, ~1.2 KB) | 1.489 | 1.481 | 1.537 | 1.470 | 1.543 |
| Normalization | JD Normalization (EN free-form, 633 B) | 1.966 | 1.955 | 2.403 | 1.809 | 2.894 |
| Normalization | JD Normalization (VI free-form, 839 B) | 2.093 | 1.981 | 3.163 | 1.960 | 3.518 |
| Baseline Matching | Matching Calculation (EN candidate & JD) | 2.663 | 2.492 | 3.851 | 2.415 | 4.071 |
| Baseline Matching | Matching Calculation (VI candidate & JD) | 1.870 | 1.852 | 2.025 | 1.814 | 2.083 |
| End-to-End Pipeline | End-to-End EN (DOCX extract -> Match) | 11.924 | 9.244 | 26.889 | 9.012 | 30.237 |
| End-to-End Pipeline | End-to-End VI (DOCX extract -> Match) | 11.061 | 8.680 | 24.259 | 8.255 | 24.505 |
| Embedding (Synthetic) | Synthetic 1536d SHA-256 (1 chunk) | 0.641 | 0.639 | 0.652 | 0.632 | 0.678 |
| Embedding (Synthetic) | Synthetic 1536d SHA-256 (Batch 10 chunks) | 6.384 | 6.369 | 6.435 | 6.331 | 6.780 |
| Embedding (Synthetic) | Synthetic 1536d SHA-256 (Batch 50 chunks) | 31.873 | 31.830 | 32.206 | 31.625 | 32.533 |
| Batch Rank (Local Sim) | Local Simulation (1 candidate vs 1 JD) | 2.636 | 2.565 | 3.124 | 2.463 | 3.423 |
| Batch Rank (Local Sim) | Local Simulation (10 candidates vs 1 JD) | 25.288 | 25.408 | 26.074 | 24.054 | 26.081 |
| Batch Rank (Local Sim) | Local Simulation (50 candidates vs 1 JD) | 127.485 | 127.110 | 133.841 | 120.367 | 138.714 |

- **Ngân sách độ trễ khi bật OpenAI:** `AI_TIMEOUT_SECONDS = 10.0s` trên AI Worker cho mỗi lời gọi `POST https://api.openai.com/v1/embeddings`; Backend giữ `RestClient` HTTP call **ngoài database transaction** (`MatchingService`, `CvProcessingOrchestrator`) để tránh giữ lock DB trong lúc chờ mạng.

---

## 4. Hạn Chế, Thiên Lệch (Limitations & Bias) & Biện Pháp Kiểm Soát

1. **Nén điểm trực giao từ vector giả SHA-256 (Synthetic Orthogonality Bias):**
   - Trong chế độ `deterministic`, vector SHA-256 không mang ngữ nghĩa ngôn ngữ học mà gần như trực giao (`cosine_similarity ≈ 0`, `semantic_score ≈ 50.0`). Hệ quả là điểm Hybrid bị kéo về quanh vùng `50`: nhóm `Grade 4` chỉ đạt `72–80`, còn `Grade 3` đạt `55–62`, khiến `TH=70` có Recall `0.5000`. Khi demo offline, **bắt buộc diễn giải rõ** sự khác biệt giữa `TH=70` (Shortlist tự động chính xác cao) và `TH=50` (Review queue).
2. **Thiên lệch từ điển đóng (Closed-Vocabulary Recall Bias):**
   - `extract_skills_from_text` phụ thuộc `CANONICAL_SKILL_MAP` (`75` kỹ năng). Các công nghệ hoặc kỹ năng ngoài từ điển (ví dụ domain đặc thù y tế, tài chính, ERP, tên framework mới chưa thêm alias) không được ghi nhận vào `required_skills` / `matched_skills`.
3. **Không nhận diện phạm vi phủ định (Negation-Scope Blindness) — Quan sát thực tế trên `pair-009` và `pair-010`:**
   - Trong `pair-009` (`cv-vi-backend-pure`), câu *"Chưa có kinh nghiệm với React hay frontend."* vừa khiến `extract_skills_from_text` nhận nhầm `"React"`, vừa khiến `extract_experience_years` nhận `"Chưa có kinh nghiệm"` -> trả `0` năm (dù đầu câu ghi *"có 3 năm kinh nghiệm với Java..."*). Tương tự ở `pair-010` (*"Không có kinh nghiệm lập trình Java."* bị khớp `"Java"` và `0` năm). Đây là giới hạn cố hữu của lexical pattern matching trước khi thay bằng LLM/NER có nhận thức ngữ cảnh.
4. **Khoảng trống regex kinh nghiệm có từ bổ nghĩa (Modifier Gap) — Quan sát trên `job-en-backend-sr`:**
   - Cụm `"4+ years of hands-on experience"` trong `job-en-backend-sr` có từ `"hands-on"` xen giữa `of` và `experience`, nên regex `r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp|work(?:ing)?)"` không khớp. Hệ quả là JD này rơi về chế độ **skills-only** (`experience_score = null`), lý giải vì sao `pair-004`/`005`/`006`/`007` có `experience_gated = false` dù 0 kỹ năng khớp.
5. **Bước nhảy gián đoạn ở Gating Kinh nghiệm (Step-Function Cliff):**
   - Chính sách gating hiện tại là nhị phân (`0` kỹ năng khớp -> `experience_score = 0`; $\ge 1$ kỹ năng khớp -> mở khóa 100% điểm kinh nghiệm tối đa 40 điểm). Do đó một ứng viên chỉ khớp `1/5` kỹ năng như `pair-015` (chỉ có `Python`, 3 năm dev) vẫn nhận full `40` điểm kinh nghiệm và đạt `rule_score = 52`.
6. **Giới hạn PDF scan & Khoảng thời gian làm việc ngầm định:**
   - Worker không tích hợp OCR (`tesseract`/vision); PDF dạng ảnh quét trả về placeholder an toàn nên cho điểm `0`. Thời gian kinh nghiệm trong `work_experience` dạng `01/2020 - 06/2023` chưa tự cộng dồn thành `experience_years` tổng nếu CV không viết số năm tường minh.
7. **Quy mô tập đánh giá & Human-in-the-Loop Fairness:**
   - Pilot dataset gồm `18` cặp do 1 annotator gán nhãn (`2` cặp `pair-009`, `pair-010` vẫn để `shortlist_eligible: null` chờ reviewer nghiệp vụ xác nhận).
   - **Kiểm soát thiên lệch nhân khẩu học:** Hệ thống tính điểm chỉ lấy đầu vào `skills`, `experience_years`, `cv_text` kỹ thuật; tuyệt đối **không dùng tên riêng, giới tính, tuổi, quê quán hay tên trường đại học** làm trọng số điểm. Điểm AI chỉ mang tính **gợi ý xếp hạng & giải trình**, quyết định chuyển vòng (`screening`, `interview`, `rejected`) bắt buộc do nhà tuyển dụng thực hiện.
8. **Giới hạn kiến trúc vận hành đã ghi nhận:**
   - `JobService.triggerJobEmbedding` gọi `jobEmbeddingService.generateAndSaveJobEmbedding(job)` đồng bộ trong `afterCommit()` (có thể làm chậm request tạo/sửa job nếu AI Worker phản hồi chậm, và `catch` hiện xóa embedding cũ của job nếu sinh mới lỗi).
   - Trong CSDL `embeddings`, vector OpenAI (`text-embedding-3-small`) và vector giả SHA-256 (`deterministic-sha256-1536d-v1`) không nằm trong cùng không gian vector hình học; nếu đổi provider mà không re-index sẽ sinh điểm cosine vô nghĩa.

---

## 5. Demo Fallback Strategy & External Outage Runbook (Quy Trình Chuyển Baseline Khi Lỗi Dịch Vụ Ngoài)

Hệ thống thiết kế **4 lớp phòng thủ (4-Layer Resilience)** cho buổi demo và vận hành thực tế:

| Tình huống lỗi | Lớp xử lý tự động | Hành vi hệ thống |
|---|---|---|
| **Lớp 1:** OpenAI API lỗi (`401`, `429`, `5xx`, timeout `>10s`) khi bật `AI_EMBEDDING_FALLBACK_ENABLED=true` | `OpenAIProvider` (`ai-worker`) | Tự động fallback sang `DeterministicTestProvider` và báo `model = "deterministic-sha256-1536d-v1-fallback"` (chú ý: chỉ bật tạm cho demo nhanh; để tránh trộn vector space trên production cần đặt `false` và chuyển hẳn provider). |
| **Lớp 2:** Tắt fallback trộn vector (`AI_EMBEDDING_FALLBACK_ENABLED=false`) khi OpenAI sập | `POST /api/v1/embeddings` -> HTTP `503` | `MatchingService` bỏ qua phần semantic bị thiếu, chuyển sạch sang **`scoring_mode = "rule_based_fallback"`** (dùng 100% `rule_score`, không bịa số 0). |
| **Lớp 3:** Container `ai-worker` sập hoặc timeout kết nối từ Backend | `MatchingService` + `ProcessingJob` | `MatchController`/`MatchingScheduler` đánh dấu job `PENDING` với exponential backoff và lease token để retry an toàn khi worker hồi phục. |
| **Lớp 4:** Muốn demo 100% offline không cần container `ai-worker` | Backend Spring profile `ai-stub` | Dùng `AiWorkerStub` in-process (keyword overlap + SHA-256 vector), vẫn đi qua đầy đủ DB/Auth/Pipeline thật. |

### 5.1. Runbook thao tác nhanh cho Demo Operator

#### Kịch bản A: Chuyển AI Worker về chế độ Deterministic Đóng Băng (Khuyến nghị cho Demo ổn định)
```powershell
# Trong file .env ở thư mục gốc repo:
# AI_PROVIDER=deterministic
# AI_EMBEDDING_FALLBACK_ENABLED=true
# AI_API_KEY=

docker compose up -d --force-recreate ai-worker
```

#### Kịch bản B: Chuyển Backend về Pure Rule-Based Baseline (`1.00 / 0.00`) khi dịch vụ Embedding / Vector DB gặp sự cố
Không cần sửa code Java, chỉ cập nhật biến môi trường cho service `backend`:
```powershell
# Đặt trong .env hoặc shell trước khi restart backend:
$env:MATCHAJOB_SCORING_CONFIG_VERSION="v1.0-rule-baseline-100-0"
$env:MATCHAJOB_SCORING_ALGORITHM_ID="rule-only-baseline-v1"
$env:MATCHAJOB_SCORING_RULE_WEIGHT="1.00"
$env:MATCHAJOB_SCORING_SEMANTIC_WEIGHT="0.00"
$env:MATCHAJOB_SCORING_SHORTLIST_THRESHOLD="70"
$env:MATCHAJOB_SCORING_REVIEW_THRESHOLD="50"

docker compose up -d --force-recreate backend
```
*Lưu ý ràng buộc:* `MatchingScoringProperties.validate()` (`@PostConstruct`) yêu cầu `ruleWeight + semanticWeight` phải bằng `1.0` (sai số `< 0.001`) và hữu hạn (`Double.isFinite`).

#### Kịch bản C: Cô lập không gian vector nghiêm ngặt (Production)
```powershell
# Đặt trong .env:
# AI_PROVIDER=openai
# AI_EMBEDDING_FALLBACK_ENABLED=false
docker compose up -d --force-recreate ai-worker
```
Khi OpenAI lỗi, AI Worker trả HTTP `503` thay vì trộn vector SHA-256 vào bảng `embeddings`; `MatchingService` tự động ghi nhận `scoring_mode = "rule_based_fallback"`.

#### Kịch bản D: Bật Backend Offline Stub (`ai-stub`) nếu container `ai-worker` không khả dụng
```powershell
# Chạy Backend cục bộ với profile dev,ai-stub:
$env:SPRING_PROFILES_ACTIVE="dev,ai-stub"
cd backend; mvn spring-boot:run
```

#### Kịch bản E: Bắt buộc Re-index bảng `embeddings` khi chuyển đổi giữa OpenAI <-> Deterministic
Nếu đã lưu vector `text-embedding-3-small` vào bảng `embeddings` rồi chuyển sang `deterministic` (hoặc ngược lại), không được so sánh cosine giữa 2 vector space khác nhau:
```sql
-- 1. Xóa vector cũ không đồng nhất không gian vector
TRUNCATE TABLE embeddings;

-- 2. Đưa các CV đã extract về trạng thái cần tạo lại embedding hoặc kích hoạt lại xử lý / update job
```
Sau khi `TRUNCATE TABLE embeddings;`, khởi động lại `backend` & `ai-worker` ở cùng một provider duy nhất để tái lập vector đồng nhất cho các CV/Job mới, hoặc giữ `rule_weight=1.00, semantic_weight=0.00` suốt buổi demo nếu chưa re-index toàn bộ.

### 5.2. Checklist kiểm tra sau khi chuyển chế độ (Post-Switch Verification)
```powershell
# 1. Kiểm tra AI Worker health & active embedding model
curl.exe -s http://localhost:8001/health/ready
curl.exe -s -X POST http://localhost:8001/api/v1/embeddings -H "Content-Type: application/json" -d '{"texts":["Java Spring Boot"]}'
# -> Kiểm tra trường "model" khớp đúng provider dự kiến ("deterministic-sha256-1536d-v1" hoặc "text-embedding-3-small")

# 2. Kiểm tra Backend readiness (bao gồm db, pgVector, aiWorker)
curl.exe -s http://localhost:8081/api/actuator/health/readiness

# 3. Chạy lại verify reproducibility offline trên fixture cố định
$env:PYTHONPATH="ai-worker"
uv run --python 3.12 --with-requirements ai-worker/requirements.txt python evaluation/run_final_benchmark.py --verify-expected evaluation/results/expected_benchmark_snapshot.json
```
