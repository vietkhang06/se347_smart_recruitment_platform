import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { useToast } from "../../../context/ToastContext";

export default function JobsView({ jobs, setJobs, onOpenComposer }) {
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = jobs.filter((j) => {
    const matchStatus = filterStatus === "all" ? true : j.status === filterStatus;
    const matchQuery =
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

  const toggleJobStatus = (id) => {
    setJobs(
      jobs.map((j) => {
        if (j.id === id) {
          const nextStatus = j.status === "Đang tuyển" ? "Tạm dừng" : "Đang tuyển";
          showToast(`Đã chuyển trạng thái tin ${j.title} sang: ${nextStatus}`);
          return { ...j, status: nextStatus };
        }
        return j;
      })
    );
  };

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
        <div>
          <h5 className="fw-bold mb-0">Quản lý tin tuyển dụng</h5>
          <p className="text-muted small mb-0">Theo dõi toàn bộ các vị trí đã đăng, hiệu suất tiếp cận và trạng thái</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={() => showToast("Đã xuất danh sách tin tuyển dụng (.CSV)")}>
            <i className="bi bi-download me-1"></i>Xuất danh sách
          </Button>
          <Button variant="success" size="sm" className="fw-bold" onClick={onOpenComposer}>
            <i className="bi bi-plus-lg me-1"></i>Tạo tin mới
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div className="btn-group btn-group-sm">
          {[
            { key: "all", label: `Tất cả (${jobs.length})` },
            { key: "Đang tuyển", label: "Đang tuyển" },
            { key: "Chờ duyệt", label: "Chờ duyệt" },
            { key: "Tạm dừng", label: "Tạm dừng" },
            { key: "Đã đóng", label: "Đã đóng" }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`btn ${filterStatus === item.key ? "btn-success" : "btn-outline-secondary"}`}
              onClick={() => setFilterStatus(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: 300, width: "100%" }}>
          <InputGroup size="sm">
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Tìm theo vị trí, mã tin hoặc địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      {/* Table of Jobs */}
      <div className="table-responsive">
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Mã tin</th>
              <th>Vị trí tuyển dụng</th>
              <th>Phòng ban</th>
              <th>Địa điểm</th>
              <th>Ứng viên / Lượt xem</th>
              <th>Ngày đăng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-muted">
                  Không tìm thấy tin tuyển dụng nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredJobs.map((j) => (
                <tr key={j.id}>
                  <td><code>{j.id}</code></td>
                  <td>
                    <strong className="d-block text-body">{j.title}</strong>
                    {j.salary && <span className="small text-success">{j.salary}</span>}
                  </td>
                  <td>{j.team || "Engineering"}</td>
                  <td><i className="bi bi-geo-alt me-1 text-muted"></i>{j.location}</td>
                  <td>
                    <strong className="text-success">{j.applicants}</strong>
                    <span className="text-muted small"> / {j.views} views</span>
                  </td>
                  <td className="text-muted small">{j.posted}</td>
                  <td>
                    <Badge
                      bg={
                        j.status === "Đang tuyển"
                          ? "success"
                          : j.status === "Chờ duyệt"
                          ? "warning"
                          : j.status === "Tạm dừng"
                          ? "secondary"
                          : "danger"
                      }
                    >
                      {j.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        title="Sao chép link tin tuyển dụng"
                        onClick={() => showToast(`Đã sao chép liên kết chia sẻ cho ${j.title}`)}
                      >
                        <i className="bi bi-link-45deg"></i>
                      </Button>
                      <Button
                        variant={j.status === "Đang tuyển" ? "outline-warning" : "outline-success"}
                        size="sm"
                        title={j.status === "Đang tuyển" ? "Tạm dừng tin" : "Mở lại tin"}
                        onClick={() => toggleJobStatus(j.id)}
                      >
                        <i className={`bi ${j.status === "Đang tuyển" ? "bi-pause-fill" : "bi-play-fill"}`}></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
