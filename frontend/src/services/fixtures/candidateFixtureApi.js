import { fixtureCategories, fixtureJobs, fixtureJobDetail, fixtureCandidate, emptyFixtureProfile } from "./candidateFixtures";

const STORE = "matchajob:candidate-fixture:v1";
const TOKEN_PREFIX = "fixture-session:";
const defaultPassword = "Demo123!";
const read = () => JSON.parse(localStorage.getItem(STORE) || '{"accounts":[],"profiles":{},"sessions":{}}');
const write = state => localStorage.setItem(STORE, JSON.stringify(state));
const emailOf = value => String(value || "").trim().toLowerCase();
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
const problem = (status, detail, code, errors) => reply({ type: "about:blank", title: "Fixture request failed", status, detail, code, ...(errors ? { errors } : {}) }, status);
// Chỉ phục vụ fixture cục bộ. Backend thật chịu trách nhiệm hash mật khẩu an toàn.
async function passwordDigest(email, password) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${email}:${password}`));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
function publicUser(account) {
  const { passwordDigest: _ignored, ...user } = account;
  return user;
}
function principal(state, headers) {
  const token = new Headers(headers).get("Authorization")?.replace(/^Bearer /, "");
  const session = state.sessions[token];
  if (!session || session.expiresAt <= Date.now()) return null;
  return state.accounts.find(account => account.id === session.userId && account.status === "active");
}
let seedDigest;
async function initialize() {
  seedDigest ||= passwordDigest(fixtureCandidate.email, defaultPassword);
  const digest = await seedDigest;
  const state = read();
  if (!state.accounts.some(account => account.id === fixtureCandidate.id)) {
    state.accounts.push({ ...fixtureCandidate, passwordDigest: digest });
    state.profiles[fixtureCandidate.id] = { ...emptyFixtureProfile(fixtureCandidate.id), headline: "Frontend Developer", location: "Dong Nai", experience_years: 0 };
    write(state);
  }
}
// Transport cho cùng HTTP client. Không chuyển tiếp route chưa hỗ trợ sang API/mock khác.
export async function fixtureFetch(url, options = {}) {
  await initialize();
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const parsed = new URL(url, "http://localhost");
  const path = parsed.pathname.replace(/^\/api(?=\/)/, "");
  const method = options.method || "GET";
  const body = typeof options.body === "string" ? JSON.parse(options.body) : options.body || {};
  let state = read();
  if (method === "POST" && path === "/v1/auth/register") {
    const email = emailOf(body.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return problem(400, "Email không hợp lệ.", "VALIDATION_ERROR", { email: "Nhập email hợp lệ." });
    if (typeof body.password !== "string" || body.password.length < 8 || new TextEncoder().encode(body.password).length > 72) return problem(400, "Mật khẩu không hợp lệ.", "VALIDATION_ERROR");
    if (!["CANDIDATE", "EMPLOYER"].includes(body.role)) return problem(400, "Vai trò không hợp lệ.", "VALIDATION_ERROR");
    const digest = await passwordDigest(email, body.password);
    // Đọc lại sau await để hai yêu cầu trùng email không ghi đè nhau trong cùng tab.
    state = read();
    if (state.accounts.some(account => account.email === email)) return problem(409, "Email đã tồn tại.", "EMAIL_ALREADY_EXISTS");
    const user = { id: crypto.randomUUID(), email, full_name: email.split("@")[0], role: body.role.toLowerCase(), status: "active", is_verified: true, companies: [] };
    state.accounts.push({ ...user, passwordDigest: digest });
    if (user.role === "candidate") state.profiles[user.id] = emptyFixtureProfile(user.id);
    write(state);
    return reply({ id: user.id, email, full_name: user.full_name, role: body.role, status: "active", is_verified: true, message: "Đã tạo tài khoản fixture. Bạn có thể đăng nhập." }, 201);
  }
  if (method === "POST" && path === "/v1/auth/login") {
    const email = emailOf(body.email);
    const digest = await passwordDigest(email, body.password || "");
    state = read();
    const account = state.accounts.find(user => user.email === email);
    if (!account || account.passwordDigest !== digest) return problem(401, "Email hoặc mật khẩu không đúng.", "INVALID_CREDENTIALS");
    if (account.status !== "active") return problem(401, "Tài khoản không hoạt động.", "ACCOUNT_SUSPENDED");
    const token = TOKEN_PREFIX + crypto.randomUUID();
    state.sessions[token] = { userId: account.id, expiresAt: Date.now() + 3600000 };
    write(state);
    return reply({ access_token: token, token_type: "Bearer", expires_in: 3600,
      user: { id: account.id, email: account.email, full_name: account.full_name, role: account.role.toUpperCase() } });
  }
  if (path === "/v1/users/me" || path === "/v1/candidates/profile") {
    const user = principal(state, options.headers);
    if (!user) return problem(401, "Phiên đăng nhập hết hạn hoặc không hợp lệ.", "UNAUTHORIZED");
    if (path === "/v1/users/me" && method === "GET") return reply(publicUser(user));
    if (user.role !== "candidate") return problem(403, "Chỉ ứng viên được truy cập hồ sơ.", "FORBIDDEN");
    if (method === "GET") return reply(state.profiles[user.id]);
    if (method === "PATCH") {
      const limits = { headline: 255, bio: 5000, education: 500, location: 255, address: 1000 };
      const next = { ...state.profiles[user.id] };
      for (const [key, limit] of Object.entries(limits)) {
        if (body[key] == null) continue;
        if (typeof body[key] !== "string" || body[key].length > limit) return problem(400, "Dữ liệu hồ sơ không hợp lệ.", "VALIDATION_ERROR", { [key]: `${key}: tối đa ${limit} ký tự.` });
        next[key] = body[key].trim() || null;
      }
      if (body.experience_years != null) {
        if (!Number.isInteger(body.experience_years) || body.experience_years < 0 || body.experience_years > 60) return problem(400, "Kinh nghiệm phải từ 0 đến 60 năm.", "VALIDATION_ERROR");
        next.experience_years = body.experience_years;
      }
      next.updated_at = new Date().toISOString(); state.profiles[user.id] = next; write(state);
      return reply(next);
    }
  }
  if (method === "GET" && path === "/v1/categories") return reply(fixtureCategories);
  if (method === "GET" && path === "/v1/jobs") {
    const q = Object.fromEntries(parsed.searchParams);
    const keyword = (q.keyword || "").trim().toLowerCase();
    let jobs = fixtureJobs.filter(job => job.status === "active"
      && (!keyword || `${job.title} ${job.location}`.toLowerCase().includes(keyword))
      && (!q.categoryId || job.category.id === q.categoryId)
      && (!q.location || job.location.toLowerCase().includes(q.location.trim().toLowerCase()))
      && (!q.workType || job.workType === q.workType) && (!q.level || job.level === q.level)
      && (!q.salaryMin || Math.max(job.salaryMin, job.salaryMax) >= Number(q.salaryMin))
      && (!q.salaryMax || job.salaryMin <= Number(q.salaryMax)));
    jobs.sort((a, b) => q.sortBy === "salary_desc" ? b.salaryMax - a.salaryMax : q.sortBy === "title_asc" ? a.title.localeCompare(b.title) : Date.parse(b.postedAt) - Date.parse(a.postedAt));
    const page = Math.max(0, Math.trunc(Number(q.page) || 0));
    const size = Math.min(50, Math.max(1, Math.trunc(Number(q.size) || 10)));
    const totalPages = Math.ceil(jobs.length / size);
    return reply({ content: jobs.slice(page * size, (page + 1) * size), page, size, totalElements: jobs.length, totalPages, last: page + 1 >= totalPages });
  }
  if (method === "GET" && /^\/v1\/jobs\/[^/]+$/.test(path)) {
    const job = fixtureJobs.find(item => item.id === decodeURIComponent(path.split("/").pop()));
    return job ? reply(fixtureJobDetail(job)) : problem(404, "Không tìm thấy tin tuyển dụng.", "JOB_NOT_FOUND");
  }
  return problem(501, "Fixture chưa hỗ trợ thao tác này.", "FIXTURE_NOT_IMPLEMENTED");
}