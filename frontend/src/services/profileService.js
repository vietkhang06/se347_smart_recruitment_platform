// Public facade cho hồ sơ và CV. candidateWorkspace là implementation demo.
export { getProfile, saveProfile, uploadCV, downloadCV } from "./candidateWorkspace";

import { httpClient } from "./httpClient";
export const candidateProfileService = {
  load: options => httpClient.get("/v1/candidates/profile", options),
  async save(profile) {
    const payload = {};
    for (const key of ["headline", "bio", "education", "location", "address"]) payload[key] = String(profile[key] || "").trim();
    if (profile.experience_years !== "" && profile.experience_years != null) {
      const years = Number(profile.experience_years);
      if (!Number.isInteger(years) || years < 0 || years > 60) throw new Error("Số năm kinh nghiệm phải là số nguyên từ 0 đến 60.");
      payload.experience_years = years;
    }
    return httpClient.patch("/v1/candidates/profile", payload);
  }
};