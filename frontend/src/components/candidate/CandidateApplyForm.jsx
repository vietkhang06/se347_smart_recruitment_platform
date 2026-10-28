import { IS_API } from "../../services/dataMode";
import ApiApplyForm from "./ApiApplyForm";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { jobService } from "../../services/jobService";
import { getProfile } from "../../services/profileService";
import CandidateCV from "./CandidateCV";
import {
  draft,
  submitApplication,
  ownApplications
} from "../../services/applicationService";

function ApplyForm({ job, onSuccess }) {
  const [initial] = useState(() => draft(job.id));

  const [profile, setProfile] = useState(() => ({
    ...getProfile(),
    ...initial?.profile,
    email: getProfile().email
  }));

  const [letter, setLetter] = useState(
    initial?.letter || ""
  );

  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  const [notice, setNotice] = useState(
    initial
      ? "Đã khôi phục bản nháp của vị trí này."
      : ""
  );

  const sent = useRef(false);
  const sending = useRef(false);

  const save = () => {
    draft(job.id, { profile, letter });
    setNotice("Đã lưu nháp trên trình duyệt này.");
  };

  useEffect(() => {
    if (
      !dirty ||
      busy ||
      uploading ||
      sent.current
    ) {
      return;
    }

    try {
      draft(job.id, { profile, letter });
      setNotice("Đã tự động lưu nháp.");
    } catch {
      setError(
        "Không lưu được bản nháp. Hãy kiểm tra bộ nhớ trình duyệt."
      );
    }
  }, [
    profile,
    letter,
    dirty,
    busy,
    uploading,
    job.id
  ]);

  const changeProfile = patch => {
    setProfile(current => ({
      ...current,
      ...patch
    }));
    setDirty(true);
  };

  const submit = async event => {
    event.preventDefault();

    if (
      sending.current ||
      uploading ||
      !consent ||
      sent.current
    ) {
      return;
    }

    sending.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const currentJob = jobService.getJobSnapshot(job.id);

      if (
        !jobService.isAcceptingApplications(currentJob)
      ) {
        throw new Error(
          "Tin đã ngừng nhận hồ sơ. Bản nháp vẫn được giữ."
        );
      }

      const alreadyApplied = ownApplications().some(
        app => String(app.jobId) === String(job.id)
      );

      if (alreadyApplied) {
        throw new Error(
          "Bạn đã gửi hồ sơ cho vị trí này."
        );
      }

      await submitApplication(job.id, profile, letter);
      sent.current = true;
    } catch (err) {
      setError(
        err.message || "Chưa gửi được hồ sơ."
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }

    if (sent.current) {
      setNotice("Đã gửi hồ sơ thành công.");
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={submit}>
      <p className="text-muted">
        {job.company} · {job.title}
      </p>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      <fieldset disabled={busy || sent.current}>
        <button
          type="button"
          className="btn btn-sm btn-outline-success mb-3"
          disabled={uploading}
          onClick={() => {
            changeProfile(getProfile());
            setConsent(false);
            setError("");
          }}
        >
          Điền lại từ hồ sơ & CV đã lưu
        </button>

        <div className="row g-3 mb-3">
          {[
            ["name", "Họ và tên"],
            ["phone", "Số điện thoại"]
          ].map(([key, label]) => (
            <label
              className="col-sm-6 small fw-semibold"
              key={key}
            >
              {label}

              <input
                className="form-control mt-1"
                required
                maxLength={key === "name" ? 100 : 20}
                type={key === "phone" ? "tel" : "text"}
                value={profile[key] || ""}
                onChange={event =>
                  changeProfile({
                    [key]: event.target.value
                  })
                }
              />
            </label>
          ))}
        </div>

        <label className="d-block small fw-semibold mb-3">
          Email tài khoản

          <input
            className="form-control mt-1"
            value={profile.email || ""}
            readOnly
          />
        </label>

        <CandidateCV
          value={profile}
          onBusy={setUploading}
          onChange={changeProfile}
        />

        <label className="d-block small fw-semibold mt-3">
          Thư giới thiệu

          <textarea
            className="form-control mt-1"
            rows={4}
            maxLength={2000}
            value={letter}
            placeholder="Kinh nghiệm nào giúp bạn phù hợp với vị trí này?"
            onChange={event => {
              setLetter(event.target.value);
              setDirty(true);
            }}
          />
        </label>

        <div className="text-muted small text-end">
          {letter.length}/2000
        </div>

        <label className="d-flex gap-2 align-items-start my-3 small">
          <input
            type="checkbox"
            className="form-check-input flex-shrink-0"
            required
            checked={consent}
            onChange={event =>
              setConsent(event.target.checked)
            }
          />

          Tôi đồng ý chia sẻ thông tin hồ sơ và CV này
          với nhà tuyển dụng của vị trí trên.
        </label>

        <div className="d-flex justify-content-between gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={uploading}
            onClick={() => {
              try {
                save();
                setError("");
              } catch {
                setError("Không lưu được bản nháp.");
              }
            }}
          >
            Lưu nháp
          </button>

          <button
            type="submit"
            className="btn btn-success"
            disabled={
              uploading ||
              busy ||
              !profile.cvId ||
              !consent
            }
          >
            {busy
              ? "Đang gửi…"
              : "Xác nhận gửi hồ sơ"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export default function CandidateApplyForm(props) {
  const { user } = useAuth();

  if (user?.role !== "candidate") {
    return (
      <div className="alert alert-info">
        Đăng nhập bằng tài khoản ứng viên để gửi hồ sơ.

        <Link className="d-block mt-2" to="/login">
          Đến trang đăng nhập
        </Link>
      </div>
    );
  }

  if (IS_API) return <ApiApplyForm key={`${user.id || user.email}:${props.job.id}`} {...props} />;

  return (
    <ApplyForm
      key={`${user.email}:${props.job.id}`}
      {...props}
    />
  );
}