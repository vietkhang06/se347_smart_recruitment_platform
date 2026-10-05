import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useFavorites } from "../../context/FavoritesContext";
import { useCandidateData } from "../../hooks/useCandidateData";
import {
  getPublicJobs,
  isJobOpen,
} from "../../services/candidateService";

const PAGE_SIZE = 8;

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

const list = (value) =>
  Array.isArray(value)
    ? value
    : String(value || "").split(/[,;]/);

const unique = (values) => [
  ...new Set(
    values
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ),
];

function plainText(html = "") {
  const doc = new DOMParser().parseFromString(
    String(html),
    "text/html",
  );

  doc
    .querySelectorAll("script,style,iframe,object")
    .forEach((node) => node.remove());

  doc
    .querySelectorAll("li,p,br,div")
    .forEach((node) => node.append(" "));

  return doc.body.textContent.replace(/\s+/g, " ").trim();
}

const locationKey = (value) =>
  normalize(value)
    .replace(/tp\.?\s*hcm|tphcm|hcm|sai gon/g, "ho chi minh")
    .replace(/thanh pho|tp\./g, "")
    .replace(/\s+/g, " ")
    .trim();

function typeKey(value) {
  const text = normalize(value);

  if (/hybrid|ket hop/.test(text)) return "Hybrid";
  if (/remote|tu xa/.test(text)) return "Làm việc từ xa";
  if (/part.?time|ban thoi gian/.test(text)) return "Bán thời gian";
  if (/full.?time|toan thoi gian/.test(text)) return "Toàn thời gian";
  if (/intern|thuc tap/.test(text)) return "Thực tập";
  if (/freelance|tu do/.test(text)) return "Freelance";

  return value || "";
}

const CATEGORIES = [
  "Frontend",
  "Backend",
  "Fullstack",
  "Mobile",
  "Kiểm thử / QA",
  "Dữ liệu / AI",
  "DevOps / Cloud",
  "An toàn thông tin",
  "Hệ thống / Mạng",
  "UI/UX sản phẩm số",
  "Business Analyst / Product",
  "CNTT khác",
];

function itCategories(job) {
  if (CATEGORIES.includes(job.category)) {
    return [job.category];
  }

  const title = normalize(job.title);

  const rules = [
    [/full.?stack/, "Fullstack"],
    [/front.?end/, "Frontend"],
    [/back.?end/, "Backend"],
    [/mobile|android|ios|flutter|react native/, "Mobile"],
    [/tester|testing|kiem thu|\bqa\b|\bqc\b/, "Kiểm thử / QA"],
    [/data|machine learning|\bai\b|du lieu/, "Dữ liệu / AI"],
    [/devops|cloud|\bsre\b/, "DevOps / Cloud"],
    [/security|an toan thong tin|bao mat/, "An toàn thông tin"],
    [
      /network|system administrator|it support|he thong|mang may tinh/,
      "Hệ thống / Mạng",
    ],
    [/designer|ui.?ux|ux.?ui/, "UI/UX sản phẩm số"],
    [
      /business analyst|product owner|product manager/,
      "Business Analyst / Product",
    ],
  ];

  const found = rules.find(([pattern]) => pattern.test(title));

  if (found) return [found[1]];

  const context = normalize(
    [
      job.category,
      ...list(job.summary?.industry),
      job.team,
    ].join(" "),
  );

  return /cong nghe|phan mem|engineering|\bit\b/.test(context)
    ? ["CNTT khác"]
    : [];
}

const LOCATIONS = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "Bình Dương",
  "Toàn quốc",
];

const TYPES = [
  "Toàn thời gian",
  "Bán thời gian",
  "Thực tập",
  "Hybrid",
  "Làm việc từ xa",
  "Freelance",
  "Hợp đồng",
];

