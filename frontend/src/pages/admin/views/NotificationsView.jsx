import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useToast } from "../../../context/ToastContext";
import { mockStore } from "../../../services/mockStore";

export default function NotificationsView({ notifications, setNotifications, onNavigateTab }) {
  const { showToast } = useToast();

  const handleMarkAllRead = () => {
    mockStore.markAllNotificationsRead();
    setNotifications(mockStore.getNotifications());
    showToast("Đã đánh dấu tất cả thông báo là đã đọc");
  };

  const removeNotification = (id) => {
    mockStore.deleteNotification(id);
    setNotifications(mockStore.getNotifications());
    showToast("Đã xóa thông báo");
  };

  const handleClickNotification = (n) => {
    if (n.unread) {
      mockStore.markNotificationRead(n.id);
      setNotifications(mockStore.getNotifications());
    }
    if (n.tab && onNavigateTab) {
      onNavigateTab(n.tab);
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <Card className="matcha-card p-4 border-0 shadow-sm" data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Trung tâm thông báo hệ thống ({unreadCount} chưa đọc)</h5>
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
          notifications.map((n) => {
            const isRed = n.tone === "red";
            const isOrange = n.tone === "orange";

            return (
              <div
                key={n.id}
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
                        ? "bi-shield-exclamation"
                        : "bi-check2-circle"
                    }`}
                  ></i>
                </div>

                <div className="flex-grow-1 cursor-pointer" onClick={() => handleClickNotification(n)}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong className="text-body small">{n.title}</strong>
                    <span className="small text-muted">{n.time}</span>
                  </div>
                  <div className="small text-muted">{n.detail}</div>
                  {n.tab && (
                    <span className="small text-success fw-medium mt-1 d-inline-block">
                      Chuyển tới mục {n.tab === "reports" ? "Báo cáo" : n.tab === "moderation" ? "Kiểm duyệt" : "Hệ thống"} →
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted p-1"
                  title="Xóa thông báo"
                  onClick={() => removeNotification(n.id)}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
