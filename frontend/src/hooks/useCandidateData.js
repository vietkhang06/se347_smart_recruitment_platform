import { useEffect, useState } from "react";
// Đọc lại khi ứng viên/HR sửa dữ liệu hoặc tab trình duyệt khác thay đổi localStorage.
export function useCandidateData(read) {
  const [, render] = useState(0);
  useEffect(() => {
    const refresh = () => render((n) => n + 1);
    window.addEventListener("matchajob:store-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("matchajob:store-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return read();
}
