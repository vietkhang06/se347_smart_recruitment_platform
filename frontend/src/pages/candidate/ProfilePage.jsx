import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  CandidateLayout,
  ErrorNotice,
} from "../../components/candidate/CandidateUI";
import CVUpload from "../../components/candidate/CVUpload";
import {
  getProfile,
  saveProfile,
  profileErrors,
  completeness,
  initials,
} from "../../services/candidateService";
export default function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(() => getProfile(user));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e) => { e.preventDefault(); e.returnValue = ""; };
    const navigate = (e) => { const a=e.target.closest("a[href]"); if(a && !a.target && !a.hasAttribute("download") && new URL(a.href).pathname !== location.pathname && !window.confirm("Hồ sơ chưa được lưu. Bạn muốn rời trang?")) {e.preventDefault();e.stopPropagation();} };
    window.addEventListener("beforeunload",unload);document.addEventListener("click",navigate,true);
    return () => {window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigate,true);};
  },[dirty]);
  const update = (field, value) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setDirty(true);
    setErrors((e) => ({ ...e, [field]: "" }));
  };
  function submit(e) {
    e.preventDefault();
    if (uploadBusy) return;
    const next = profileErrors(profile);
    setErrors(next);
    setError("");
    if (Object.keys(next).length) return;
    try {
      saveProfile(user, profile);
      setDirty(false);
      showToast("Đã lưu hồ sơ và CV.");
    } catch (err) {
      setError(err.message);
    }
  }
  const field = (name, label, type = "text", placeholder = "") => (
    <div className="col-md-6" key={name}>
      <label className="form-label" htmlFor={`profile-${name}`}>
        {label}
      </label>
      <input
        id={`profile-${name}`}
        className={`form-control ${errors[name] ? "is-invalid" : ""}`}
        type={type}
        value={profile[name]}
        placeholder={placeholder}
        maxLength={250}
        onChange={(e) => update(name, e.target.value)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] && (
        <div id={`${name}-error`} className="invalid-feedback">
          {errors[name]}
        </div>
      )}
    </div>
  );
  return (
    <CandidateLayout
      title="Hồ sơ của bạn"
      subtitle="Một hồ sơ rõ ràng giúp nhà tuyển dụng hiểu bạn hơn."
    >
      <form onSubmit={submit} noValidate>
        <ErrorNotice message={error} />
        <div className="candidate-grid">
          <div>
            <section className="candidate-panel">
              <div className="d-flex gap-3 align-items-center mb-4">
                <div className="candidate-avatar">{initials(profile.name)}</div>
                <div>
                  <h2 className="mb-1">{profile.name || "Ứng viên mới"}</h2>
                  <p className="text-muted mb-0">
                    {profile.role || "Bổ sung vị trí bạn mong muốn"}
                  </p>
                </div>
              </div>
              <h2 className="mb-3">Thông tin cá nhân</h2>
              <div className="row g-3">
                {field("name", "Họ và tên *")}
                {field(
                  "role",
                  "Vị trí mong muốn",
                  "text",
                  "Ví dụ: Frontend Developer",
                )}
                {field("email", "Email liên hệ *", "email")}
                {field("phone", "Số điện thoại *", "tel")}
                {field(
                  "location",
                  "Khu vực sinh sống",
                  "text",
                  "TP. Hồ Chí Minh",
                )}
                {field(
                  "experience",
                  "Kinh nghiệm",
                  "text",
                  "Sinh viên / 1 năm / 3 năm",
                )}
                {field(
                  "portfolio",
                  "Portfolio / GitHub",
                  "url",
                  "https://github.com/...",
                )}
              </div>
            </section>
            <section className="candidate-panel">
              <h2 className="mb-3">Năng lực & định hướng</h2>
              {[
                [
                  "bio",
                  "Giới thiệu bản thân",
                  "Mục tiêu, thế mạnh và công việc bạn mong muốn.",
                ],
                ["skills", "Kỹ năng", "React, JavaScript, HTML, CSS"],
                [
                  "education",
                  "Học vấn",
                  "Trường, chuyên ngành, thời gian học.",
                ],
                [
                  "workHistory",
                  "Kinh nghiệm / Dự án",
                  "Vị trí, thời gian, công việc và kết quả đạt được.",
                ],
              ].map(([name, label, placeholder]) => (
                <div className="mb-3" key={name}>
                  <label className="form-label" htmlFor={`profile-${name}`}>
                    {label}
                  </label>
                  <textarea
                    id={`profile-${name}`}
                    className="form-control"
                    rows={name === "skills" ? 2 : 3}
                    maxLength={3000}
                    value={profile[name]}
                    placeholder={placeholder}
                    onChange={(e) => update(name, e.target.value)}
                  />
                  {name === "skills" && (
                    <small className="text-muted">
                      Phân cách các kỹ năng bằng dấu phẩy.
                    </small>
                  )}
                </div>
              ))}
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <button
                  className="btn btn-success"
                  type="submit"
                  disabled={uploadBusy}
                >
                  Lưu hồ sơ & CV
                </button>
                <span className="candidate-note" role="status">
                  {dirty
                    ? "Có thay đổi chưa lưu"
                    : "Hồ sơ đã đồng bộ với bản lưu trên trình duyệt"}
                </span>
              </div>
            </section>
          </div>
          <aside>
            <section className="candidate-panel">
              <h2>Mức độ hoàn thiện</h2>
              <div className="d-flex justify-content-between my-3">
                <span className="text-muted small">Thông tin & CV</span>
                <strong>{completeness(profile)}%</strong>
              </div>
              <div
                className="progress"
                role="progressbar"
                aria-label="Mức độ hoàn thiện hồ sơ"
                aria-valuenow={completeness(profile)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="progress-bar bg-success"
                  style={{ width: `${completeness(profile)}%` }}
                />
              </div>
              <p className="candidate-note mt-3 mb-0">
                Bổ sung vị trí, kỹ năng, học vấn và CV. Đây là mức hoàn thiện
                thông tin, không phải điểm AI.
              </p>
            </section>
            <section className="candidate-panel">
              <h2 className="mb-3">CV của bạn</h2>
              <CVUpload
                onBusyChange={setUploadBusy}
                value={profile.cv}
                onChange={(cv) => update("cv", cv)}
              />
              <p className="candidate-note mt-3 mb-0">
                Nhấn “Lưu hồ sơ & CV” sau khi thay đổi. Bản demo lưu tệp trên
                trình duyệt này; CV đã nộp được giữ riêng theo đơn.
              </p>
            </section>
          </aside>
        </div>
      </form>
    </CandidateLayout>
  );
}
