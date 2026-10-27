import { httpClient } from "../httpClient";
import { toCompanyViewModel, toCompanyUpdateRequest } from "../../mappers/companyMapper";
import { mockCompanyService } from "../mock/mockCompanyService";
import { mockStore } from "../mockStore";

const isUUID = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(str || ""));

/**
 * apiCompanyService
 * Adapter gọi API Hồ sơ Doanh nghiệp thực tế:
 * - GET /v1/companies/me (Lấy thông tin công ty của HR đăng nhập)
 * - GET /v1/companies/{id} (Lấy thông tin công ty theo ID)
 * - PUT /v1/companies/{id} (Cập nhật thông tin công ty & danh sách đãi ngộ)
 */
export const apiCompanyService = {
  async getCompany(companyId = "COMP-01") {
    try {
      const endpoint = isUUID(companyId) ? `/v1/companies/${companyId}` : "/v1/companies/me";
      const response = await httpClient.get(endpoint);
      if (response && (response.id || response.name)) {
        return toCompanyViewModel(response);
      }
    } catch (err) {
      console.warn(`[apiCompanyService] Không thể lấy company (${companyId}), fallback sang mock:`, err.message);
    }
    return mockCompanyService.getCompany(companyId);
  },

  async updateCompany(companyId, updateData) {
    const payload = toCompanyUpdateRequest(updateData);
    try {
      let targetId = companyId;
      if (!isUUID(targetId)) {
        try {
          const me = await httpClient.get("/v1/companies/me");
          if (me?.id) targetId = me.id;
        } catch {
          // fallback to using targetId as is
        }
      }

      const response = await httpClient.put(`/v1/companies/${targetId}`, payload);
      
      // Đồng bộ vào mockStore cục bộ nếu có
      try {
        mockStore.updateCompany(targetId, updateData);
      } catch {}

      return toCompanyViewModel(response);
    } catch (err) {
      console.warn(`[apiCompanyService] Lỗi cập nhật company (${companyId}):`, err.message);
      if (err.status === 400 || err.status === 403 || err.status === 409 ||
          err.response?.status === 400 || err.response?.status === 403 || err.response?.status === 409) {
        const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
        const customErr = new Error(detail || "Không thể cập nhật hồ sơ doanh nghiệp.");
        customErr.status = err.status || err.response?.status;
        customErr.fieldErrors = err.response?.data?.fieldErrors || err.response?.data?.errors || err.fieldErrors;
        throw customErr;
      }
      return mockCompanyService.updateCompany(companyId, updateData);
    }
  }
};
