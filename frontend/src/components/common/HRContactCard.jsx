import { useState, useEffect } from "react";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import { mockStore } from "../../services/mockStore";

export default function HRContactCard({
  contact,
  showEditButton = false,
  onEditProfile,
  title = "Thông tin liên hệ HR",
  hideHeaderBar = false,
  isComposerSection = false,
  className = ""
}) {
  const [profile, setProfile] = useState(() => contact || mockStore.getEmployerProfile());

  useEffect(() => {
    if (contact) {
      setProfile(contact);
    } else {
      const handleStoreChange = () => {
        setProfile(mockStore.getEmployerProfile());
      };
      window.addEventListener("matchajob:store-changed", handleStoreChange);
      return () => window.removeEventListener("matchajob:store-changed", handleStoreChange);
    }
  }, [contact]);

  const hr = profile || {
    name: "Nguyễn Lan Anh",
    roleTitle: "Talent Acquisition Lead",
    email: "lananh@fpt.com",
    phone: "090 123 4567",
    department: "Phòng Tuyển dụng & Thu hút nhân tài",
    company: "FPT Digital Talent",
    avatar: "LA",
    workingHours: "Thứ Hai – Thứ Sáu (08:30 – 17:30)"
  };

  const getInitials = (fullName) => {
    if (!fullName) return "HR";
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const showHeader = !hideHeaderBar && !isComposerSection;

  return (
    <div
      className={`p-3 p-md-4 rounded-3 border bg-surface shadow-sm ${className}`}
      style={{
        borderLeft: "4px solid var(--primary) !important",
        transition: "all 0.2s ease"
      }}
    >
      {/* Header bar (ẩn khi là composerSection hoặc hideHeaderBar) */}
      {showHeader && (
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-success"
              style={{ width: 32, height: 32, backgroundColor: "var(--primary-soft)" }}
            >
              <i className="bi bi-person-lines-fill fs-6"></i>
            </div>
            <h5 className="fw-bold mb-0 text-body fs-6">{title}</h5>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
              <i className="bi bi-patch-check-fill me-1"></i>Chuyên viên phụ trách
            </Badge>

            {showEditButton && onEditProfile && (
              <Button
                variant="outline-success"
                size="sm"
                className="fw-semibold px-2 py-1"
                onClick={onEditProfile}
                title="Chuyển đến trang Hồ sơ HR để thay đổi thông tin liên hệ"
              >
                <i className="bi bi-pencil-square me-1"></i>Chỉnh sửa thông tin HR
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main HR info row */}
      <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
          style={{
            width: "56px",
            height: "56px",
            backgroundColor: "var(--primary)",
            fontSize: "18px",
            letterSpacing: "0.5px"
          }}
        >
          {hr.avatar || getInitials(hr.name)}
        </div>

        <div className="flex-grow-1">
          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
            <h6 className="fw-bold text-body mb-0 fs-6">{hr.name}</h6>
            <span className="text-muted small">·</span>
            <span className="badge bg-secondary bg-opacity-10 text-body small">
              {hr.roleTitle || "Talent Acquisition Lead"}
            </span>
          </div>

          <div className="text-muted small mb-2">
            <span>{hr.department || "Phòng Tuyển dụng & Thu hút nhân tài"}</span>
            {hr.company && <span> · <strong className="text-body">{hr.company}</strong></span>}
          </div>

          {/* Quick contact channels */}
          <div className="d-flex flex-wrap gap-2 gap-md-3 small">
            {hr.email && (
              <a
                href={`mailto:${hr.email}`}
                className="text-decoration-none text-body d-inline-flex align-items-center gap-1 px-2 py-1 rounded bg-surface-2 border"
                title="Gửi email cho chuyên viên"
              >
                <i className="bi bi-envelope-fill text-success"></i>
                <span className="fw-medium">{hr.email}</span>
              </a>
            )}

            {hr.phone && (
              <a
                href={`tel:${hr.phone}`}
                className="text-decoration-none text-body d-inline-flex align-items-center gap-1 px-2 py-1 rounded bg-surface-2 border"
                title="Gọi điện hoặc liên hệ Zalo"
              >
                <i className="bi bi-telephone-fill text-success"></i>
                <span className="fw-medium">{hr.phone}</span>
              </a>
            )}

            <span className="text-muted d-inline-flex align-items-center gap-1 px-2 py-1 rounded bg-surface-2 border">
              <i className="bi bi-clock-history text-muted"></i>
              <span>{hr.workingHours || "T2 – T6 (08:30 – 17:30)"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
