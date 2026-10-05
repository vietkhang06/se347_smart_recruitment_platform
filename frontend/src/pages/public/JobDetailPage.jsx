import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useToast } from "../../context/ToastContext";
import { useCandidateData } from "../../hooks/useCandidateData";
import {
  getPublicJobs,
  getProfile,
  isJobOpen,
  alreadyApplied,
  apply,
  profileErrors,
  readCV,
} from "../../services/candidateService";
import { Empty, ErrorNotice } from "../../components/candidate/CandidateUI";
import HRContactCard from "../../components/common/HRContactCard";
import { mockStore } from "../../services/mockStore";
import CVUpload from "../../components/candidate/CVUpload";
// Chuyển nội dung rich-text của HR sang văn bản an toàn, không chèn HTML thô.
function plainText(value = "") {
  const doc = new DOMParser().parseFromString(String(value), "text/html");
  doc.querySelectorAll("script,style,iframe,object").forEach((n) => n.remove());
  doc.querySelectorAll("li").forEach((n) => {
    n.prepend("• ");
    n.append("\n");
  });
  doc.querySelectorAll("p,div,br").forEach((n) => n.append("\n"));
  return doc.body.textContent.trim();
}
export default function JobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();
  const jobs = useCandidateData(getPublicJobs);
  const hr = useCandidateData(() => mockStore.getEmployerProfile());
  const job = jobs.find((j) => String(j.id) === id);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(null);
  const [letter, setLetter] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [uploadBusy, setUploadBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const applied = user?.role === "candidate" && alreadyApplied(user, id);
  if (!job)
    return (
      <div className="container py-5">
        <Empty
          title="Không tìm thấy tin tuyển dụng"
          text="Tin có thể đã được gỡ hoặc chưa được duyệt."
          to="/jobs"
          action="Quay lại tìm việc"
        />
      </div>
    );
  const open = isJobOpen(job);
  function openModal() {
    setDraft(getProfile(user));
    setLetter("");
    setError("");
    setErrors({});
    setShow(true);
  }
  async function submit(e) {
    e.preventDefault();
    if (lock.current || uploadBusy) return;
    const next = profileErrors(draft);
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!draft.cv) {
      setError("Vui lòng chọn một CV PDF.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await readCV(user, draft.cv);
      apply(user, job.id, draft, letter);
      setShow(false);
      showToast("Đã gửi hồ sơ. Bạn có thể xem tại Đơn ứng tuyển.");
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="container candidate-space py-5">
      <Link className="text-success text-decoration-none" to="/jobs">
        ← Tất cả việc làm
      </Link>
      <div className="candidate-grid mt-4">
        <div>
          <section className="candidate-panel">
            <div className="candidate-eyebrow">{job.company}</div>
            <h1 className="candidate-title">{job.title}</h1>
            <p className="fs-5 fw-semibold text-success">
              {job.salary || "Thỏa thuận"}
            </p>
            <div className="candidate-tags">
              <span>{job.location}</span>
              <span>{job.type}</span>
              <span>{job.exp || "Không yêu cầu kinh nghiệm"}</span>
            </div>
          </section>
          {[
            ["Mô tả công việc", job.description || job.desc],
            ["Yêu cầu ứng viên", job.requirements],
            ["Quyền lợi", job.benefits],
            ["Thời gian làm việc", job.schedule],
          ]
            .filter(([, v]) => v)
            .map(([title, text]) => (
              <section className="candidate-panel" key={title}>
                <h2 className="mb-3">{title}</h2>
                <div className="candidate-description">{plainText(text)}</div>
              </section>
            ))}
        </div>
        <aside className="candidate-sticky">
          <section className="candidate-panel">
            <h2 className="mb-3">Thông tin ứng tuyển</h2>
            <p className="text-muted small">
              Hạn nhận hồ sơ: <strong>{job.deadline || "Chưa công bố"}</strong>
            </p>
            <p className="text-muted small">
              Địa điểm: {job.address || job.location}
            </p>
            {!open && (
              <div className="alert alert-secondary">
                Tin hiện không nhận hồ sơ.
              </div>
            )}
            {applied ? (
              <>
                <div className="alert alert-success">
                  Bạn đã ứng tuyển công việc này.
                </div>
                <Link
                  className="btn btn-success w-100"
                  to="/candidate/applications"
                >
                  Xem đơn ứng tuyển
                </Link>
              </>
            ) : !user ? (
              <Link
                className="btn btn-success w-100"
                to={`/login?role=candidate&redirect=${encodeURIComponent(`/jobs/${id}`)}`}
              >
                Đăng nhập để ứng tuyển
              </Link>
            ) : user.role !== "candidate" ? (
              <p className="candidate-note">
                Đăng nhập vai trò ứng viên để nộp hồ sơ.
              </p>
            ) : (
              <button
                className="btn btn-success w-100"
                disabled={!open}
                onClick={openModal}
              >
                Ứng tuyển ngay
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-success w-100 mt-2"
              onClick={() => toggleFavorite(job.id)}
              aria-pressed={isFavorite(job.id)}
            >
              {isFavorite(job.id) ? "♥ Đã lưu công việc" : "♡ Lưu công việc"}
            </button>
            <p className="candidate-note mt-3 mb-0">
              Kiểm tra thông tin liên hệ và CV trước khi gửi hồ sơ.
            </p>
          </section>
          {(job.contact || job.companyId === "COMP-01") && <HRContactCard contact={job.companyId === "COMP-01" ? hr : job.contact} />}
        </aside>
      </div>
      <Modal
        show={show}
        onHide={() => {
          if (!busy && !uploadBusy) setShow(false);
        }}
        centered
        size="lg"
        backdrop={busy || uploadBusy ? "static" : true}
        keyboard={!busy && !uploadBusy}
      >
        <Modal.Header closeButton={!busy && !uploadBusy}>
          <Modal.Title className="fs-5">Ứng tuyển: {job.title}</Modal.Title>
        </Modal.Header>
        {draft && (
          <form onSubmit={submit} noValidate>
            <Modal.Body>
              <ErrorNotice message={error} />
              <div className="row g-3 mb-4">
                {[
                  ["name", "Họ và tên", "text"],
                  ["email", "Email liên hệ", "email"],
                  ["phone", "Số điện thoại", "tel"],
                ].map(([name, label, type]) => (
                  <div
                    className={name === "name" ? "col-12" : "col-md-6"}
                    key={name}
                  >
                    <label className="form-label" htmlFor={`apply-${name}`}>
                      {label} *
                    </label>
                    <input
                      id={`apply-${name}`}
                      className={`form-control ${errors[name] ? "is-invalid" : ""}`}
                      type={type}
                      value={draft[name]}
                      maxLength={200}
                      onChange={(e) =>
                        setDraft({ ...draft, [name]: e.target.value })
                      }
                      aria-invalid={Boolean(errors[name])}
                    />
                    {errors[name] && (
                      <div className="invalid-feedback">{errors[name]}</div>
                    )}
                  </div>
                ))}
              </div>
              <CVUpload
                disabled={busy}
                onBusyChange={setUploadBusy}
                value={draft.cv}
                onChange={(cv) => setDraft({ ...draft, cv })}
              />
              <label className="form-label mt-3" htmlFor="apply-letter">
                Thư giới thiệu (không bắt buộc)
              </label>
              <textarea
                id="apply-letter"
                className="form-control"
                rows={4}
                maxLength={3000}
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                placeholder="Chia sẻ ngắn gọn vì sao bạn phù hợp..."
              />
              <p className="candidate-note mt-2 mb-0">
                Thông tin và CV tại thời điểm gửi được lưu kèm đơn. Thay đổi hồ
                sơ sau này không thay bản đã nộp.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={busy || uploadBusy}
                onClick={() => setShow(false)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-success"
                disabled={busy || uploadBusy}
              >
                {busy ? "Đang gửi…" : "Xác nhận gửi hồ sơ"}
              </button>
            </Modal.Footer>
          </form>
        )}
      </Modal>
    </div>
  );
}
