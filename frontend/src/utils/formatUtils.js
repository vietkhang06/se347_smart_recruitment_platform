/**
 * formatUtils.js
 * Bộ tiện ích chuẩn hóa định dạng số, tỷ lệ phần trăm, tiền tệ và ngày tháng theo quy chuẩn tiếng Việt (vi-VN).
 */

/**
 * Định dạng số nguyên hoặc số thực theo chuẩn Việt Nam (phân cách hàng nghìn bằng dấu chấm).
 * @param {number|string} val Giá trị số cần định dạng
 * @param {string} fallback Giá trị dự phòng nếu số không hợp lệ
 * @returns {string} Chuỗi số đã định dạng (VD: 1.250)
 */
export function formatNumber(val, fallback = "0") {
  if (val == null || val === "" || Number.isNaN(Number(val))) return fallback;
  const num = Number(val);
  try {
    return new Intl.NumberFormat("vi-VN").format(num);
  } catch {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
}

/**
 * Định dạng tỷ lệ phần trăm (VD: 85.5 -> 85,5% hoặc 94 -> 94%).
 * @param {number|string} val Giá trị phần trăm
 * @param {number} maxDecimals Số chữ số thập phân tối đa
 * @param {string} fallback Giá trị dự phòng
 * @returns {string} Chuỗi phần trăm (VD: "85,5%")
 */
export function formatPercent(val, maxDecimals = 1, fallback = "0%") {
  if (val == null || val === "" || Number.isNaN(Number(val))) return fallback;
  const num = Number(val);
  try {
    return new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: Number.isInteger(num) ? 0 : 1
    }).format(num) + "%";
  } catch {
    return `${num}%`;
  }
}

/**
 * Định dạng tiền tệ VNĐ (VD: 25000000 -> 25.000.000 ₫).
 * @param {number|string} val Số tiền
 * @param {string} fallback Giá trị dự phòng
 * @returns {string} Chuỗi tiền tệ
 */
export function formatCurrency(val, fallback = "Thương lượng") {
  if (val == null || val === "" || Number.isNaN(Number(val))) return fallback;
  const num = Number(val);
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(num);
  } catch {
    return `${formatNumber(num)} ₫`;
  }
}

/**
 * Định dạng ngày tháng năm chuẩn Việt Nam (DD/MM/YYYY).
 * @param {string|Date|number} val Ngày tháng
 * @param {string} fallback Giá trị dự phòng
 * @returns {string} Chuỗi ngày tháng (VD: 04/11/2026)
 */
export function formatDateVN(val, fallback = "Chưa cập nhật") {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(val);
  }
}

