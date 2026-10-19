import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  ProgressBar,
  Button
} from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  saveProfile
} from "../../services/profileService";
import CandidateCV from "../../components/candidate/CandidateCV";

function ProfileEditor() {
  const [profile, setProfile] = useState(getProfile);

  const [skills, setSkills] = useState(
    () => (getProfile().skills || []).join(", ")
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const checks = [
    profile.name,
    profile.role,
    profile.phone,
    profile.location,
    profile.experience,
    profile.bio,
    skills.trim(),
    profile.cvId
  ];

  const completion = Math.round(
    checks.filter(value => String(value || "").trim()).length
    / checks.length * 100
  );

  function save(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !profile.name.trim() ||
      !/^[+\d][\d\s().-]{7,19}$/.test(profile.phone.trim())
    ) {
      setError("Nhập họ tên và số điện thoại hợp lệ (8–20 ký tự).");
      return;
    }

    try {
      const next = {
        ...profile,
        skills: [
          ...new Set(
            skills.split(",").map(skill => skill.trim()).filter(Boolean)
          )
        ]
      };

      saveProfile(next);
      setProfile(next);
      setNotice(
        "Đã lưu hồ sơ. Bạn có thể dùng thông tin này cho các đơn mới."
      );
    } catch {
      setError(
        "Không lưu được hồ sơ. Kiểm tra quyền/dung lượng lưu trữ trình duyệt."
      );
    }
  }

  return (
    <Container className="py-5">
      <Card className="matcha-card p-4 mb-4 border-0 shadow-sm">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-3"
              style={{
                width: 72,
                height: 72,
                background: "var(--primary)"
              }}
            >
              {(profile.name || "Ứng viên")
                .trim()
                .split(/\s+/)
                .map(word => word[0])
                .slice(-2)
                .join("")}
            </div>

            <div>
              <h1 className="h4 fw-bold mb-1">
                {profile.name || "Hồ sơ của bạn"}
              </h1>

              <div className="text-muted small">
                {profile.role || "Bổ sung chức danh mong muốn"}
                {" · "}
                {profile.location}
              </div>
            </div>
          </div>

          <div>
            <div className="small text-muted mb-2">
              Hoàn thiện hồ sơ: {completion}%
            </div>

            <ProgressBar
              now={completion}
              variant="success"
              style={{ width: 180, height: 8 }}
            />
          </div>
        </div>
      </Card>

      {error && (
        <div className="alert alert-danger" role="alert">{error}</div>
      )}

      {notice && (
        <div className="alert alert-success" role="status">{notice}</div>
      )}

      <Row className="g-4">
        <Col lg={7}>
          <Card className="matcha-card p-4 border-0 shadow-sm">
            <h2 className="h5 fw-bold mb-3">
              Thông tin chuyên môn
            </h2>

            <form id="candidate-profile-form" onSubmit={save}>
              <Row className="g-3">
                {[
                  ["name", "Họ và tên"],
                  ["role", "Chức danh mong muốn"],
                  ["email", "Email tài khoản"],
                  ["phone", "Số điện thoại"],
                  ["experience", "Kinh nghiệm"],
                  ["location", "Khu vực sinh sống"]
                ].map(([key, label]) => (
                  <Col md={6} key={key}>
                    <label className="small fw-semibold w-100">
                      {label}

                      <input
                        className="form-control mt-1"
                        value={profile[key] || ""}
                        maxLength={150}
                        type={
                          key === "phone"
                            ? "tel"
                            : key === "email"
                            ? "email"
                            : "text"
                        }
                        required={["name", "phone", "email"].includes(key)}
                        readOnly={key === "email"}
                        onChange={event =>
                          setProfile({
                            ...profile,
                            [key]: event.target.value
                          })
                        }
                      />
                    </label>
                  </Col>
                ))}

                <Col xs={12}>
                  <label className="small fw-semibold w-100">
                    Kỹ năng (ngăn cách bằng dấu phẩy)

                    <input
                      className="form-control mt-1"
                      value={skills}
                      maxLength={500}
                      onChange={event => setSkills(event.target.value)}
                      placeholder="React, Figma, SQL"
                    />
                  </label>
                </Col>

                <Col xs={12}>
                  <label className="small fw-semibold w-100">
                    Giới thiệu bản thân & mục tiêu

                    <textarea
                      className="form-control mt-1"
                      rows={5}
                      maxLength={2000}
                      value={profile.bio || ""}
                      onChange={event =>
                        setProfile({
                          ...profile,
                          bio: event.target.value
                        })
                      }
                    />
                  </label>

                  <div className="small text-muted text-end">
                    {(profile.bio || "").length}/2000
                  </div>
                </Col>

                <Col xs={12}>
                  <Button
                    type="submit"
                    variant="success"
                    disabled={busy}
                  >
                    Lưu thay đổi hồ sơ
                  </Button>
                </Col>
              </Row>
            </form>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
            <h2 className="h5 fw-bold mb-3">Tệp CV của bạn</h2>

            <CandidateCV
              value={profile}
              onBusy={setBusy}
              onChange={cv =>
                setProfile(current => ({ ...current, ...cv }))
              }
            />

            <p className="small text-muted mt-3">
              Sau khi chọn CV, bấm Lưu thay đổi hồ sơ.
              Đơn đã gửi giữ nguyên CV và nội dung tại thời điểm nộp.
            </p>

            <Button
              type="submit"
              form="candidate-profile-form"
              variant="success"
              disabled={busy}
            >
              Lưu hồ sơ & CV
            </Button>

            <Button
              as={Link}
              to="/candidate/applications"
              variant="outline-success"
              className="mt-2"
            >
              Đến đơn ứng tuyển
            </Button>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  if (user?.role !== "candidate") {
    return (
      <Container className="py-5">
        <h1 className="h4">Đăng nhập để quản lý hồ sơ</h1>
        <Link to="/login">Đến trang đăng nhập</Link>
      </Container>
    );
  }

  return <ProfileEditor key={user.email} />;
}