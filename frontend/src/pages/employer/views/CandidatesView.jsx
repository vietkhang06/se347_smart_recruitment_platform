import { useState } from "react";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { useToast } from "../../../context/ToastContext";
import { STAGES_PIPELINE } from "../../../mock";

export function candidateScore(candidate) {
  const raw = candidate.matchScore ?? candidate.match;
  return raw != null && String(raw).trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
}

export function candidateClosed(candidate) {
  return Boolean(candidate.withdrawnAt) || /đã rút|từ chối|không phù hợp/i.test(candidate.stage || "");
}

export function exportCandidatesCSV(candidates) {
  const cell = value => {
    let text = String(value ?? "");
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [
    ["Mã hồ sơ", "Họ tên", "Vị trí", "Email", "Điện thoại", "Giai đoạn", "Điểm phù hợp"],
    ...candidates.map(c => [c.id, c.name || c.candidateName, c.appliedJobTitle || c.role || c.candidateRole, c.email || c.candidateEmail, c.phone || c.candidatePhone, c.stage || "Mới", candidateScore(c)])
  ];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "matchajob-candidates.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Helper xác định màu sắc riêng biệt cho từng trạng thái ứng viên
const getCandidateStageBadge = (stage) => {
  switch (stage) {
    case "Mới":
      return { className: "status-badge-info", label: "Mới" };
    case "Sàng lọc":
      return { className: "status-badge-purple", label: "Sàng lọc" };
    case "Bài kiểm tra":
      return { className: "status-badge-warning", label: "Bài kiểm tra" };
    case "Phỏng vấn":
      return { className: "status-badge-primary", label: "Phỏng vấn" };
    case "Đề nghị":
      return { className: "status-badge-success", label: "Đề nghị" };
    case "Đã từ chối":
    case "Từ chối":
    case "Không phù hợp":
      return { className: "status-badge-danger", label: stage };
    default:
      return { className: "status-badge-secondary", label: stage || "Mới" };
  }
};

export default function CandidatesView({ candidates = [], onOpenCandidate, onInviteCandidate }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState("all");

  const jobOptions = Array.from(
    new Set(candidates.map((c) => c.appliedJobTitle || c.role || c.candidateRole))
  ).filter(Boolean);

  const filteredCandidates = candidates.filter((c) => {
    const name = (c.candidateName || c.name || "").toLowerCase();
    const role = (c.appliedJobTitle || c.candidateRole || c.role || "").toLowerCase();
    const skills = Array.isArray(c.skills) ? c.skills : [];
    const searchLower = (search || "").toLowerCase().trim();

    const matchSearch =
      !searchLower ||
      name.includes(searchLower) ||
      role.includes(searchLower) ||
      skills.some((s) => String(s || "").toLowerCase().includes(searchLower));

    const candidateJob = c.appliedJobTitle || c.role || c.candidateRole || "";
    const matchJob = jobFilter === "all" ? true : candidateJob === jobFilter;
    const matchStage = stageFilter === "all" ? true : (c.stage || "Mới") === stageFilter;

    const score = candidateScore(c);
    const matchScore =
      matchFilter === "all"
        ? true
        : matchFilter === "90"
        ? score !== null && score >= 90
        : score !== null && score >= 80 && score < 90;

    return matchSearch && matchJob && matchStage && matchScore;
  });

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Kho hồ sơ ứng viên nổi bật ({candidates.length})</h5>
          <p className="text-muted small mb-0">Hồ sơ ứng viên được sàng lọc và xếp hạng theo tiêu chuẩn tuyển dụng</p>
        </div>
        <Button variant="outline-success" size="sm" disabled={!filteredCandidates.length} onClick={() => {
          try { exportCandidatesCSV(filteredCandidates); showToast("Đã tạo tệp CSV theo bộ lọc."); }
          catch (err) { showToast(err?.message || "Không thể xuất danh sách.", "danger"); }
        }}>
          <i className="bi bi-file-earmark-spreadsheet me-1"></i>Xuất danh sách
        </Button>
      </div>

      {/* Filter Strip: Tinh chỉnh kích thước cân đối, tránh search quá dài và stage quá hẹp */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        {/* Thanh tìm kiếm: Cố định độ rộng tối đa 380px để không lấn át các bộ lọc */}
        <div style={{ flex: "1 1 260px", maxWidth: "380px" }}>
          <InputGroup size="sm">
            <InputGroup.Text style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--muted)" }}>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              placeholder="Tìm theo tên ứng viên, vị trí hoặc kỹ năng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </InputGroup>
        </div>

        {/* Lọc vị trí: linh hoạt theo màn hình */}
        <div className="filter-select-col">
          <Form.Select
            size="sm"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
          >
            <option value="all">Tất cả vị trí</option>
            {jobOptions.map((job) => (
              <option key={job} value={job}>{job}</option>
            ))}
          </Form.Select>
        </div>

        {/* Lọc giai đoạn: linh hoạt theo màn hình */}
        <div className="filter-select-col">
          <Form.Select
            size="sm"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">Tất cả giai đoạn</option>
            {Array.from(new Set([...STAGES_PIPELINE, "Đã rút", "Đã từ chối", ...candidates.map(c => c.stage).filter(Boolean)])).map((stg) => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </Form.Select>
        </div>

        {/* Lọc mức độ phù hợp: linh hoạt theo màn hình */}
        <div className="filter-select-col">
          <Form.Select
            size="sm"
            value={matchFilter}
            onChange={(e) => setMatchFilter(e.target.value)}
          >
            <option value="all">Mức phù hợp</option>
            <option value="90">Từ 90% (Rất cao)</option>
            <option value="80">Từ 80% đến dưới 90%</option>
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
          filteredCandidates.map((c) => {
            const stageBadge = getCandidateStageBadge(c.stage);
            return (
              <Col md={6} lg={4} key={c.id}>
                <Card className="p-3 border shadow-sm h-100 bg-surface d-flex flex-column">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
                        style={{ width: "42px", height: "42px", backgroundColor: "var(--primary)" }}
                      >
                        {c.initials || c.candidateInitials || "UV"}
                      </div>
                      <div className="overflow-hidden">
                        <h6 className="fw-bold mb-0 text-truncate">{c.name || c.candidateName || "Ứng viên"}</h6>
                        <div className="text-muted small text-truncate">{c.appliedJobTitle || c.role || c.candidateRole}</div>
                      </div>
                    </div>
                    {/* Badge trạng thái với màu sắc chuyên biệt cho 5 giai đoạn */}
                    <span className={`status-badge ${stageBadge.className}`}>
                      {stageBadge.label}
                    </span>
                  </div>

                  <div className="small text-muted mb-2">
                    <i className="bi bi-geo-alt me-1 text-danger"></i>{c.location || "Chưa cập nhật địa điểm"} · <i className="bi bi-briefcase me-1"></i>{c.experience || "Chưa cập nhật kinh nghiệm"}
                  </div>

                  {/* Hiển thị đầy đủ 5 kỹ năng của ứng viên - Kích thước vừa vặn tự nhiên, không bị kéo dãn */}
                  <div className="d-flex flex-wrap align-items-start gap-1 mb-3">
                    {(Array.isArray(c.skills) ? c.skills : []).map((s, index) => (
                      <span key={`${s}-${index}`} className="candidate-skill-badge">
                        {s}
                      </span>
                    ))}
                    {(!Array.isArray(c.skills) || !c.skills.length) && <span className="small text-muted">Chưa cập nhật kỹ năng</span>}
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                    {candidateScore(c) !== null ? <span className="text-success fw-bold small"><i className="bi bi-stars me-1" />{candidateScore(c)}% phù hợp</span> : <span className="text-muted small">Chưa có điểm phù hợp</span>}
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => onOpenCandidate(c)}>
                        Hồ sơ
                      </Button>
                      <Button variant="outline-success" size="sm" disabled={candidateClosed(c)} onClick={() => onInviteCandidate(c)}>
                        Mời
                      </Button>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })
        )}
      </Row>
    </Card>
  );
}