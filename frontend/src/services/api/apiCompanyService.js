import { httpClient } from "../httpClient";
import { toCompanyViewModel, toCompanyUpdateRequest } from "../../mappers/companyMapper";
import { mockCompanyService } from "../mock/mockCompanyService";

/**
 * apiCompanyService
 * Adapter gọi API Doanh nghiệp.
 * Lưu ý: Backend hiện chưa có CompanyController (chỉ có bảng companies trong DB baseline V2).
 * Adapter này đã sẵn sàng mapper và cấu trúc gọi API, đồng thời fallback an toàn sang Mock.
 */
export const apiCompanyService = {
  async getCompany(companyId = "COMP-01") {
    try {
      const response = await httpClient.get(`/v1/companies/${companyId}`);
      return toCompanyViewModel(response);
    } catch {
      // Backend chưa có CompanyController -> fallback sang mock adapter
      return mockCompanyService.getCompany(companyId);
    }
  },

  async updateCompany(companyId, updateData) {
    const payload = toCompanyUpdateRequest(updateData);
    try {
      const response = await httpClient.put(`/v1/companies/${companyId}`, payload);
      return toCompanyViewModel(response);
    } catch {
      // Backend chưa có CompanyController -> fallback sang mock adapter
      return mockCompanyService.updateCompany(companyId, updateData);
    }
  }
};