const EXPERIENCE = [
  ["none", "Không yêu cầu kinh nghiệm"],
  ["under1", "Dưới 1 năm"],
  ["1-3", "Từ 1 đến dưới 3 năm"],
  ["3-5", "Từ 3 đến dưới 5 năm"],
  ["5plus", "Từ 5 năm"],
  ["unknown", "Chưa công bố"],
];

const SALARIES = [
  ["under10", "Dưới 10 triệu"],
  ["10-20", "10 – dưới 20 triệu"],
  ["20-30", "20 – dưới 30 triệu"],
  ["30-50", "30 – dưới 50 triệu"],
  ["50plus", "Từ 50 triệu"],
  ["negotiable", "Thỏa thuận"],
  ["unknown", "Chưa rõ / ngoại tệ"],
];

function experienceKey(value) {
  const text = normalize(value);

  if (/khong yeu cau|khong can|chua co|\b0\s+nam/.test(text)) {
    return "none";
  }

  if (/duoi 1|thang/.test(text)) return "under1";

  const match = text.match(/\d+(?:[.,]\d+)?/);

  if (!match) return "unknown";

  const years = Number(match[0].replace(",", "."));

  if (years < 1) return "under1";
  if (years < 3) return "1-3";
  if (years < 5) return "3-5";

  return "5plus";
}

