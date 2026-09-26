import { useState, useEffect } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import InputGroup from "react-bootstrap/InputGroup";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function CompanyView({ companyData, onCompanyUpdated }) {
  const { showToast } = useToast();

  const [name, setName] = useState(companyData?.name || "FPT Digital Talent");
  const [industry, setIndustry] = useState(companyData?.industry || "Công nghệ & Sản phẩm số");
  const [size, setSize] = useState(companyData?.size || "500+ nhân sự");
  const [location, setLocation] = useState(companyData?.location || "TP. Hồ Chí Minh");
  const [address, setAddress] = useState(companyData?.address || "Tòa nhà FPT Tân Thuận, Đường số 8, KCX Tân Thuận, Quận 7, TP.HCM");
  const [website, setWebsite] = useState(companyData?.website || "fptsoftware.com");
  const [email, setEmail] = useState(companyData?.email || "talent@fpt.com");
  const [phone, setPhone] = useState(companyData?.phone || "028 7300 7373");
  const [taxCode, setTaxCode] = useState(companyData?.taxCode || "0101248141");
  const [about, setAbout] = useState(
    companyData?.about || "Đội ngũ công nghệ phát triển các sản phẩm số có tác động tích cực đến hàng triệu người dùng. Môi trường làm việc năng động, tôn trọng sáng tạo và khuyến khích học hỏi liên tục."
  );

  const [perks, setPerks] = useState(companyData?.perks || [
    "Làm việc Hybrid linh hoạt (2 ngày remote/tuần)",
    "Bảo hiểm sức khỏe FPT Care toàn diện cho bản thân & gia đình",
    "Ngân sách tài trợ học tập & chứng chỉ quốc tế định kỳ",
    "Thưởng hiệu suất kinh doanh & Lương tháng 13",
    "Teambuilding hàng quý, du lịch nghỉ dưỡng hàng năm"
  ]);

  const [newPerk, setNewPerk] = useState("");

  useEffect(() => {
    if (companyData) {
      setName(companyData.name);
      setIndustry(companyData.industry);
      setSize(companyData.size);
      setLocation(companyData.location);
      setAddress(companyData.address || address);
      setWebsite(companyData.website);
      setEmail(companyData.email || email);
      setPhone(companyData.phone || phone);
      setTaxCode(companyData.taxCode || taxCode);
      if (companyData.about) setAbout(companyData.about);
      if (companyData.perks) setPerks(companyData.perks);
    }
  }, [companyData]);

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

  const handleSave = (e) => {
    if (e) e.preventDefault();
    const updated = {
      id: companyData?.id || "COMP-01",
      name,
      shortName: name.split(" ")[0] || "FPT",
      industry,
      size,
      location,
      address,
      website,
      email,
      phone,
      taxCode,
      about,
      perks,
      verified: companyData?.verified ?? true
    };

    mockStore.saveCompany(updated);
    if (onCompanyUpdated) onCompanyUpdated(updated);
    showToast("Đã lưu thông tin hồ sơ doanh nghiệp thành công!");
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Hồ sơ Doanh nghiệp (Employer Branding)</h5>
          <p className="text-muted small mb-0">Xây dựng hình ảnh tuyển dụng uy tín và thu hút nhân tài hàng đầu</p>
        </div>
        <Button variant="success" size="sm" className="fw-bold" onClick={handleSave}>
          <i className="bi bi-check2 me-1"></i>Lưu thay đổi
        </Button>
      </div>

      <Row className="g-4">
        {/* Left: Edit Form */}
        <Col lg={7}>
          <Card className="matcha-card border-0 shadow-sm overflow-hidden mb-4">
            {/* Banner Cover with Avatar */}
            <div className="company-banner d-flex align-items-end justify-content-end p-3 position-relative" style={{ minHeight: "130px", background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}>
              <Button
                variant="light"
                size="sm"
                className="shadow-sm"
                onClick={() => showToast("Đã cập nhật ảnh bìa doanh nghiệp demo")}
              >
                <i className="bi bi-camera me-1"></i>Đổi ảnh bìa
              </Button>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow position-absolute start-0 bottom-0 ms-4 translate-middle-y"
                style={{ width: "68px", height: "68px", backgroundColor: "#0f172a", fontSize: "1.5rem", border: "3px solid #fff" }}
              >
                {name.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="p-4" style={{ paddingTop: "36px" }}>
              <Form onSubmit={handleSave}>
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Label className="small fw-semibold">Tên doanh nghiệp / Pháp nhân</Form.Label>
                    <Form.Control
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Lĩnh vực hoạt động</Form.Label>
                    <Form.Control
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Quy mô nhân sự</Form.Label>
                    <Form.Select value={size} onChange={(e) => setSize(e.target.value)}>
                      <option value="Dưới 50 nhân sự">Dưới 50 nhân sự</option>
                      <option value="50 - 150 nhân sự">50 - 150 nhân sự</option>
                      <option value="150 - 500 nhân sự">150 - 500 nhân sự</option>
                      <option value="500+ nhân sự">500+ nhân sự</option>
                      <option value="1000+ nhân sự">1000+ nhân sự</option>
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
                    <Form.Label className="small fw-semibold">Mã số thuế doanh nghiệp</Form.Label>
                    <Form.Control
                      type="text"
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                    />
                  </Col>

                  <Col md={12}>
                    <Form.Label className="small fw-semibold">Địa chỉ trụ sở cụ thể</Form.Label>
                    <Form.Control
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label className="small fw-semibold">Website</Form.Label>
                    <Form.Control
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label className="small fw-semibold">Email tuyển dụng</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label className="small fw-semibold">Hotline HR</Form.Label>
                    <Form.Control
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Col>

                  <Col md={12}>
                    <Form.Label className="small fw-semibold">Giới thiệu tổng quan về công ty & văn hóa</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
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
                <div key={idx} className="p-2 px-3 rounded bg-surface-2 border d-flex justify-content-between align-items-center small">
                  <span><i className="bi bi-check-circle-fill text-success me-2"></i>{p}</span>
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
                className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                style={{ width: "48px", height: "48px", backgroundColor: "var(--primary)" }}
              >
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="fw-bold text-truncate">{name}</div>
                <div className="small text-muted text-truncate">{industry} · {location}</div>
                <Badge bg="success" className="bg-opacity-10 text-success border mt-1">
                  <i className="bi bi-patch-check-fill me-1"></i>Doanh nghiệp đã xác minh
                </Badge>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
