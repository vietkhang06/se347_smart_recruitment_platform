import { createDefaultCompany } from "../models/CompanyViewModel";

/**
 * Trích xuất 2 ký tự viết tắt từ tên công ty
 */
export function getCompanyInitials(name = "") {
  if (!name) return "MJ";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Chuyển đổi từ Backend Company DTO hoặc mock object sang CompanyViewModel
 */
export function toCompanyViewModel(dto) {
  if (!dto) return createDefaultCompany();

  const name = dto.name || "Doanh nghiệp MatchaJob";
  const shortName = dto.shortName || dto.short_name || name;
  const logo = dto.logo || dto.logoUrl || dto.logo_url || getCompanyInitials(shortName);

  let perks = [];
  if (Array.isArray(dto.perks)) {
    perks = dto.perks;
  } else if (typeof dto.perks === "string") {
    try {
      const parsed = JSON.parse(dto.perks);
      perks = Array.isArray(parsed) ? parsed : [dto.perks];
    } catch {
      perks = dto.perks.split(",").map((p) => p.trim()).filter(Boolean);
    }
  }

  const cover =
    dto.coverImage ||
    dto.coverImageUrl ||
    dto.cover_image_url ||
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80";

  return {
    id: String(dto.id || "COMP-01"),
    name,
    shortName,
    logo,
    logoUrl: logo,
    coverImage: cover,
    coverImageUrl: cover,
    industry: dto.industry || "Công nghệ thông tin",
    size: dto.size || "150-500 nhân sự",
    location: dto.location || "TP. Hồ Chí Minh",
    address: dto.address || "",
    website: dto.website || "",
    email: dto.email || "",
    phone: dto.phone || "",
    taxCode: dto.taxCode || dto.tax_code || "",
    established: String(dto.established || "2020"),
    verified: Boolean(dto.verified ?? (dto.status === "approved" || dto.is_verified)),
    about: dto.about || dto.description || "",
    perks: perks.length > 0 ? perks : createDefaultCompany().perks
  };
}

/**
 * Chuyển đổi từ CompanyViewModel sang payload cập nhật (PUT /api/v1/companies/{id})
 */
export function toCompanyUpdateRequest(vm) {
  return {
    name: vm.name,
    shortName: vm.shortName,
    logoUrl: vm.logoUrl || vm.logo || null,
    coverImageUrl: vm.coverImageUrl || vm.coverImage || null,
    industry: vm.industry,
    size: vm.size,
    location: vm.location,
    address: vm.address,
    website: vm.website,
    email: vm.email,
    phone: vm.phone,
    taxCode: vm.taxCode,
    about: vm.about || vm.description,
    description: vm.about || vm.description,
    perks: Array.isArray(vm.perks) ? vm.perks : []
  };
}
