import { mockJobService } from "./mock/mockJobService";
import { apiJobService } from "./api/apiJobService";

import { mockApplicationService } from "./mock/mockApplicationService";
import { apiApplicationService } from "./api/apiApplicationService";

import { mockCompanyService } from "./mock/mockCompanyService";
import { apiCompanyService } from "./api/apiCompanyService";

import { mockAdminService } from "./mock/mockAdminService";
import { apiAdminService } from "./api/apiAdminService";

import { mockStatisticsService } from "./mock/mockStatisticsService";
import { apiStatisticsService } from "./api/apiStatisticsService";

import { mockInterviewService } from "./mock/mockInterviewService";
import { apiInterviewService } from "./api/apiInterviewService";

const dataSource = (import.meta.env.VITE_DATA_SOURCE || "mock").toLowerCase();
const isApiMode = dataSource === "api";

if (typeof window !== "undefined") {
  console.info(`[MatchaJob ServiceFactory] Chế độ nguồn dữ liệu: %c${isApiMode ? "REAL API (Spring Boot)" : "MOCK FIXTURES (Offline)"}`, "font-weight: bold; color: #2d8653;");
}

export const jobService = isApiMode ? apiJobService : mockJobService;
export const applicationService = isApiMode ? apiApplicationService : mockApplicationService;
export const companyService = isApiMode ? apiCompanyService : mockCompanyService;
export const adminService = isApiMode ? apiAdminService : mockAdminService;
export const statisticsService = isApiMode ? apiStatisticsService : mockStatisticsService;
export const interviewService = isApiMode ? apiInterviewService : mockInterviewService;

export function getDataSourceMode() {
  return isApiMode ? "api" : "mock";
}
