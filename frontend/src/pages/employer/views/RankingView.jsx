import { useState, useEffect, useCallback } from "react";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import ProgressBar from "react-bootstrap/ProgressBar";
import { apiApplicationService } from "../../../services/api/apiApplicationService";
import { formatNumber, formatPercent } from "../../../utils/formatUtils";
import { useToast } from "../../../context/ToastContext";

export function exportRankingCSV(items, jobTitle = "vi-tri") {
  const cell = (val) => {
    let text = String(val ?? "");
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [
    ["Thứ hạng", "Mã hồ sơ", "Họ tên ứng viên", "Giai đoạn", "Điểm tổng thể (%)", "Điểm kỹ năng (%)", "Điểm kinh nghiệm (%)", "Lý do AI đánh giá", "Ngày nộp"],
    ...items.map((it) => [
      it.ranking,
      it.applicationId,
      it.candidateName,
      it.stage,
      it.overallScore,
      it.skillsScore,
      it.experienceScore,
      it.rationale,
      it.appliedDate
    ])
  ];
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8"
    })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `matchajob-ranking-${jobTitle.toLowerCase().replace(/\s+/g, "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const getMedalBadge = (ranking) => {
  if (ranking === 1) {
    return {
      icon: "bi-trophy-fill",
      className: "bg-warning text-dark border border-warning",
      label: "#1 Top Match"
    };
  }
  if (ranking === 2) {
    return {
      icon: "bi-award-fill",
      className: "bg-secondary bg-opacity-25 text-body border",
      label: "#2 Á quân"
    };
  }
  if (ranking === 3) {
    return {
      icon: "bi-award",
      className: "bg-danger bg-opacity-10 text-danger border border-danger-subtle",
      label: "#3 Top 3"
    };
  }
  return {
    icon: "bi-hash",
    className: "bg-light text-muted border",
    label: `#${ranking}`
  };
};

