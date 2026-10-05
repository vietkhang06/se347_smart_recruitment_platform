import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import { useAuth } from "../../context/AuthContext";
import { useCandidateData } from "../../hooks/useCandidateData";
import { getApplications, downloadCV, withdrawApplication } from "../../services/candidateService";
import {
  CandidateLayout,
  Empty,
  Status,
  ErrorNotice,
} from "../../components/candidate/CandidateUI";
const stages = ["Mới", "Sàng lọc", "Bài kiểm tra", "Phỏng vấn", "Đề nghị"];
export default function ApplicationsPage() {
  const { user } = useAuth();
  const applications = useCandidateData(() => getApplications(user));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const visible = applications.filter(
    (a) =>
      (!filter || a.stage === filter) &&
      `${a.title} ${a.company}`.toLowerCase().includes(query.toLowerCase()),
  );
  const detail = applications.find((a) => a.id === selected);
  return (
    <CandidateLayout
      title="Đơn ứng tuyển"
      subtitle="Theo dõi từng cơ hội, từ lúc nộp hồ sơ đến kết quả cuối cùng."
    >
      <ErrorNotice message={error} />
      <div className="candidate-stats">
        <div className="candidate-stat">
          <span className="candidate-note">Đã ứng tuyển</span>
          <strong>{applications.length}</strong>
        </div>
        <div className="candidate-stat">
          <span className="candidate-note">Phỏng vấn</span>
          <strong>
            {applications.filter((a) => a.stage === "Phỏng vấn").length}
          </strong>
        </div>
        <div className="candidate-stat">
          <span className="candidate-note">Nhận đề nghị</span>
          <strong>
            {applications.filter((a) => a.stage === "Đề nghị").length}
          </strong>
        </div>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <label className="form-label" htmlFor="application-search">
            Tìm đơn
          </label>
          <input
            id="application-search"
            className="form-control"
            placeholder="Tên công việc hoặc công ty"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="application-stage">
            Trạng thái
          </label>
          <select
            id="application-stage"
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {[...new Set(applications.map((a) => a.stage))].map((s) => (
              <option key={s} value={s}>
                {s === "Mới" ? "Đã nộp hồ sơ" : s}
              </option>
            ))}
          </select>
        </div>
      </div>
      {visible.length ? (
        visible.map((app) => (
          <article className="candidate-panel" key={app.id}>
            <div className="d-flex justify-content-between gap-3 flex-wrap">
              <div>
                <h2 className="mb-1">{app.title}</h2>
                <p className="text-muted small mb-0">
                  {app.company} · Nộp ngày {app.date}
                </p>
              </div>
              <div>
                <Status stage={app.stage} />
              </div>
            </div>
            {stages.includes(app.stage) ? (
              <ol
                className="candidate-timeline"
                aria-label="Tiến trình ứng tuyển"
              >
                {stages.map((s, i) => (
                  <li
                    key={s}
                    className={i <= stages.indexOf(app.stage) ? "done" : ""}
                    aria-current={s === app.stage ? "step" : undefined}
                  >
                    {s === "Mới" ? "Đã nộp" : s}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted mt-3">
                Quy trình đã cập nhật: {app.stage}.
              </p>
            )}
            {app.rejectReason && <p className="text-muted mt-3">Phản hồi từ nhà tuyển dụng: {app.rejectReason}</p>}
            <div className="d-flex gap-2 flex-wrap mt-3">
              {!["Đã rút", "Không phù hợp", "Đã từ chối", "Đề nghị"].includes(app.stage) && <button className="btn btn-sm btn-outline-danger" onClick={() => { if (window.confirm("Rút đơn ứng tuyển này? Nhà tuyển dụng sẽ thấy trạng thái Đã rút. Bạn không thể nộp lại tin này trong phiên bản hiện tại.")) {try {withdrawApplication(user, app.id);} catch(e) {setError(e.message);}} }}>Rút đơn</button>}
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => {
                  setSelected(app.id);
                  setError("");
                }}
              >
                Xem hồ sơ đã nộp
              </button>
              <Link
                className="btn btn-sm btn-outline-secondary"
                to={`/jobs/${app.jobId}`}
              >
                Xem tin tuyển dụng
              </Link>
            </div>
          </article>
        ))
      ) : (
        <Empty
          title={
            applications.length
              ? "Không có đơn phù hợp bộ lọc"
              : "Bạn chưa ứng tuyển công việc nào"
          }
          text="Bắt đầu từ một công việc phù hợp với kỹ năng và mong muốn của bạn."
          to="/jobs"
          action="Tìm việc ngay"
        />
      )}
      <Modal show={Boolean(detail)} onHide={() => setSelected(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Hồ sơ đã nộp</Modal.Title>
        </Modal.Header>
        {detail && (
          <Modal.Body>
            <ErrorNotice message={error} />
            <h2 className="h5">{detail.title}</h2>
            <p className="text-muted">{detail.company}</p>
            {detail.history?.length > 0 && <details className="mb-3"><summary>Lịch sử xử lý</summary><ul className="mt-2">{detail.history.map((h,i) => <li key={i}>{h.stage} · {new Date(h.at).toLocaleString("vi-VN")}</li>)}</ul></details>}
            <dl>
              <dt>Họ tên</dt>
              <dd>{detail.candidateName}</dd>
              <dt>Email</dt>
              <dd>{detail.candidateEmail}</dd>
              <dt>Số điện thoại</dt>
              <dd>{detail.candidatePhone}</dd>
              <dt>CV</dt>
              <dd>{detail.cv?.name || "Chưa có tệp"}</dd>
              <dt>Thư giới thiệu</dt>
              <dd className="candidate-description">
                {detail.coverLetter || "Không đính kèm thư giới thiệu."}
              </dd>
            </dl>
            {detail.cv && (
              <button
                className="btn btn-outline-success"
                onClick={async () => {
                  try {
                    await downloadCV(user, detail.cv);
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Tải CV đã nộp
              </button>
            )}
          </Modal.Body>
        )}
      </Modal>
    </CandidateLayout>
  );
}
