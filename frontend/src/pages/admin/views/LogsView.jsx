import { useState } from "react";
import {
  Card,
  Button,
  Table,
  Form,
  Badge
} from "react-bootstrap";
import { useToast } from "../../../context/ToastContext";

export function exportAuditLogs(logs) {
  const cell = (value) => {
    let text = String(value ?? "");

    if (/^[\s]*[=+@-]/.test(text)) {
      text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  };

  const rows = [
    [
      "Thời gian",
      "Người thực hiện",
      "Hành động",
      "Đối tượng",
      "IP",
      "Trạng thái"
    ],
    ...logs.map((log) => [
      log.time || log.timestamp,
      log.actor,
      log.action,
      log.target,
      log.ip,
      ({ success: "Thành công", flagged: "Cảnh báo", failed: "Thất bại" })[log.status] || log.status || "Thành công"
    ])
  ];

  const content =
    "\uFEFF" +
    rows
      .map((row) => row.map(cell).join(","))
      .join("\r\n");

  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    `matchajob-audit-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function LogsView({ logs = [] }) {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);

  const actions = [
    ...new Set(
      logs.map((log) => String(log.action || ""))
    )
  ]
    .filter(Boolean)
    .sort();

  const filtered = logs.filter(
    (log) =>
      (action === "all" || log.action === action) &&
      [
        log.time || log.timestamp,
        log.actor,
        log.action,
        log.target,
        log.ip,
        log.status
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  );

  const pages = Math.max(
    1,
    Math.ceil(filtered.length / 15)
  );

  const current = Math.min(page, pages);

  const visible = filtered.slice(
    (current - 1) * 15,
    current * 15
  );

  return (
    <Card
      className="matcha-card p-4 border-0 shadow-sm"
      data-aos="fade-up"
    >
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">
            Nhật ký kiểm toán & An ninh ({logs.length} sự kiện)
          </h5>

          <p className="text-muted small mb-0">
            Theo dõi lịch sử tác động và thao tác quản trị
          </p>
        </div>

        <Button
          size="sm"
          variant="outline-dark"
          disabled={!filtered.length}
          onClick={() => {
            try {
              exportAuditLogs(filtered);
              showToast("Đã tạo tệp CSV theo bộ lọc.");
            } catch {
              showToast("Không thể tạo tệp CSV.");
            }
          }}
        >
          Xuất nhật ký (.CSV)
        </Button>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Form.Control
          style={{ flex: "1 1 260px" }}
          type="search"
          aria-label="Tìm nhật ký"
          placeholder="Tìm người thực hiện, hành động, đối tượng, IP…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <Form.Select
          style={{ flex: "1 1 220px" }}
          aria-label="Lọc hành động"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả hành động</option>

          {actions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Form.Select>
      </div>

      <div className="table-responsive">
        <Table hover className="matcha-table align-middle mb-0">
          <thead>
            <tr>
              {[
                "Thời gian",
                "Người thực hiện",
                "Hành động",
                "Đối tượng tác động",
                "Địa chỉ IP",
                "Trạng thái"
              ].map((label) => (
                <th className="text-start text-nowrap" key={label}>{label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!visible.length && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-4 text-muted"
                >
                  Không tìm thấy nhật ký phù hợp.
                </td>
              </tr>
            )}

            {visible.map((log, index) => (
              <tr key={`${current}-${index}`}>
                <td className="small text-nowrap">
                  {log.time || log.timestamp || "Chưa có thời gian"}
                </td>

                <td>{log.actor}</td>

                <td>
                  <Badge bg="secondary">{log.action}</Badge>
                </td>

                <td>{String(log.target ?? "")}</td>

                <td className="small font-monospace">
                  {log.ip}
                </td>

                <td>
                  <Badge
                    bg={
                      !log.status || ["success", "Thành công"].includes(log.status)
                        ? "success"
                        : ["failed", "Thất bại"].includes(log.status) ? "danger" : "warning"
                    }
                  >
                    {({ success: "Thành công", flagged: "Cảnh báo", failed: "Thất bại" })[log.status] || log.status || "Thành công"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
        <small className="text-muted">
          {filtered.length} kết quả · Trang {current}/{pages}
        </small>

        <div className="d-flex gap-2">
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            Trước
          </Button>

          <Button
            size="sm"
            variant="outline-secondary"
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
          >
            Sau
          </Button>
        </div>
      </div>
    </Card>
  );
}