export default function RankingView({
  jobs = [],
  candidates = [],
  onOpenCandidate,
  onInviteCandidate
}) {
  const { showToast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState(() => (jobs.length > 0 ? String(jobs[0].id) : ""));
  const [rankingList, setRankingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [minScoreFilter, setMinScoreFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Sync selectedJobId khi danh sách jobs thay đổi
  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(String(jobs[0].id));
    }
  }, [jobs, selectedJobId]);

  const loadRanking = useCallback(async (jobId) => {
    if (!jobId) {
      setRankingList([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiApplicationService.getJobRanking(jobId);
      setRankingList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Không thể tải bảng xếp hạng AI cho vị trí này.");
      setRankingList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      loadRanking(selectedJobId);
    }
  }, [selectedJobId, loadRanking]);

  const currentJob = jobs.find((j) => String(j.id) === String(selectedJobId));

  // Lọc kết quả theo các tiêu chí giao diện
  const filteredRankings = rankingList.filter((item) => {
    const q = (search || "").toLowerCase().trim();
    const matchName = !q || (item.candidateName || "").toLowerCase().includes(q) || (item.rationale || "").toLowerCase().includes(q);
    const matchStage = stageFilter === "all" || item.stage === stageFilter || item.stageCode === stageFilter;
    const score = Number(item.overallScore || 0);
    const matchMinScore =
      minScoreFilter === "all"
        ? true
        : minScoreFilter === "85"
        ? score >= 85
        : minScoreFilter === "70"
        ? score >= 70
        : score >= 50;

    return matchName && matchStage && matchMinScore;
  });

  const handleOpenCandidateModal = (rankingItem) => {
    if (!onOpenCandidate) return;
    const fullCandidate = candidates.find(
      (c) =>
        String(c.id) === String(rankingItem.candidateId) ||
        String(c.applicationId) === String(rankingItem.applicationId) ||
        String(c.id) === String(rankingItem.applicationId)
    );
    onOpenCandidate(
      fullCandidate || {
        id: rankingItem.applicationId || rankingItem.candidateId,
        candidateName: rankingItem.candidateName,
        name: rankingItem.candidateName,
        stage: rankingItem.stage,
        appliedJobTitle: currentJob?.title || "Vị trí tuyển dụng",
        matchScore: rankingItem.overallScore,
        match: rankingItem.overallScore,
        skills: []
      }
    );
  };

  const handleInviteCandidateAction = (rankingItem) => {
    if (!onInviteCandidate) return;
    const fullCandidate = candidates.find(
      (c) =>
        String(c.id) === String(rankingItem.candidateId) ||
        String(c.applicationId) === String(rankingItem.applicationId) ||
        String(c.id) === String(rankingItem.applicationId)
    );
    onInviteCandidate(
      fullCandidate || {
        id: rankingItem.applicationId || rankingItem.candidateId,
        candidateName: rankingItem.candidateName,
        name: rankingItem.candidateName,
        stage: rankingItem.stage,
        appliedJobTitle: currentJob?.title || "Vị trí tuyển dụng",
        email: "ungvien@example.com"
      }
    );
  };

  return (
    <div data-aos="fade-up">
      {/* Header View */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h5 className="fw-bold mb-0">Bảng xếp hạng Ứng viên AI (AI Candidate Ranking)</h5>
            <Badge bg="success" className="bg-opacity-10 text-success border">
              <i className="bi bi-stars me-1" />
              Smart Matching v2
            </Badge>
          </div>
          <p className="text-muted small mb-0">
            Hệ thống tự động chấm điểm và xếp hạng ứng viên dựa trên độ tương thích giữa CV và bản mô tả công việc (JD).
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Button
            variant="outline-secondary"
            size="sm"
            disabled={loading || !filteredRankings.length}
            onClick={() => {
              try {
                exportRankingCSV(filteredRankings, currentJob?.title || "vi-tri");
                showToast("Đã xuất danh sách xếp hạng AI ra file CSV.");
              } catch (err) {
                showToast(err?.message || "Không thể xuất danh sách.", "danger");
              }
            }}
          >
            <i className="bi bi-download me-1" />
            Xuất kết quả
          </Button>

          <Button
            variant="outline-success"
            size="sm"
            disabled={loading || !selectedJobId}
            onClick={() => {
              loadRanking(selectedJobId);
              showToast("Đang làm mới bảng xếp hạng...");
            }}
          >
            <i className={`bi bi-arrow-clockwise me-1 ${loading ? "spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Control Strip: Chọn Job và Bộ lọc */}
      <Card className="matcha-card p-3 border-0 shadow-sm mb-4">
        <Row className="g-2 align-items-center">
          {/* Chọn Job */}
          <Col xs={12} md={4} lg={4}>
            <Form.Group>
              <Form.Label className="small text-muted fw-semibold mb-1">Vị trí tuyển dụng cần xếp hạng:</Form.Label>
              <Form.Select
                size="sm"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                disabled={loading || jobs.length === 0}
              >
                {jobs.length === 0 && <option value="">Không có tin tuyển dụng nào</option>}
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({job.department || "Toàn công ty"})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Tìm kiếm nhanh */}
          <Col xs={12} sm={6} md={3} lg={3}>
            <Form.Group>
              <Form.Label className="small text-muted fw-semibold mb-1">Tìm ứng viên:</Form.Label>
              <Form.Control
                size="sm"
                placeholder="Tên ứng viên hoặc từ khóa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Form.Group>
          </Col>

          {/* Lọc theo Giai đoạn */}
          <Col xs={6} sm={3} md={2} lg={2}>
            <Form.Group>
              <Form.Label className="small text-muted fw-semibold mb-1">Giai đoạn:</Form.Label>
              <Form.Select
                size="sm"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="all">Tất cả giai đoạn</option>
                <option value="Mới">Mới</option>
                <option value="Sàng lọc">Sàng lọc</option>
                <option value="Bài kiểm tra">Bài kiểm tra</option>
                <option value="Phỏng vấn">Phỏng vấn</option>
                <option value="Đề nghị">Đề nghị</option>
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Lọc theo Mức điểm AI */}
          <Col xs={6} sm={3} md={3} lg={3}>
            <Form.Group>
              <Form.Label className="small text-muted fw-semibold mb-1">Mức điểm phù hợp:</Form.Label>
              <Form.Select
                size="sm"
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(e.target.value)}
              >
                <option value="all">Tất cả mức điểm</option>
                <option value="85">Từ 85% (Rất phù hợp)</option>
                <option value="70">Từ 70% (Phù hợp)</option>
                <option value="50">Từ 50% (Cân nhắc)</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </Card>

      {/* Trạng thái Lỗi */}
      {error && (
        <Alert variant="danger" className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-octagon-fill fs-5" />
            <span>{error}</span>
          </div>
          <Button variant="outline-danger" size="sm" onClick={() => loadRanking(selectedJobId)}>
            Thử lại
          </Button>
        </Alert>
      )}

      {/* Trạng thái Loading Skeleton */}
      {loading && (
        <div className="py-5 text-center text-muted">
          <Spinner animation="border" variant="success" className="mb-3" />
          <div className="fw-semibold">Đang tổng hợp dữ liệu đối sánh AI...</div>
          <div className="small text-muted">Thuật toán đang phân tích kỹ năng và kinh nghiệm của từng ứng viên</div>
        </div>
      )}

      {/* Trạng thái Rỗng */}
      {!loading && !error && filteredRankings.length === 0 && (
        <Card className="matcha-card p-5 border-0 shadow-sm text-center">
          <div className="py-4">
            <i className="bi bi-people fs-1 text-muted opacity-50 d-block mb-3" />
            <h6 className="fw-bold mb-1">Chưa có ứng viên nào phù hợp</h6>
            <p className="text-muted small mb-3">
              {jobs.length === 0
                ? "Doanh nghiệp chưa có tin tuyển dụng nào đang hoạt động."
                : "Không tìm thấy hồ sơ ứng viên thỏa mãn bộ lọc hoặc vị trí này chưa có lượt nộp đơn."}
            </p>
            {(search || stageFilter !== "all" || minScoreFilter !== "all") && (
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStageFilter("all");
                  setMinScoreFilter("all");
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1" />
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Nội dung Bảng xếp hạng khi có dữ liệu */}
      {!loading && !error && filteredRankings.length > 0 && (
        <>
          {/* Top 3 Podium Highlights nếu có từ 2 ứng viên trở lên */}
          {filteredRankings.length >= 2 && !search && stageFilter === "all" && minScoreFilter === "all" && (
            <Row className="g-3 mb-4">
              {filteredRankings.slice(0, 3).map((item) => {
                const medal = getMedalBadge(item.ranking);
                return (
                  <Col md={4} key={item.applicationId || item.candidateId}>
                    <Card className="matcha-card p-3 border-0 shadow-sm h-100 position-relative overflow-hidden">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className={`badge ${medal.className} px-2 py-1`}>
                          <i className={`bi ${medal.icon} me-1`} />
                          {medal.label}
                        </span>
                        <div className="fs-4 fw-bold text-success">{formatPercent(item.overallScore)}</div>
                      </div>

                      <div className="d-flex align-items-center gap-2 mb-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
                          style={{ width: "38px", height: "38px", backgroundColor: "var(--primary)" }}
                        >
                          {item.candidateInitials || "UV"}
                        </div>
                        <div className="overflow-hidden">
                          <strong className="d-block text-truncate small">{item.candidateName}</strong>
                          <span className="badge bg-secondary bg-opacity-10 text-body" style={{ fontSize: "11px" }}>
                            {item.stage}
                          </span>
                        </div>
                      </div>

                      <p className="text-muted small mb-3 text-truncate-2" style={{ fontSize: "12px", minHeight: "36px" }}>
                        {item.rationale}
                      </p>

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                        <span className="small text-muted" style={{ fontSize: "11px" }}>
                          Kỹ năng: <strong>{formatPercent(item.skillsScore)}</strong>
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-success text-decoration-none fw-semibold"
                          onClick={() => handleOpenCandidateModal(item)}
                        >
                          Xem hồ sơ →
                        </Button>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}

          {/* Full Ranking List Card */}
          <Card className="matcha-card p-4 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">
                Toàn bộ danh sách xếp hạng ({formatNumber(filteredRankings.length)} ứng viên)
              </h6>
              <span className="text-muted small">Sắp xếp theo độ tương thích giảm dần</span>
            </div>

            <div className="d-flex flex-column gap-3">
              {filteredRankings.map((item) => {
                const medal = getMedalBadge(item.ranking);
                const scoreVariant = item.overallScore >= 85 ? "success" : item.overallScore >= 70 ? "info" : "warning";

                return (
                  <div
                    key={item.applicationId || item.candidateId}
                    className="p-3 rounded border bg-surface-2 transition-all hover-shadow"
                  >
                    <Row className="g-3 align-items-center">
                      {/* Thứ hạng & Avatar */}
                      <Col xs={12} sm={4} md={3} className="d-flex align-items-center gap-2">
                        <div
                          className={`rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm flex-shrink-0 ${medal.className}`}
                          style={{ width: "36px", height: "36px", fontSize: "13px" }}
                        >
                          #{item.ranking}
                        </div>
                        <div className="overflow-hidden">
                          <h6 className="fw-bold mb-0 text-truncate">{item.candidateName}</h6>
                          <span className="badge bg-secondary bg-opacity-25 text-body small mt-1">{item.stage}</span>
                        </div>
                      </Col>

                      {/* Điểm số & Thanh Progress bar */}
                      <Col xs={12} sm={5} md={4}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small text-muted">Độ phù hợp tổng thể:</span>
                          <span className="small fw-bold text-success">{formatPercent(item.overallScore)}</span>
                        </div>
                        <ProgressBar
                          now={item.overallScore}
                          variant={scoreVariant}
                          style={{ height: "6px" }}
                          className="mb-2"
                        />
                        <div className="d-flex justify-content-between text-muted" style={{ fontSize: "11px" }}>
                          <span>Kỹ năng: <strong className="text-body">{formatPercent(item.skillsScore)}</strong></span>
                          <span>Kinh nghiệm: <strong className="text-body">{formatPercent(item.experienceScore)}</strong></span>
                        </div>
                      </Col>

                      {/* Lý do AI đánh giá */}
                      <Col xs={12} sm={8} md={3}>
                        <div className="small text-muted p-2 rounded bg-surface border" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                          <i className="bi bi-robot me-1 text-success" />
                          {item.rationale || "Hồ sơ có các kỹ năng cốt lõi đáp ứng yêu cầu công việc."}
                        </div>
                      </Col>

                      {/* Thao tác nút bấm */}
                      <Col xs={12} sm={4} md={2} className="text-sm-end d-flex d-sm-block gap-2 justify-content-end">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="me-sm-1"
                          onClick={() => handleOpenCandidateModal(item)}
                        >
                          Hồ sơ
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleInviteCandidateAction(item)}
                        >
                          Mời
                        </Button>
                      </Col>
                    </Row>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

