import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useToast } from "../../../context/ToastContext";

export default function NotificationsView({ notifications, setNotifications }) {
  const { showToast } = useToast();

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
    showToast("Đã đánh dấu tất cả thông báo là đã đọc");
  };

  const removeNotification = (idx) => {
    setNotifications(notifications.filter((_, i) => i !== idx));
    showToast("Đã xóa thông báo");
  };

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Trung tâm thông báo hệ thống</h5>
          <p className="text-muted small mb-0">Theo dõi các cảnh báo vi phạm, tiến độ đối soát và hoạt động nền tảng</p>
        </div>
        <Button variant="outline-dark" size="sm" onClick={handleMarkAllRead}>
          <i className="bi bi-check2-all me-1"></i>Đánh dấu tất cả là đã đọc
        </Button>
      </div>

      <div className="d-flex flex-column gap-3">
        {notifications.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-bell-slash fs-1 d-block mb-2"></i>
            Hộp thư thông báo đang trống.
          </div>
        ) : (
          notifications.map((n, idx) => {
            const isRed = n.tone === "red";
            const isOrange = n.tone === "orange";

            return (
              <div
                key={idx}
                className={`p-3 rounded border transition-all ${
                  n.unread
                    ? "bg-surface border-success shadow-sm"
                    : "bg-surface-2 opacity-75"
                } d-flex align-items-start gap-3`}
              >
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0 ${
                    isRed ? "bg-danger" : isOrange ? "bg-warning" : "bg-success"
                  }`}
                  style={{ width: "40px", height: "40px" }}
                >
                  <i
                    className={`bi ${
                      isRed
                        ? "bi-exclamation-triangle-fill"
                        : isOrange
                        ? "bi-clock-history"
                        : "bi-check-circle-fill"
                    }`}
                  ></i>
                </div>

                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong className={`small ${n.unread ? "text-body" : "text-muted"}`}>
                      {n.title}
                    </strong>
                    <span className="small text-muted">{n.time}</span>
                  </div>
                  <p className="small text-muted mb-0">{n.detail}</p>
                </div>

                <div className="d-flex gap-1 flex-shrink-0">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => showToast(`Đã mở chi tiết: ${n.title}`)}
                  >
                    Xem →
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted p-0 ms-1"
                    onClick={() => removeNotification(idx)}
                    title="Xóa thông báo"
                  >
                    <i className="bi bi-x-lg"></i>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
