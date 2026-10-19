import { useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";
import Badge from "react-bootstrap/Badge";
import { storage } from "../../services/storage";
import { useToast } from "../../context/ToastContext";

export default function ProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(() => storage.getCandidateProfile());
  const [showCVScore, setShowCVScore] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    storage.setCandidateProfile(profile);
    showToast("Hồ sơ năng lực đã được cập nhật thành công!");
  };

  const handleCheckCV = () => {
    setShowCVScore(true);
    showToast("Hệ thống AI đã phân tích xong hồ sơ của bạn!");
  };

  return (
    <Container className="py-5">
      {/* Hero Profile Header */}
      <Card className="matcha-card p-4 mb-4 border-0 shadow-sm" data-aos="fade-down">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white fs-3 shadow"
              style={{ width: "72px", height: "72px", backgroundColor: "var(--primary)" }}
            >
              AK
            </div>
            <div>
              <h2 className="fw-bold mb-1 fs-4">{profile.name}</h2>
              <div className="text-muted small mb-2">{profile.role} · {profile.location}</div>
              <div className="d-flex flex-wrap gap-2">
                <Badge bg="success" className="bg-opacity-10 text-success border">Figma</Badge>
                <Badge bg="success" className="bg-opacity-10 text-success border">Design System</Badge>
                <Badge bg="success" className="bg-opacity-10 text-success border">UX Research</Badge>
              </div>
            </div>
          </div>

          <div className="text-md-end">
            <div className="small text-muted mb-1">Mức độ hoàn thiện hồ sơ</div>
            <div className="d-flex align-items-center gap-2">
              <ProgressBar now={84} variant="success" style={{ width: "140px", height: "8px" }} />
              <span className="fw-bold text-success small">84%</span>
            </div>
          </div>
        </div>
      </Card>

      <Row className="g-4">
        {/* Left Form */}
        <Col lg={7}>
          <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
            <h5 className="fw-bold mb-3">Thông tin chuyên môn</h5>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Họ và tên</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.name} 
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })} 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Chức danh mong muốn</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.role} 
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })} 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Email liên hệ</Form.Label>
                    <Form.Control 
                      type="email" 
                      value={profile.email} 
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })} 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Số điện thoại</Form.Label>
                    <Form.Control 
                      type="tel" 
                      value={profile.phone} 
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })} 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Số năm kinh nghiệm</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.experience} 
                      onChange={(e) => setProfile({ ...profile, experience: e.target.value })} 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Khu vực sinh sống</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profile.location} 
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })} 
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Giới thiệu bản thân & Mục tiêu</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3} 
                      value={profile.bio} 
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })} 
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Button type="submit" variant="success" className="fw-medium">
                    Lưu thay đổi hồ sơ
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Right CV Review Card */}
        <Col lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4" data-aos="fade-left">
            <h5 className="fw-bold mb-3">Tệp CV của bạn</h5>
            <div className="border rounded p-3 text-center bg-surface-2 mb-3">
              <i className="bi bi-file-earmark-pdf fs-1 text-danger"></i>
              <div className="fw-bold mt-1">CV_NguyenAnKhang_2026.pdf</div>
              <div className="text-muted small">Cập nhật 2 ngày trước · 2.4 MB</div>
            </div>

            <div className="d-grid gap-2">
              <Button variant="outline-success" onClick={handleCheckCV}>
                <i className="bi bi-stars me-2"></i>Chấm điểm CV bằng AI
              </Button>
            </div>

            {/* AI CV Score Results */}
            {showCVScore && (
              <div className="mt-4 pt-3 border-top" data-aos="fade-up">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0">Kết quả đánh giá AI</h6>
                  <span className="badge bg-success fs-6">84 / 100</span>
                </div>

                <div className="mb-2">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Cấu trúc & Bố cục</span>
                    <strong className="text-body">92%</strong>
                  </div>
                  <ProgressBar now={92} variant="success" style={{ height: "6px" }} />
                </div>

                <div className="mb-2">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Mức độ phù hợp từ khóa IT</span>
                    <strong className="text-body">78%</strong>
                  </div>
                  <ProgressBar now={78} variant="warning" style={{ height: "6px" }} />
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Tính súc tích & Dễ đọc</span>
                    <strong className="text-body">88%</strong>
                  </div>
                  <ProgressBar now={88} variant="info" style={{ height: "6px" }} />
                </div>

                <div className="p-3 rounded bg-success bg-opacity-10 small text-success">
                  <i className="bi bi-lightbulb-fill me-1"></i>
                  <strong>Gợi ý cải thiện:</strong> Bổ sung thêm các số liệu định lượng (metrics) về mức độ tăng trưởng hoặc tối ưu thời gian trong các dự án gần đây.
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
