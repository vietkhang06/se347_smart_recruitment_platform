import { useRef, useState, forwardRef } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Dropdown from "react-bootstrap/Dropdown";
import JobPreviewModal from "../components/JobPreviewModal";
import { useToast } from "../../../context/ToastContext";
import { jobService } from "../../../services";

const sameId = (a, b) => String(a) === String(b);

const CustomThreeDotsToggle = forwardRef(
  ({ onClick, disabled }, ref) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label="Thao tác với tin tuyển dụng"
      className="btn btn-sm border-0 rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
      style={{
        width: 32,
        height: 32,
        backgroundColor: "var(--surface-2)",
        color: "var(--text)"
      }}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      <i className="bi bi-three-dots-vertical" />
    </button>
  )
);

CustomThreeDotsToggle.displayName = "CustomThreeDotsToggle";

export default function JobsView({
  jobs = [],
  setJobs,
  onOpenComposer,
  onEditJob,
  onNavigateCandidates
}) {
  const { showToast } = useToast();

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const busyRef = useRef(false);

  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.trim().toLowerCase();

    return (
      (filterStatus === "all" || job.status === filterStatus) &&
      [
        job.title,
        job.id,
        job.location,
        job.department,
        job.team
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  });

  const isSelected = (id) =>
    selectedJobIds.some((item) => sameId(item, id));

  const isAllSelected =
    filteredJobs.length > 0 &&
    filteredJobs.every((job) => isSelected(job.id));

  const isPartiallySelected =
    !isAllSelected &&
    filteredJobs.some((job) => isSelected(job.id));

  const previewJob =
    jobs.find((job) => sameId(job.id, selectedJob?.id)) ||
    selectedJob;

  const changeFilter = (key, value) => {
    if (key === "status") {
      setFilterStatus(value);
    } else {
      setSearchQuery(value);
    }

    setSelectedJobIds([]);
  };

  const handleSelectAll = (event) => {
    setSelectedJobIds(
      event.target.checked
        ? filteredJobs.map((job) => job.id)
        : []
    );
  };

  const handleToggleSelectJob = (id) => {
    setSelectedJobIds((prev) =>
      prev.some((item) => sameId(item, id))
        ? prev.filter((item) => !sameId(item, id))
        : [...prev, id]
    );
  };

  const runAction = async (ids, action) => {
    if (busyRef.current || !ids.length) return false;

    busyRef.current = true;
    setBusy(true);

    const succeeded = [];
    const errors = [];

    try {
      for (const id of ids) {
        try {
          if (action === "delete") {
            const deleted = await jobService.deleteJob(id);

            if (deleted === false) {
              throw new Error("Không xóa được tin tuyển dụng.");
            }

            setJobs((prev) =>
              prev.filter((job) => !sameId(job.id, id))
            );

            setSelectedJob((prev) =>
              sameId(prev?.id, id) ? null : prev
            );
          } else {
            const current = await jobService.getJobById(id);

            if (!current) {
              throw new Error(
                "Tin tuyển dụng không còn tồn tại."
              );
            }

            let nextStatus = action;
            if (action === "toggle") {
              nextStatus = current.status === "Đang tuyển" ? "Tạm dừng" : "Đang tuyển";
            } else if (action === "publish" || action === "resume") {
              nextStatus = "Đang tuyển";
            } else if (action === "pause") {
              nextStatus = "Tạm dừng";
            } else if (action === "close") {
              nextStatus = "Đã đóng";
            }

            const updated =
              current.status === nextStatus
                ? current
                : await jobService.updateJobStatus(id, nextStatus);

            if (!updated || updated.status !== nextStatus) {
              throw new Error(
                "Không xác nhận được trạng thái mới của tin."
              );
            }

            setJobs((prev) =>
              prev.map((job) =>
                sameId(job.id, id)
                  ? { ...job, ...updated }
                  : job
              )
            );

            setSelectedJob((prev) =>
              sameId(prev?.id, id)
                ? { ...prev, ...updated }
                : prev
            );
          }

          succeeded.push(id);
        } catch (error) {
          errors.push(error?.message || "Thao tác thất bại.");
        }
      }

      setSelectedJobIds((prev) =>
        prev.filter(
          (id) => !succeeded.some((done) => sameId(done, id))
        )
      );

      if (errors.length) {
        if (succeeded.length === 0) {
          showToast(errors[0], "danger");
        } else {
          showToast(
            `Thành công ${succeeded.length}/${ids.length} tin. Lỗi: ${errors[0]}`,
            "warning"
          );
        }
      } else {
        const actionLabels = {
          delete: "xóa",
          publish: "đăng tuyển",
          resume: "mở lại",
          pause: "tạm dừng",
          close: "đóng"
        };
        const actionLabel = actionLabels[action] || "cập nhật trạng thái";
        showToast(`Đã ${actionLabel} ${succeeded.length} tin tuyển dụng.`);
      }

      return errors.length === 0;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const toggleJobStatus = (id) =>
    runAction([id], "toggle");

  const handleDeleteJob = (id) =>
    runAction([id], "delete");

  const handleBulkDelete = () => {
    if (
      window.confirm(
        `Xác nhận xóa ${selectedJobIds.length} tin tuyển dụng đã chọn?`
      )
    ) {
      runAction([...selectedJobIds], "delete");
    }
  };

  const handleOpenPreview = (job) => {
    setSelectedJob(job);
    setShowPreviewModal(true);
  };

  const exportJobs = () => {
    try {
      const cell = (value) => {
        let text = String(value ?? "");

        if (/^\s*[=+@-]/.test(text)) {
          text = "'" + text;
        }

        return '"' + text.replace(/"/g, '""') + '"';
      };

      const rows = [
        [
          "Mã tin",
          "Vị trí",
          "Phòng ban",
          "Địa điểm",
          "Ứng viên",
          "Lượt xem",
          "Trạng thái"
        ],
        ...filteredJobs.map((job) => [
          job.id,
          job.title,
          job.department || job.team,
          job.location,
          job.applicantCount ?? job.applicants ?? 0,
          job.viewCount ?? job.views ?? 0,
          job.status
        ])
      ];

      const blob = new Blob(
        [
          "\uFEFF" +
          rows
            .map((row) => row.map(cell).join(","))
            .join("\r\n")
        ],
        { type: "text/csv;charset=utf-8" }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "matchajob-tin-tuyen-dung.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Đã tạo tệp CSV theo bộ lọc.");
    } catch {
      showToast("Không thể tạo tệp CSV.");
    }
  };

  const copyJobLink = async (job) => {
    try {
      const url = new URL(
        `/jobs/${encodeURIComponent(job.id)}`,
        window.location.origin
      );

      await navigator.clipboard.writeText(url.href);
      showToast("Đã sao chép liên kết tin tuyển dụng.");
    } catch {
      showToast("Không thể sao chép liên kết.");
    }
  };

  const filterOptions = [
    "all",
    "Đang tuyển",
    "Bản nháp",
    "Chờ duyệt",
    "Tạm dừng",
    "Đã đóng"
  ];

  return (
    <Card
      className="matcha-card p-4 border-0 shadow-sm"
      data-aos="fade-up"
    >
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
        <div>
          <h5 className="fw-bold mb-0">
            Quản lý tin tuyển dụng
          </h5>
          <p className="text-muted small mb-0">
            Theo dõi toàn bộ các vị trí đã đăng, hiệu suất
            tiếp cận và trạng thái
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            disabled={!filteredJobs.length || busy}
            onClick={exportJobs}
          >
            <i className="bi bi-download me-1" />
            Xuất danh sách
          </Button>

          <Button
            variant="success"
            size="sm"
            className="fw-bold"
            disabled={busy}
            onClick={onOpenComposer}
          >
            <i className="bi bi-plus-lg me-1" />
            Tạo tin mới
          </Button>
        </div>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {filterOptions.map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy}
              className={`filter-pill ${
                filterStatus === status ? "active" : ""
              }`}
              onClick={() => changeFilter("status", status)}
            >
              <span>
                {status === "all" ? "Tất cả" : status}
              </span>
              <span className="badge">
                {status === "all"
                  ? jobs.length
                  : jobs.filter((job) => job.status === status).length}
              </span>
            </button>
          ))}
        </div>

        <div style={{ maxWidth: 300, width: "100%" }}>
          <InputGroup size="sm">
            <InputGroup.Text
              style={{
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--border)",
                color: "var(--muted)"
              }}
            >
              <i className="bi bi-search" />
            </InputGroup.Text>

            <Form.Control
              placeholder="Tìm theo vị trí, mã tin hoặc địa điểm..."
              value={searchQuery}
              disabled={busy}
              onChange={(event) =>
                changeFilter("search", event.target.value)
              }
              style={{
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--border)",
                color: "var(--text)"
              }}
            />
          </InputGroup>
        </div>
      </div>

      {busy && (
        <div className="small text-muted mb-3" role="status">
          Đang xử lý tin tuyển dụng…
        </div>
      )}

      {selectedJobIds.length > 0 && (
        <div className="p-3 mb-3 rounded-3 bg-surface-2 border d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="small">
            Đã chọn <strong>{selectedJobIds.length}</strong> tin tuyển dụng
          </div>

          <div className="d-flex gap-2 align-items-center">
            <Button
              variant="outline-danger"
              size="sm"
              className="rounded-pill"
              disabled={busy}
              onClick={handleBulkDelete}
            >
              <i className="bi bi-trash me-1" />
              Xóa đã chọn
            </Button>

            <Button
              variant="link"
              size="sm"
              className="text-decoration-none text-muted p-0 ms-2 small"
              disabled={busy}
              onClick={() => setSelectedJobIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <Table hover className="matcha-table align-middle mb-0">
          <thead>
            <tr>
              <th style={{ width: 48, textAlign: "center" }}>
                <Form.Check
                  className="matcha-checkbox-wrap"
                  type="checkbox"
                  checked={isAllSelected}
                  disabled={busy}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = isPartiallySelected;
                    }
                  }}
                  onChange={handleSelectAll}
                  aria-label="Chọn tất cả tin tuyển dụng"
                />
              </th>

              {[
                "Mã tin",
                "Vị trí tuyển dụng",
                "Phòng ban",
                "Địa điểm",
                "Ứng viên / Lượt xem",
                "Ngày đăng",
                "Trạng thái"
              ].map((label) => (
                <th
                  key={label}
                  className="text-center text-nowrap"
                >
                  {label}
                </th>
              ))}

              <th
                className="text-center text-nowrap"
                style={{ width: 100, minWidth: 95 }}
              >
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody>
            {!filteredJobs.length && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-4 text-muted"
                >
                  Không tìm thấy tin tuyển dụng nào phù hợp
                  với bộ lọc.
                </td>
              </tr>
            )}

            {filteredJobs.map((job) => (
              <tr
                key={job.id}
                className={isSelected(job.id) ? "table-active" : ""}
              >
                <td className="text-center">
                  <Form.Check
                    className="matcha-checkbox-wrap"
                    type="checkbox"
                    checked={isSelected(job.id)}
                    disabled={busy}
                    onChange={() =>
                      handleToggleSelectJob(job.id)
                    }
                    aria-label={`Chọn tin ${job.title}`}
                  />
                </td>

                <td className="text-center">
                  <code>{job.id}</code>
                </td>

                <td className="text-start">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-start fw-bold text-body text-decoration-none d-block text-truncate"
                    style={{ maxWidth: 260 }}
                    onClick={() => handleOpenPreview(job)}
                  >
                    {job.title}
                  </button>

                  {job.salary && (
                    <span className="small text-muted">
                      {job.salary}
                    </span>
                  )}
                </td>

                <td className="text-start">
                  {job.department || job.team || "Chưa cập nhật"}
                </td>

                <td className="text-start">
                  <i className="bi bi-geo-alt me-1 text-muted" />
                  {job.location}
                </td>

                <td className="text-center">
                  <strong className="text-body">
                    {job.applicantCount ?? job.applicants ?? 0}
                  </strong>
                  <span className="text-muted small">
                    {" / "}
                    {job.viewCount ?? job.views ?? 0} views
                  </span>
                </td>

                <td className="text-center text-muted small">
                  {job.postedDate || job.posted || "Chưa cập nhật"}
                </td>

                <td className="text-center">
                  <span
                    className={`status-badge ${
                      job.status === "Đang tuyển"
                        ? "status-badge-success"
                        : job.status === "Bản nháp"
                          ? "status-badge-secondary bg-light text-muted border"
                          : job.status === "Chờ duyệt"
                            ? "status-badge-warning"
                            : job.status === "Tạm dừng"
                              ? "status-badge-secondary"
                              : "status-badge-dark bg-dark text-white"
                    }`}
                  >
                    {job.status}
                  </span>
                </td>

                <td className="text-center">
                  <Dropdown align="end">
                    <Dropdown.Toggle
                      as={CustomThreeDotsToggle}
                      disabled={busy}
                    />

                    <Dropdown.Menu className="matcha-dropdown-menu py-2">
                      <Dropdown.Item
                        onClick={() => handleOpenPreview(job)}
                        className="small py-2"
                      >
                        <i className="bi bi-eye text-primary me-2" />
                        Xem chi tiết JD
                      </Dropdown.Item>

                      <Dropdown.Item
                        onClick={() => onEditJob?.(job)}
                        disabled={!onEditJob || busy}
                        className="small py-2 text-primary"
                      >
                        <i className="bi bi-pencil-square text-primary me-2" />
                        Chỉnh sửa tin
                      </Dropdown.Item>

                      <Dropdown.Item
                        onClick={() => onNavigateCandidates?.(job)}
                        disabled={!onNavigateCandidates || job.status === "Bản nháp"}
                        className="small py-2"
                      >
                        <i className="bi bi-people text-info me-2" />
                        Xem ứng viên (
                        {job.applicantCount ?? job.applicants ?? 0})
                      </Dropdown.Item>

                      <Dropdown.Item
                        onClick={() => copyJobLink(job)}
                        className="small py-2"
                      >
                        <i className="bi bi-link-45deg text-secondary me-2" />
                        Sao chép liên kết
                      </Dropdown.Item>

                      <Dropdown.Divider />

                      {/* Vòng đời tin tuyển dụng */}
                      {job.status === "Bản nháp" && (
                        <Dropdown.Item
                          disabled={busy}
                          onClick={() => runAction([job.id], "publish")}
                          className="small py-2 text-success"
                        >
                          <i className="bi bi-send-check text-success me-2" />
                          Đăng tin tuyển dụng
                        </Dropdown.Item>
                      )}

                      {job.status === "Đang tuyển" && (
                        <>
                          <Dropdown.Item
                            disabled={busy}
                            onClick={() => runAction([job.id], "pause")}
                            className="small py-2 text-warning"
                          >
                            <i className="bi bi-pause-circle text-warning me-2" />
                            Tạm dừng nhận đơn
                          </Dropdown.Item>
                          <Dropdown.Item
                            disabled={busy}
                            onClick={() => runAction([job.id], "close")}
                            className="small py-2 text-secondary"
                          >
                            <i className="bi bi-x-circle text-secondary me-2" />
                            Đóng tin này
                          </Dropdown.Item>
                        </>
                      )}

                      {job.status === "Tạm dừng" && (
                        <>
                          <Dropdown.Item
                            disabled={busy}
                            onClick={() => runAction([job.id], "resume")}
                            className="small py-2 text-success"
                          >
                            <i className="bi bi-play-circle text-success me-2" />
                            Tiếp tục tuyển dụng
                          </Dropdown.Item>
                          <Dropdown.Item
                            disabled={busy}
                            onClick={() => runAction([job.id], "close")}
                            className="small py-2 text-secondary"
                          >
                            <i className="bi bi-x-circle text-secondary me-2" />
                            Đóng tin này
                          </Dropdown.Item>
                        </>
                      )}

                      {job.status === "Đã đóng" && (
                        <Dropdown.Item
                          disabled={busy}
                          onClick={() => runAction([job.id], "resume")}
                          className="small py-2 text-success"
                        >
                          <i className="bi bi-arrow-repeat text-success me-2" />
                          Mở lại tin tuyển dụng
                        </Dropdown.Item>
                      )}

                      <Dropdown.Item
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Xác nhận xóa tin "${job.title}"?`
                            )
                          ) {
                            handleDeleteJob(job.id);
                          }
                        }}
                        className="small py-2 text-danger"
                      >
                        <i className="bi bi-trash text-danger me-2" />
                        Xóa tin này
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <JobPreviewModal
        show={showPreviewModal}
        onHide={() => setShowPreviewModal(false)}
        job={previewJob}
        onEditJob={onEditJob}
        onToggleStatus={toggleJobStatus}
        onDeleteJob={handleDeleteJob}
        onPublishJob={(id) => runAction([id], "publish")}
        onCloseJob={(id) => runAction([id], "close")}
        onViewCandidates={onNavigateCandidates}
      />
    </Card>
  );
}