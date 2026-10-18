import { useState, useEffect } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import InputGroup from "react-bootstrap/InputGroup";
import Spinner from "react-bootstrap/Spinner";
import Modal from "react-bootstrap/Modal";
import { useToast } from "../../../context/ToastContext";
import { companyService } from "../../../services";

const BANNER_PRESETS = [
  {
    name: "Tòa nhà Công nghệ Hiện đại",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Không gian Sáng tạo & Co-working",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Campus Văn phòng Xanh",
    url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80"
  }
];

export default function CompanyView({ companyData, onCompanyUpdated }) {
  const { showToast } = useToast();

  const [name, setName] = useState(companyData?.name || "FPT Digital Talent");
  const [industry, setIndustry] = useState(companyData?.industry || "Công nghệ & Sản phẩm số");
  const [size, setSize] = useState(companyData?.size || "500-1000");
  const [location, setLocation] = useState(companyData?.location || "TP. Hồ Chí Minh");
  const [address, setAddress] = useState(
    companyData?.address || "Tòa nhà FPT Tân Thuận, Đường số 8, KCX Tân Thuận, Quận 7, TP.HCM"
  );
  const [website, setWebsite] = useState(companyData?.website || "https://fptsoftware.com");
  const [email, setEmail] = useState(companyData?.email || "talent@fpt.com");
  const [phone, setPhone] = useState(companyData?.phone || "028 7300 7373");
  const [taxCode, setTaxCode] = useState(companyData?.taxCode || "0101248141");
  const [about, setAbout] = useState(
    companyData?.about ||
      "Đội ngũ công nghệ phát triển các sản phẩm số có tác động tích cực đến hàng triệu người dùng. Môi trường làm việc năng động, tôn trọng sáng tạo và khuyến khích học hỏi liên tục."
  );

  const [logoUrl, setLogoUrl] = useState(companyData?.logoUrl || companyData?.logo || "");
  const [coverImageUrl, setCoverImageUrl] = useState(companyData?.coverImageUrl || companyData?.coverImage || "");

  const [perks, setPerks] = useState(
    companyData?.perks || [
      "Làm việc Hybrid linh hoạt (2 ngày remote/tuần)",
      "Bảo hiểm sức khỏe FPT Care toàn diện cho bản thân & gia đình",
      "Ngân sách tài trợ học tập & chứng chỉ quốc tế định kỳ",
      "Thưởng hiệu suất kinh doanh & Lương tháng 13",
      "Teambuilding hàng quý, du lịch nghỉ dưỡng hàng năm"
    ]
  );

  const [newPerk, setNewPerk] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [tempLogo, setTempLogo] = useState("");
  const [tempCover, setTempCover] = useState("");

  useEffect(() => {
    if (companyData) {
      if (companyData.name) setName(companyData.name);
      if (companyData.industry) setIndustry(companyData.industry);
      if (companyData.size) setSize(companyData.size);
      if (companyData.location) setLocation(companyData.location);
      if (companyData.address) setAddress(companyData.address);
      if (companyData.website) setWebsite(companyData.website);
      if (companyData.email) setEmail(companyData.email);
      if (companyData.phone) setPhone(companyData.phone);
      if (companyData.taxCode) setTaxCode(companyData.taxCode);
      if (companyData.about) setAbout(companyData.about);
      if (companyData.perks && companyData.perks.length > 0) setPerks(companyData.perks);
      if (companyData.logoUrl || companyData.logo) setLogoUrl(companyData.logoUrl || companyData.logo);
      if (companyData.coverImageUrl || companyData.coverImage) setCoverImageUrl(companyData.coverImageUrl || companyData.coverImage);
    }
  }, [companyData]);

  const handleOpenMediaModal = () => {
    setTempLogo(logoUrl);
    setTempCover(coverImageUrl);
    setShowMediaModal(true);
  };

  const handleSaveMedia = () => {
    setLogoUrl(tempLogo.trim());
    setCoverImageUrl(tempCover.trim());
    setShowMediaModal(false);
    showToast("Đã cập nhật ảnh thương hiệu. Vui lòng nhấn 'Lưu thay đổi' để hoàn tất lưu trữ!");
  };

  const handleAddPerk = (e) => {
    e.preventDefault();
    if (newPerk.trim() && !perks.includes(newPerk.trim())) {
      setPerks([...perks, newPerk.trim()]);
      setNewPerk("");
    }
  };

  const handleRemovePerk = (index) => {
    setPerks(perks.filter((_, i) => i !== index));
  };

  // Form Validation logic
  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Tên doanh nghiệp không được để trống";
    } else if (name.trim().length < 3) {
      newErrors.name = "Tên doanh nghiệp tối thiểu 3 ký tự";
    }

    if (!address.trim()) {
      newErrors.address = "Địa chỉ trụ sở không được để trống";
    }

    const cleanTax = taxCode.trim().replace(/\s/g, "");
    const taxRegex = /^(\d{10}|\d{13}|\d{10}-\d{3})$/;
    if (!cleanTax) {
      newErrors.taxCode = "Mã số thuế không được để trống";
    } else if (!taxRegex.test(cleanTax)) {
      newErrors.taxCode = "Mã số thuế phải gồm 10 hoặc 13 chữ số hợp lệ";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email liên hệ không được để trống";
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Định dạng email không hợp lệ";
    }

    if (phone.trim()) {
      const cleanPhone = phone.replace(/[\s\-\.\(\)]/g, "");
      if (!/^\d{8,12}$/.test(cleanPhone)) {
        newErrors.phone = "Số điện thoại phải từ 8 đến 12 số";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      showToast("Vui lòng kiểm tra lại các trường thông tin chưa hợp lệ", "danger");
      return;
    }

    setIsSaving(true);
    const companyId = companyData?.id || "COMP-01";
    const updated = {
      id: companyId,
      name: name.trim(),
      shortName: name.trim().split(" ")[0] || "FPT",
      industry: industry.trim(),
      size,
      location: location.trim(),
      address: address.trim(),
      website: website.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      taxCode: taxCode.trim(),
      about: about.trim(),
      logoUrl: logoUrl.trim(),
      logo: logoUrl.trim(),
      coverImageUrl: coverImageUrl.trim(),
      coverImage: coverImageUrl.trim(),
      perks,
      verified: companyData?.verified ?? true
    };

    try {
      const result = await companyService.updateCompany(companyId, updated);
      if (onCompanyUpdated) onCompanyUpdated(result || updated);
      showToast("Đã lưu thông tin hồ sơ doanh nghiệp thành công vào CSDL!");
    } catch (err) {
      showToast(err.message || "Không thể cập nhật hồ sơ doanh nghiệp.", "danger");
    } finally {
      setIsSaving(false);
    }
  };

  const hasCustomLogo = logoUrl && (logoUrl.startsWith("http") || logoUrl.startsWith("/") || logoUrl.startsWith("data:"));

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Hồ sơ Doanh nghiệp (Employer Branding)</h5>
          <p className="text-muted small mb-0">Xây dựng hình ảnh tuyển dụng uy tín và thu hút nhân tài hàng đầu</p>
        </div>
        <Button
          variant="success"
          size="sm"
          className="fw-bold d-inline-flex align-items-center gap-1 shadow-sm px-3"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? (
            <>
              <Spinner animation="border" size="sm" />
              <span>Đang lưu vào CSDL...</span>
            </>
          ) : (
            <>
              <i className="bi bi-check2"></i>
              <span>Lưu thay đổi</span>
            </>
          )}
        </Button>
      </div>

      <Row className="g-4">
        {/* Left: Edit Form */}
        <Col lg={7}>
          <Card className="matcha-card border-0 shadow-sm overflow-hidden mb-4">
            {/* Banner Cover with Avatar */}
            <div
              className="company-banner d-flex align-items-end justify-content-end p-3 position-relative"
              style={{
                minHeight: "150px",
                backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderBottom: "1px solid var(--border)"
              }}
            >
              <Button
                variant="light"
                size="sm"
                className="shadow-sm bg-white text-dark fw-semibold"
                onClick={handleOpenMediaModal}
              >
                <i className="bi bi-camera me-1"></i>Đổi ảnh bìa & Logo
              </Button>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow position-absolute start-0 bottom-0 ms-4 translate-middle-y overflow-hidden"
                style={{
                  width: "72px",
                  height: "72px",
                  backgroundColor: "#0f172a",
                  fontSize: "1.5rem",
                  border: "3px solid #fff",
                  cursor: "pointer"
                }}
                onClick={handleOpenMediaModal}
                title="Nhấn để đổi Logo"
              >
                {hasCustomLogo ? (
                  <img src={logoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (name || "CP").slice(0, 2).toUpperCase()
                )}
              </div>
            </div>

            <div className="p-4" style={{ paddingTop: "38px" }}>
              <Form onSubmit={handleSave}>
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Label className="small fw-semibold">
                      Tên doanh nghiệp / Pháp nhân <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={name}
                      isInvalid={Boolean(errors.name)}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors({ ...errors, name: null });
                      }}
                      placeholder="Ví dụ: Công ty Cổ phần FPT Digital"
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.name}
                    </Form.Control.Feedback>
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Lĩnh vực hoạt động</Form.Label>
                    <Form.Control
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="Ví dụ: Công nghệ thông tin"
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Quy mô nhân sự</Form.Label>
                    <Form.Select value={size} onChange={(e) => setSize(e.target.value)}>
                      <option value="1-49">Dưới 50 nhân sự (1-49)</option>
                      <option value="50-150">50 - 150 nhân sự</option>
                      <option value="150-500">150 - 500 nhân sự</option>
                      <option value="500-1000">500 - 1.000 nhân sự</option>
                      <option value="1000+">1.000+ nhân sự</option>
                    </Form.Select>
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Thành phố chính</Form.Label>
                    <Form.Control
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">
                      Mã số thuế doanh nghiệp <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={taxCode}
                      isInvalid={Boolean(errors.taxCode)}
                      onChange={(e) => {
                        setTaxCode(e.target.value);
                        if (errors.taxCode) setErrors({ ...errors, taxCode: null });
                      }}
                      placeholder="10 hoặc 13 chữ số"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.taxCode}
                    </Form.Control.Feedback>
                  </Col>

                  <Col md={12}>
                    <Form.Label className="small fw-semibold">
                      Địa chỉ trụ sở cụ thể <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={address}
                      isInvalid={Boolean(errors.address)}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (errors.address) setErrors({ ...errors, address: null });
                      }}
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.address}
                    </Form.Control.Feedback>
                  </Col>

                  <Col md={4}>
                    <Form.Label className="small fw-semibold">Website</Form.Label>
                    <Form.Control
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://company.com"
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label className="small fw-semibold">
                      Email tuyển dụng <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      isInvalid={Boolean(errors.email)}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: null });
                      }}
                      placeholder="hr@company.com"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </Col>

                  <Col md={4}>
                    <Form.Label className="small fw-semibold">Hotline HR</Form.Label>
                    <Form.Control
                      type="text"
                      value={phone}
                      isInvalid={Boolean(errors.phone)}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) setErrors({ ...errors, phone: null });
                      }}
                      placeholder="028 1234 5678"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.phone}
                    </Form.Control.Feedback>
                  </Col>

                  <Col md={12}>
                    <Form.Label className="small fw-semibold">
                      Giới thiệu tổng quan về công ty & văn hóa
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="Mô tả tầm nhìn sứ mệnh, môi trường làm việc..."
                    />
                  </Col>
                </Row>
              </Form>
            </div>
          </Card>
        </Col>

        {/* Right: Company Perks & Live Preview card */}
        <Col lg={5}>
          {/* Perks Management */}
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
            <h6 className="fw-bold mb-3">Chế độ đãi ngộ & Phúc lợi nổi bật ({perks.length})</h6>
            <div className="d-flex flex-column gap-2 mb-3">
              {perks.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2 px-3 rounded bg-surface-2 border d-flex justify-content-between align-items-center small"
                >
                  <span>
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    {p}
                  </span>
                  <button
                    type="button"
                    className="btn btn-link text-danger p-0 border-0"
                    title="Xóa phúc lợi này"
                    onClick={() => handleRemovePerk(idx)}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              ))}
            </div>

            <Form onSubmit={handleAddPerk}>
              <InputGroup size="sm">
                <Form.Control
                  placeholder="Thêm phúc lợi mới (ví dụ: Bảo hiểm sức khỏe...)"
                  value={newPerk}
                  onChange={(e) => setNewPerk(e.target.value)}
                />
                <Button variant="success" type="submit">
                  Thêm
                </Button>
              </InputGroup>
            </Form>
          </Card>

          {/* Mini Live Preview Badge */}
          <Card className="matcha-card p-3 border-0 shadow-sm">
            <h6 className="fw-bold mb-2 small text-muted">Hiển thị trực tiếp trên trang Việc làm</h6>
            <div className="d-flex align-items-center gap-3 p-3 rounded bg-surface border">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold shadow-sm overflow-hidden flex-shrink-0"
                style={{ width: "48px", height: "48px", backgroundColor: "var(--primary)" }}
              >
                {hasCustomLogo ? (
                  <img src={logoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (name || "CP").slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="overflow-hidden">
                <div className="fw-bold text-truncate">{name}</div>
                <div className="small text-muted text-truncate">
                  {industry} · {location}
                </div>
                <Badge bg="success" className="bg-opacity-10 text-success border mt-1">
                  <i className="bi bi-patch-check-fill me-1"></i>Doanh nghiệp đã xác minh
                </Badge>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Modal chỉnh sửa Ảnh bìa & Logo */}
      <Modal show={showMediaModal} onHide={() => setShowMediaModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold mb-0">
            <i className="bi bi-palette me-2 text-success"></i>Tùy chỉnh Ảnh bìa & Logo Doanh nghiệp
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <Form.Label className="fw-semibold small">Logo Công ty (URL hình ảnh)</Form.Label>
            <Form.Control
              type="text"
              placeholder="https://example.com/logo.png"
              value={tempLogo}
              onChange={(e) => setTempLogo(e.target.value)}
            />
            <small className="text-muted">Nhập đường dẫn trực tiếp tới file ảnh logo (PNG, JPG, SVG, WebP).</small>
          </div>

          <div className="mb-4">
            <Form.Label className="fw-semibold small">Ảnh bìa Banner (URL hình ảnh)</Form.Label>
            <Form.Control
              type="text"
              placeholder="https://example.com/cover.jpg"
              value={tempCover}
              onChange={(e) => setTempCover(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="fw-semibold small text-muted text-uppercase mb-2">Hoặc chọn nhanh ảnh mẫu chất lượng cao</label>
            <Row className="g-2">
              {BANNER_PRESETS.map((preset, idx) => (
                <Col md={4} key={idx}>
                  <div
                    className={`border rounded p-2 text-center cursor-pointer ${tempCover === preset.url ? "border-success bg-success bg-opacity-10" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setTempCover(preset.url)}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="rounded mb-2 w-100"
                      style={{ height: "70px", objectFit: "cover" }}
                    />
                    <div className="small fw-semibold text-truncate">{preset.name}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={() => setShowMediaModal(false)}>
            Hủy bỏ
          </Button>
          <Button variant="success" size="sm" onClick={handleSaveMedia}>
            Áp dụng hình ảnh
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
