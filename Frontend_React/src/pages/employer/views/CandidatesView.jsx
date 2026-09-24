import { useState } from "react";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { useToast } from "../../../context/ToastContext";

export default function CandidatesView({ candidates, onOpenCandidate, onInviteCandidate }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState("all");

  const filteredCandidates = candidates.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchRole = roleFilter === "all" ? true : c.role.includes(roleFilter);

    const matchScore =
      matchFilter === "all"
        ? true
        : matchFilter === "90"
        ? c.match >= 90
        : c.match >= 80 && c.match < 90;

    return matchSearch && matchRole && matchScore;
  });

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Kho hồ sơ ứng viên nổi bật</h5>
          <p className="text-muted small mb-0">Hồ sơ ứng viên được sàng lọc và xếp hạng theo tiêu chuẩn tuyển dụng</p>
        </div>
        <Button variant="outline-success" size="sm" onClick={() => showToast("Đã tải xuống danh sách ứng viên (.CSV)")}>
          <i className="bi bi-file-earmark-spreadsheet me-1"></i>Xuất danh sách
        </Button>
      </div>

      {/* Filter Strip */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        <div className="flex-grow-1" style={{ minWidth: 240 }}>
          <InputGroup size="sm">
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Tìm theo tên ứng viên, vị trí hoặc kỹ năng (Figma, React...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        <div style={{ width: 180 }}>
          <Form.Select size="sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Tất cả vị trí</option>
            <option value="Designer">Product Designer</option>
            <option value="Frontend">Frontend Engineer</option>
            <option value="Data">Data Analyst</option>
            <option value="Talent">Talent Acquisition</option>
          </Form.Select>
        </div>

        <div style={{ width: 160 }}>
          <Form.Select size="sm" value={matchFilter} onChange={(e) => setMatchFilter(e.target.value)}>
            <option value="all">Mức phù hợp</option>
            <option value="90">Trên 90% (Rất cao)</option>
            <option value="80">Từ 80% - 90%</option>
          </Form.Select>
        </div>
      </div>

      {/* Candidate Grid */}
      <Row className="g-3">
        {filteredCandidates.length === 0 ? (
          <Col xs={12}>
            <div className="text-center py-5 text-muted">
              <i className="bi bi-person-x fs-1 d-block mb-2"></i>
              Không tìm thấy ứng viên nào phù hợp với điều kiện tìm kiếm.
            </div>
          </Col>
        ) : (
          filteredCandidates.map((c) => (
            <Col md={6} lg={4} key={c.id}>
              <Card className="p-3 border shadow-sm h-100 bg-surface d-flex flex-column">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
                    style={{ width: "46px", height: "46px", backgroundColor: "var(--primary)" }}
                  >
                    {c.initials}
                  </div>
                  <div className="overflow-hidden">
                    <h6 className="fw-bold mb-0 text-truncate">{c.name}</h6>
                    <div className="text-muted small text-truncate">{c.role}</div>
                  </div>
                </div>

                <div className="small text-muted mb-2">
                  <i className="bi bi-geo-alt me-1 text-danger"></i>{c.location} · <i className="bi bi-briefcase me-1"></i>{c.experience}
                </div>

                <div className="d-flex flex-wrap gap-1 mb-3">
                  {c.skills.map((s) => (
                    <Badge bg="secondary" className="bg-opacity-10 text-body" key={s}>
                      {s}
                    </Badge>
                  ))}
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                  <span className="text-success fw-bold small">
                    <i className="bi bi-stars me-1"></i>{c.match}% Phù hợp
                  </span>
                  <div className="d-flex gap-1">
                    <Button variant="outline-secondary" size="sm" onClick={() => onOpenCandidate(c)}>
                      Hồ sơ
                    </Button>
                    <Button variant="outline-success" size="sm" onClick={() => onInviteCandidate(c)}>
                      Mời
                    </Button>
                  </div>
                </div>
              </Card>
            </Col>
          ))
        )}
      </Row>
    </Card>
  );
}
