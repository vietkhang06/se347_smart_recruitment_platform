import { TOKEN_KEY } from "./dataMode";
export class HttpError extends Error {
  constructor(message, status, data = null) {
    super(message); this.name = "HttpError"; this.status = status; this.data = data;
  }
}
export function buildFullUrl(endpoint) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/+$/, "");
  let path = "/" + endpoint.replace(/^\/+/, "");
  if (base.endsWith("/api") && path.startsWith("/api/")) path = path.slice(4);
  return base + path;
}
async function request(endpoint, { auth = true, timeout = 15000, responseType = "json", ...options } = {}) {
  const headers = new Headers(options.headers);
  headers.set("Accept", responseType === "blob" ? "*/*" : "application/json, application/problem+json");
  const token = auth ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = options.body;
  if (body != null && typeof body === "object" && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json"); body = JSON.stringify(body);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeout);
  try {
    const transport = fetch;
    const response = await transport(buildFullUrl(endpoint), { ...options, headers, body, signal: controller.signal });
    if (response.ok && responseType === "blob") return await response.blob();
    const raw = response.status === 204 ? "" : await response.text();
    let data = raw || null;
    if (raw && /json/i.test(response.headers.get("content-type") || "")) {
      try { data = JSON.parse(raw); } catch { throw new HttpError("Máy chủ trả dữ liệu không hợp lệ.", response.status); }
    }
    if (!response.ok) {
      // Không xóa phiên mới nếu phản hồi thuộc token cũ.
      if (response.status === 401 && token && localStorage.getItem(TOKEN_KEY) === token) {
        window.dispatchEvent(new Event("matchajob:session-expired"));
      }
      const fields = data?.errors && typeof data.errors === "object" ? Object.values(data.errors).filter(value => typeof value === "string").join("; ") : "";
      throw new HttpError(fields || data?.detail || data?.message || data?.title || `Yêu cầu thất bại (${response.status}).`, response.status, data);
    }
    return data;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (options.signal?.aborted) throw error;
    throw new HttpError(controller.signal.aborted ? "Máy chủ phản hồi quá lâu. Hãy thử lại." : "Không kết nối được máy chủ. Kiểm tra backend và thử lại.", 0);
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener("abort", abort);
  }
}
export const httpClient = {
  get: (url, options) => request(url, { ...options, method: "GET" }),
  post: (url, body, options) => request(url, { ...options, method: "POST", body }),
  put: (url, body, options) => request(url, { ...options, method: "PUT", body }),
  patch: (url, body, options) => request(url, { ...options, method: "PATCH", body }),
  delete: (url, options) => request(url, { ...options, method: "DELETE" })
};