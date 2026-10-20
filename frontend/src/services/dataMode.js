// Cùng giao diện, chọn dịch vụ demo (mặc định) hoặc backend thật.
// Giá trị fixture cũ được hiểu là mock để không làm mất các chức năng demo.
export const DATA_MODE = (import.meta.env.VITE_DATA_SOURCE || "mock").toLowerCase() === "api" ? "api" : "mock";
export const IS_API = DATA_MODE === "api";
export const TOKEN_KEY = "matchajob_access_token";