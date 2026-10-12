/**
 * MatchaJob HTTP Client
 * Triển khai native fetch gọn nhẹ, an toàn, hỗ trợ baseURL, timeout, và tự động đính kèm headers
 */

export class HttpError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

// Cấu hình URL cơ sở: mặc định http://localhost:8081/api
const DEFAULT_BASE_URL = "http://localhost:8081/api";

function getBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) return DEFAULT_BASE_URL;
  return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
}

/**
 * Ghép đường dẫn an toàn không bị trùng lặp dấu gạch chéo
 */
function buildFullUrl(endpoint) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const base = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

/**
 * Xử lý request cốt lõi
 */
async function request(endpoint, options = {}) {
  const url = buildFullUrl(endpoint);

  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  // Đính kèm các header định danh (hỗ trợ quy ước Phase 3 backend)
  const candidateId = localStorage.getItem("matchajob_active_candidate_id");
  const userId = localStorage.getItem("matchajob_active_user_id");
  if (candidateId) defaultHeaders["X-Candidate-Id"] = candidateId;
  if (userId) defaultHeaders["X-User-Id"] = userId;

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // Xử lý 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Đọc payload phản hồi
    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        data?.title ||
        data?.detail ||
        `HTTP Request Failed with status ${response.status} (${response.statusText})`;
      throw new HttpError(errorMsg, response.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(err.message || "Network Error / Failed to connect to server", 0, null);
  }
}

export const httpClient = {
  get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: "GET" });
  },

  post(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: "POST", body });
  },

  put(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: "PUT", body });
  },

  patch(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: "PATCH", body });
  },

  delete(endpoint, options = {}) {
    return request(endpoint, { ...options, method: "DELETE" });
  }
};