function salaryRange(job) {
  const label = normalize(job.salary);

  if (
    job.salaryMode === "negotiable" ||
    /thoa thuan|thuong luong/.test(label)
  ) {
    return { kind: "negotiable" };
  }

  if (
    /usd|\$|eur|€|jpy|yen|gbp|£/.test(
      label + " " + normalize(job.salaryCurrency),
    )
  ) {
    return { kind: "unknown" };
  }

  const tokens = label.match(/\d[\d.,]*/g) || [];

  const numbers = tokens
    .map((token) => {
      if (/^\d{1,3}([.,]\d{3})+$/.test(token)) {
        return Number(token.replace(/[.,]/g, ""));
      }

      return Number(token.replace(",", "."));
    })
    .filter(Number.isFinite);

  if (!numbers.length) return { kind: "unknown" };

  const millions = /trieu|\bmillion\b/.test(label);

  if (
    !millions &&
    !/vnd|vnđ|dong|₫/.test(label) &&
    numbers[0] < 1000000
  ) {
    return { kind: "unknown" };
  }

  const values = numbers.map((number) =>
    millions && number < 1000000
      ? number
      : number / 1000000,
  );

  if (/toi da|duoi|up to/.test(label)) {
    return { kind: "vnd", min: 0, max: values[0] };
  }

  if (/^tu\s|from/.test(label)) {
    return { kind: "vnd", min: values[0], max: Infinity };
  }

  return {
    kind: "vnd",
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function salaryMatches(range, filter) {
  if (filter === "negotiable" || filter === "unknown") {
    return range.kind === filter;
  }

  if (range.kind !== "vnd") return false;

  const bands = {
    under10: [0, 10],
    "10-20": [10, 20],
    "20-30": [20, 30],
    "30-50": [30, 50],
    "50plus": [50, Infinity],
  };

  const band = bands[filter];

  return Boolean(
    band &&
      range.max >= band[0] &&
      range.min < band[1],
  );
}

function postedTime(job) {
  const raw = job.createdAt || job.postedAt || job.posted || "";

  const dmy = String(raw).match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  );

  if (dmy) {
    return new Date(
      +dmy[3],
      +dmy[2] - 1,
      +dmy[1],
    ).getTime();
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return Date.parse(raw) || 0;
  }

  return /vua xong|hom nay|gio truoc|phut truoc/.test(
    normalize(raw),
  )
    ? Infinity
    : 0;
}

function prepare(job) {
  return {
    ...job,
    types: unique([job.workType, job.type].map(typeKey)),
    categories: itCategories(job),
    skills: unique(list(job.specTags)),
    experienceText:
      job.exp || job.experience || "Chưa công bố",
    salaryRange: salaryRange(job),
  };
}

const PAGE_CSS = `
.jobs-classic .jobs-filter {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 3px 12px #102c1810;
  padding: 20px;
}

.jobs-classic .jobs-card {
  position: relative;
  height: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 2px 7px #102c1808;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: border-color .15s, box-shadow .15s;
}

.jobs-classic .jobs-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 14px #102c1810;
}

.jobs-classic .jobs-logo {
  width: 44px;
  height: 44px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--primary);
  color: white;
  font-weight: 750;
  flex-shrink: 0;
  overflow: hidden;
}

.jobs-classic .jobs-logo.alt {
  background: #2843b8;
}

.jobs-classic .jobs-title {
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.4;
  color: var(--text);
  text-decoration: none;
  overflow-wrap: anywhere;
}

/* Mở rộng vùng bấm của liên kết ra toàn bộ thẻ. */
.jobs-classic .jobs-title::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 12px;
  z-index: 1;
}

.jobs-classic .jobs-card:focus-within {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

.jobs-classic .jobs-title:hover {
  color: var(--primary);
}

/* Đặt nút lưu phía trên vùng liên kết của thẻ. */
.jobs-classic .jobs-heart {
  position: relative;
  z-index: 2;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  padding: 0;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.jobs-classic .jobs-tag {
  padding: 4px 7px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: .72rem;
  line-height: 1.3;
}

.jobs-classic .jobs-pay {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
}

.jobs-classic .jobs-description {
  font-size: .8rem;
  line-height: 1.65;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.65em;
}

.jobs-classic .jobs-card-foot {
  font-size: .72rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
  padding-top: 10px;
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.jobs-classic .jobs-minwidth {
  min-width: 0;
}

.jobs-classic .jobs-filter .form-label {
  font-size: .8rem;
  font-weight: 600;
}

.jobs-classic .jobs-filter small {
  font-size: .72rem;
}

.jobs-classic .jobs-chip {
  font-size: .75rem;
  max-width: 100%;
  overflow-wrap: anywhere;
  text-align: left;
}

.jobs-classic :focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 3px;
}

@media (min-width: 992px) {
  .jobs-classic .jobs-filter {
    position: sticky;
    top: 85px;
    max-height: calc(100vh - 110px);
    overflow: auto;
    scrollbar-width: thin;
  }
}

@media (max-width: 575px) {
  .jobs-classic .jobs-card {
    padding: 16px;
  }

  .jobs-classic h1 {
    font-size: 1.65rem;
  }

  .jobs-classic .jobs-sort {
    width: 100% !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .jobs-classic .jobs-card {
    transition: none;
  }
}
`;

export default function JobsPage() {
  const source = useCandidateData(getPublicJobs);

  const jobs = source
    .filter(isJobOpen)
    .map(prepare)
    .filter((job) => job.categories.length > 0);

  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();

  const keys = [
    "q",
    "location",
    "type",
    "category",
    "experience",
    "salary",
    "company",
    "skill",
  ];

  const filters = Object.fromEntries(
    keys.map((key) => [key, params.get(key) || ""]),
  );

  const sort = params.get("sort") || "new";

  function update(key, value) {
    const next = new URLSearchParams(params);

    if (key !== "page") next.delete("page");

    if (value) next.set(key, value);
    else next.delete(key);

    setParams(next, { replace: true });
  }

  function reset() {
    setParams({}, { replace: true });
  }

  function matches(job, key, value) {
    if (!value) return true;

    switch (key) {
      case "q": {
        const haystack = normalize(
          [
            job.title,
            job.company,
            ...job.categories,
            ...job.skills,
            ...list(job.reqTags),
          ].join(" "),
        );

        return normalize(value)
          .split(/\s+/)
          .every((word) => haystack.includes(word));
      }

      case "location":
        return locationKey(job.location).includes(
          locationKey(value),
        );

      case "type":
        return job.types.some(
          (type) => normalize(type) === normalize(typeKey(value)),
        );

      case "category":
        return job.categories.some(
          (category) => normalize(category) === normalize(value),
        );

      case "experience":
        return experienceKey(job.experienceText) === value;

      case "salary":
        return salaryMatches(job.salaryRange, value);

      case "company":
        return job.company === value;

      case "skill":
        return job.skills.some(
          (skill) => normalize(skill) === normalize(value),
        );

      default:
        return true;
    }
  }

  const filtered = jobs.filter((job) =>
    keys.every((key) => matches(job, key, filters[key])),
  );

  if (sort === "salary") {
    const salaryScore = (job) => {
      const range = job.salaryRange;

      if (range.kind !== "vnd") return -1;

      return Number.isFinite(range.max)
        ? range.max
        : range.min;
    };

    filtered.sort((a, b) => salaryScore(b) - salaryScore(a));
  } else if (sort === "title") {
    filtered.sort((a, b) =>
      String(a.title).localeCompare(String(b.title), "vi"),
    );
  } else {
    filtered.sort((a, b) => postedTime(b) - postedTime(a));
  }

  function count(key, value) {
    return jobs.filter(
      (job) =>
        keys.every(
          (otherKey) =>
            otherKey === key ||
            matches(job, otherKey, filters[otherKey]),
        ) && matches(job, key, value),
    ).length;
  }

  const locations = [...LOCATIONS];

  unique(jobs.map((job) => job.location)).forEach((value) => {
    if (
      !locations.some(
        (location) => locationKey(location) === locationKey(value),
      )
    ) {
      locations.push(value);
    }
  });

  const specs = [
    [
      "location",
      "Địa điểm",
      "Tất cả địa điểm",
      locations.map((value) => [value, value]),
    ],
    [
      "type",
      "Hình thức làm việc",
      "Tất cả hình thức",
      unique([
        ...TYPES,
        ...jobs.flatMap((job) => job.types),
      ]).map((value) => [value, value]),
    ],
    [
      "category",
      "Chuyên môn CNTT",
      "Tất cả chuyên môn CNTT",
      CATEGORIES.map((value) => [value, value]),
    ],
    [
      "experience",
      "Kinh nghiệm tối thiểu",
      "Tất cả mức kinh nghiệm",
      EXPERIENCE,
    ],
    [
      "salary",
      "Mức lương (VNĐ/tháng)",
      "Tất cả mức lương",
      SALARIES,
    ],
    [
      "company",
      "Công ty",
      "Tất cả công ty",
      unique(jobs.map((job) => job.company)).map(
        (value) => [value, value],
      ),
    ],
    [
      "skill",
      "Kỹ năng chuyên môn",
      "Tất cả kỹ năng",
      unique(jobs.flatMap((job) => job.skills))
        .sort((a, b) => a.localeCompare(b, "vi"))
        .map((value) => [value, value]),
    ],
  ];

  const active = keys.filter((key) => filters[key]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );

  const requestedPage = Number(params.get("page"));

  const page = Number.isFinite(requestedPage)
    ? Math.min(
        totalPages,
        Math.max(1, Math.floor(requestedPage)),
      )
    : 1;

  const visible = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  function selectedLabel(key) {
    if (key === "q") return `Từ khóa: ${filters.q}`;

    const spec = specs.find((item) => item[0] === key);

    const label =
      spec[3].find(([value]) => value === filters[key])?.[1] ||
      filters[key];

    return `${spec[1]}: ${label}`;
  }

  return (
    <div className="container py-4 py-lg-5 jobs-classic">
      <style>{PAGE_CSS}</style>

      <div className="mb-4">
        <h1 className="fw-bold mb-2">
          Khám phá cơ hội việc làm
        </h1>

        <p className="text-muted mb-0">
          Tìm kiếm trong {jobs.length} công việc CNTT đang tuyển
          từ các nhà tuyển dụng.
        </p>
      </div>

      <button
        type="button"
        className="btn btn-outline-success d-lg-none mb-3"
        aria-expanded={showFilters}
        aria-controls="jobs-filter-panel"
        onClick={() => setShowFilters(!showFilters)}
      >
        <i className="bi bi-sliders me-2" aria-hidden="true" />
        {showFilters ? "Ẩn bộ lọc" : "Bộ lọc tìm kiếm"}
        {active.length > 0 && ` (${active.length})`}
      </button>

      <div className="row g-4">
        <aside
          id="jobs-filter-panel"
          className={`col-lg-3 ${
            showFilters ? "" : "d-none d-lg-block"
          }`}
          aria-label="Bộ lọc việc làm"
        >
          <div className="jobs-filter">
            <div className="d-flex justify-content-between align-items-center mb-3 gap-2">
              <h2 className="h6 fw-bold mb-0">
                Bộ lọc tìm kiếm
              </h2>

              <button
                type="button"
                className="btn btn-link btn-sm text-muted p-0 text-decoration-none"
                onClick={reset}
              >
                Đặt lại
              </button>
            </div>

            <div className="mb-3">
              <label
                className="form-label"
                htmlFor="jobs-keyword"
              >
                Từ khóa
              </label>

              <input
                id="jobs-keyword"
                type="search"
                className="form-control form-control-sm"
                placeholder="Vị trí, công ty, kỹ năng…"
                maxLength={200}
                value={filters.q}
                onChange={(event) =>
                  update("q", event.target.value)
                }
              />
            </div>

            {specs.map(([key, label, all, options]) => (
              <div className="mb-3" key={key}>
                <label
                  className="form-label"
                  htmlFor={`jobs-${key}`}
                >
                  {label}
                </label>

                <select
                  id={`jobs-${key}`}
                  className="form-select form-select-sm"
                  value={filters[key]}
                  onChange={(event) =>
                    update(key, event.target.value)
                  }
                >
                  <option value="">{all}</option>

                  {filters[key] &&
                    !options.some(
                      ([value]) => value === filters[key],
                    ) && (
                      <option value={filters[key]}>
                        {filters[key]} ({count(key, filters[key])})
                      </option>
                    )}

                  {options.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text} ({count(key, value)})
                    </option>
                  ))}
                </select>

                {key === "experience" && (
                  <small className="text-muted d-block mt-1">
                    Theo mức kinh nghiệm tối thiểu tin yêu cầu.
                  </small>
                )}

                {key === "salary" && (
                  <small className="text-muted d-block mt-1">
                    Tìm tin có khoảng lương giao với mức bạn
                    chọn. Không quy đổi ngoại tệ.
                  </small>
                )}
              </div>
            ))}

            <p className="text-muted small mb-0">
              Số trong ngoặc là số tin khớp các bộ lọc còn lại.
            </p>

            <button
              type="button"
              className="btn btn-success w-100 d-lg-none mt-3"
              onClick={() => setShowFilters(false)}
            >
              Xem {filtered.length} kết quả
            </button>
          </div>
        </aside>

        <section
          className="col-lg-9 jobs-minwidth"
          aria-label="Kết quả tìm việc"
        >
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
            <div className="small text-muted" role="status">
              Tìm thấy{" "}
              <strong className="text-body">
                {filtered.length}
              </strong>{" "}
              việc làm phù hợp
            </div>

            <div className="d-flex align-items-center gap-2 jobs-sort">
              <label
                htmlFor="jobs-sort"
                className="small text-muted text-nowrap"
              >
                Sắp xếp:
              </label>

              <select
                id="jobs-sort"
                className="form-select form-select-sm"
                value={sort}
                onChange={(event) =>
                  update("sort", event.target.value)
                }
              >
                <option value="new">Mới đăng gần đây</option>
                <option value="salary">
                  Mức lương cao nhất
                </option>
                <option value="title">
                  Tên công việc A–Z
                </option>
              </select>
            </div>
          </div>

          {active.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              {active.map((key) => (
                <button
                  type="button"
                  key={key}
                  className="btn btn-sm btn-outline-success jobs-chip"
                  onClick={() => update(key, "")}
                  aria-label={`Bỏ lọc ${selectedLabel(key)}`}
                >
                  {selectedLabel(key)}{" "}
                  <i className="bi bi-x" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {visible.length > 0 ? (
            <div className="row g-3">
              {visible.map((job, index) => {
                const saved = isFavorite(job.id);

                const description = plainText(
                  job.desc ||
                    job.description ||
                    "Nhấn vào thẻ công việc để xem thông tin tuyển dụng.",
                );

                return (
                  <div className="col-lg-6" key={job.id}>
                    <article className="jobs-card">
                      <div className="d-flex gap-3 align-items-start mb-3">
                        <div
                          className={`jobs-logo ${
                            index % 2 === 0 ? "alt" : ""
                          }`}
                          aria-hidden="true"
                        >
                          {String(
                            job.logo || job.company || "CT",
                          ).slice(0, 2)}
                        </div>

                        <div className="flex-grow-1 jobs-minwidth">
                          <h2 className="h6 mb-1">
                            <Link
                              to={`/jobs/${job.id}`}
                              className="jobs-title"
                            >
                              {job.title}
                            </Link>
                          </h2>

                          <div className="small text-muted">
                            {job.company}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`btn jobs-heart ${
                            saved
                              ? "btn-outline-danger"
                              : "btn-outline-secondary"
                          }`}
                          aria-label={`${
                            saved ? "Bỏ lưu" : "Lưu"
                          } ${job.title}`}
                          aria-pressed={saved}
                          onClick={() => toggleFavorite(job.id)}
                        >
                          <i
                            className={`bi bi-heart${
                              saved ? "-fill" : ""
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      <div className="d-flex flex-wrap gap-1 mb-3">
                        <span className="jobs-tag jobs-pay">
                          {job.salary || "Chưa công bố lương"}
                        </span>

                        <span className="jobs-tag">
                          {job.location ||
                            "Chưa công bố địa điểm"}
                        </span>

                        {job.types.map((type) => (
                          <span className="jobs-tag" key={type}>
                            {type}
                          </span>
                        ))}

                        <span className="jobs-tag">
                          {job.experienceText}
                        </span>
                      </div>

                      <p className="jobs-description">
                        {description}
                      </p>

                      <div className="jobs-card-foot">
                        <span>
                          <i
                            className="bi bi-clock me-1"
                            aria-hidden="true"
                          />
                          {job.posted || "Chưa có ngày đăng"}
                        </span>

                        <span className="text-success">
                          Đang nhận hồ sơ
                        </span>

                        {job.isDemo && (
                          <span className="jobs-tag">
                            Tin mẫu phục vụ đồ án
                          </span>
                        )}

                        <span className="w-100">
                          Hạn nhận hồ sơ:{" "}
                          {job.deadline || "Chưa công bố"}
                        </span>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="jobs-filter text-center py-5">
              <i
                className="bi bi-search fs-1 text-muted"
                aria-hidden="true"
              />

              <h2 className="h5 fw-bold mt-3">
                Không tìm thấy việc làm phù hợp
              </h2>

              <p className="small text-muted">
                Thử thay đổi từ khóa hoặc bỏ bớt tiêu chí đang
                chọn.
              </p>

              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={reset}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <nav
              className="d-flex justify-content-between align-items-center gap-2 mt-4"
              aria-label="Phân trang việc làm"
            >
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                disabled={page === 1}
                onClick={() => update("page", String(page - 1))}
              >
                Trang trước
              </button>

              <span className="small text-muted">
                Trang {page} / {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                disabled={page === totalPages}
                onClick={() => update("page", String(page + 1))}
              >
                Trang sau
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}