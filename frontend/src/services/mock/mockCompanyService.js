import { COMPANIES_FIXTURE } from "../../fixtures/companies.fixture";
import { toCompanyViewModel } from "../../mappers/companyMapper";

const STORAGE_KEY = "matchajob_store_companies_v2";

function delay(ms = 60) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadCompanies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(COMPANIES_FIXTURE));
      return COMPANIES_FIXTURE;
    }
    return JSON.parse(raw);
  } catch {
    return COMPANIES_FIXTURE;
  }
}

function saveCompanies(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("matchajob:companies-changed", { detail: list }));
  } catch (err) {
    console.error("[mockCompanyService] Failed to persist companies", err);
  }
}

export const mockCompanyService = {
  async getCompany(companyId = "COMP-01") {
    await delay();
    const list = loadCompanies();
    const found = list.find((c) => String(c.id) === String(companyId)) || list[0];
    return toCompanyViewModel(found);
  },

  async updateCompany(companyId, updateData) {
    await delay();
    const list = loadCompanies();
    let updated = null;
    const nextList = list.map((c) => {
      if (String(c.id) === String(companyId)) {
        updated = { ...c, ...updateData };
        return updated;
      }
      return c;
    });
    if (updated) saveCompanies(nextList);
    return updated ? toCompanyViewModel(updated) : null;
  }
};
