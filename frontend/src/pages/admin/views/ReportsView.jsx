import { useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Badge,
  Form
} from "react-bootstrap";
import ReportDetailModal from "../components/ReportDetailModal";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function ReportsView({
  reports = [],
  setReports
}) {
  const { showToast } = useToast();

  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [severeOnly, setSevereOnly] = useState(false);

  const visible = reports.filter(
    (report) =>
      (status === "all" || report.status === status) &&
      (
        !severeOnly ||
        (
          report.severity === "Nghiêm trọng" &&
          report.status !== "Đã xử lý"
        )
      ) &&
      [
        report.id,
        report.subject,
        report.target,
        report.reporter
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase())
  );

  const resolve = (id, action, note) => {
    const current = mockStore
      .getReports()
      .find((report) => report.id === id);

    if (!current || current.status === "Đã xử lý") {
      throw new Error(
        "Báo cáo đã xử lý hoặc không còn tồn tại."
      );
    }

    if (!note.trim()) {
      throw new Error("Vui lòng nhập ghi chú.");
    }

    if (!["record", "dismiss", "close_job"].includes(action)) {
      throw new Error("Hành động không hợp lệ.");
    }

    if (
      action === "close_job" &&
      !mockStore.getJobById(current.jobId)
    ) {
      throw new Error(
        "Không tìm thấy tin liên quan. Hãy kiểm tra lại mã tin."
      );
    }

    const labels = {
      record: "Đã ghi nhận kết quả đối soát",
      dismiss: "Đã bác bỏ báo cáo",
      close_job: "Đã đóng tin tuyển dụng liên quan"
    };

    mockStore.resolveReport(
      id,
      labels[action],
      action === "close_job" ? action : "",
      note
    );

    const saved = mockStore
      .getReports()
      .find((report) => report.id === id);

    if (saved?.status !== "Đã xử lý" || saved?.note !== note) {
      throw new Error(
        "Chưa lưu được kết quả. Kiểm tra dung lượng trình duyệt."
      );
    }

    if (
      action === "close_job" &&
      mockStore.getJobById(current.jobId)?.status !== "Đã đóng"
    ) {
      throw new Error(
        "Báo cáo đã lưu nhưng chưa đóng được tin. Kiểm tra tại quản lý tin."
      );
    }

    setReports(mockStore.getReports());
    showToast(`Đã xử lý báo cáo ${id}`);
  };

  const metrics = [
    [
      "Vụ việc nghiêm trọng",
      reports.filter(
        (report) =>
          report.severity === "Nghiêm trọng" &&
          report.status !== "Đã xử lý"
      ).length,
      "danger"
    ],
    [
      "Đang trong tiến trình",
      reports.filter(
        (report) => report.status === "Đang xử lý"
      ).length,
      "warning"
    ],
    [
      "Đã xử lý dứt điểm",
      reports.filter(
        (report) => report.status === "Đã xử lý"
      ).length,
      "success"
    ]
  ];

  return (
    <Card
      className="matcha-card p-4 border-0 shadow-sm"
      data-aos="fade-up"
    >
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">
            Báo cáo vi phạm & Khiếu nại người dùng (
            {reports.length})
          </h5>

          <p className="text-muted small mb-0">
            Giám sát các hành vi vi phạm chính sách, thu phí trái
            phép hoặc lừa đảo
          </p>
        </div>

        <Button
          size="sm"
          variant={severeOnly ? "danger" : "outline-danger"}
          onClick={() => {
            setSevereOnly(!severeOnly);
            setStatus("all");
          }}
        >
          {severeOnly
            ? "Hiển thị mọi mức độ"
            : "Lọc vụ việc nghiêm trọng"}
        </Button>
      </div>

      <Row className="g-3 mb-4">
        {metrics.map(([label, count, tone]) => (
          <Col md={4} key={label}>
            <div
              className={`p-3 rounded border border-${tone} bg-${tone} bg-opacity-10`}
            >
              <span
                className={`small fw-semibold text-${tone}`}
              >
                {label}
              </span>
              <div className={`fs-3 fw-bold text-${tone}`}>
                {count}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {[
          ["all", "Tất cả"],
          ["Mới", "Mới phát sinh"],
          ["Đang xử lý", "Đang xử lý"],
          ["Đã xử lý", "Đã xử lý"]
        ].map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={
              status === key ? "danger" : "outline-secondary"
            }
            onClick={() => setStatus(key)}
          >
            {label}
          </Button>
        ))}

        <Form.Control
          type="search"
          aria-label="Tìm báo cáo"
          placeholder="Tìm mã, tiêu đề, đối tượng, người báo cáo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="table-responsive">
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              {[
                "Mã báo cáo",
                "Tiêu đề phản ánh",
                "Đối tượng bị báo cáo",
                "Người báo cáo",
                "Mức độ",
                "Thời gian",
                "Trạng thái",
                "Thao tác"
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!visible.length && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-4 text-muted"
                >
                  Không có vụ việc phù hợp.
                </td>
              </tr>
            )}

            {visible.map((report) => (
              <tr key={report.id}>
                <td>
                  <code>{report.id}</code>
                </td>

                <td>
                  <strong className="d-block">
                    {report.subject}
                  </strong>
                  <small className="text-muted">
                    {report.description}
                  </small>
                </td>

                <td>{report.target}</td>
                <td>{report.reporter}</td>

                <td>
                  <Badge
                    bg={
                      report.severity === "Nghiêm trọng"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {report.severity}
                  </Badge>
                </td>

                <td className="small">{report.age}</td>

                <td>
                  <Badge
                    bg={
                      report.status === "Đã xử lý"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {report.status}
                  </Badge>
                </td>

                <td>
                  <Button
                    size="sm"
                    variant={
                      report.status === "Đã xử lý"
                        ? "outline-secondary"
                        : "outline-danger"
                    }
                    onClick={() => setSelected(report)}
                  >
                    {report.status === "Đã xử lý"
                      ? "Xem hồ sơ"
                      : "Xử lý vi phạm"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <small className="text-muted mt-3">
        Hiển thị {visible.length}/{reports.length} báo cáo
      </small>

      <ReportDetailModal
        show={Boolean(selected)}
        report={
          reports.find(
            (report) => report.id === selected?.id
          ) || selected
        }
        onHide={() => setSelected(null)}
        onResolve={resolve}
      />
    </Card>
  );
}