import { mockStore } from "../mockStore";
import { toCompanyViewModel } from "../../mappers/companyMapper";
const KEY = "matchajob_store_companies";
const LEGACY_KEY = "matchajob_store_companies_v2";
const profileFields = ["name", "shortName", "logo", "logoUrl", "coverImage", "coverImageUrl", "industry", "size", "location", "address", "website", "email", "phone", "taxCode", "established", "about", "description", "perks"];
function legacyCompanies() {
  try { const data = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]"); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
function owned(companyId) {
  const current = mockStore.getHRCompanyId();
  if (String(current) !== String(companyId)) throw new Error("Bạn không có quyền quản lý doanh nghiệp này.");
  const company = mockStore.getCompanies().find(c => String(c.id) === String(companyId));
  if (!company) throw new Error("Không tìm thấy doanh nghiệp.");
  // Giữ phần hồ sơ HR đã lưu bằng adapter v2 cũ, không ghi đè trạng thái duyệt của admin.
  const legacy = legacyCompanies().find(c => String(c.id) === String(companyId));
  const profile = {};
  for (const field of profileFields) if (legacy?.[field] !== undefined) profile[field] = legacy[field];
  return { ...company, ...profile };
}
export const mockCompanyService = {
  async getCompany(companyId) { return toCompanyViewModel(owned(companyId)); },
  async updateCompany(companyId, updates) {
    const company = owned(companyId);
    const profile = {};
    for (const field of profileFields) if (updates[field] !== undefined) profile[field] = updates[field];
    const next = { ...company, ...profile, id: company.id };
    const list = mockStore.getCompanies().map(c => String(c.id) === String(companyId) ? next : c);
    const legacy = legacyCompanies().filter(c => String(c.id) !== String(companyId));
    const before = [localStorage.getItem(KEY), localStorage.getItem(LEGACY_KEY)];
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      localStorage.setItem(LEGACY_KEY, JSON.stringify([...legacy, next]));
    } catch {
      [KEY, LEGACY_KEY].forEach((key, i) => { try { before[i] === null ? localStorage.removeItem(key) : localStorage.setItem(key, before[i]); } catch { /* Giữ lỗi lưu. */ } });
      throw new Error("Không lưu được hồ sơ doanh nghiệp. Kiểm tra dung lượng trình duyệt.");
    }
    window.dispatchEvent(new Event("matchajob:store-changed"));
    window.dispatchEvent(new Event("matchajob:companies-changed"));
    return toCompanyViewModel(next);
  }
};