import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import { adminService, jobService, mockStore } from "../../services";
import { MATCHAJOB_MOCK } from "../../services/mockData";
import { useToast } from "../../context/ToastContext";

// Modular Admin Views
import AdminOverviewView from "./views/AdminOverviewView";
import ModerationView from "./views/ModerationView";
import UsersView from "./views/UsersView";
import ReportsView from "./views/ReportsView";
import CategoriesView from "./views/CategoriesView";
import SystemView from "./views/SystemView";
import LogsView from "./views/LogsView";
import NotificationsView from "./views/NotificationsView";
import AdminProfileView from "./views/AdminProfileView";

export default function AdminPortal() {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = () => {
    const hash = window.location.hash.replace("#", "");
    const validTabs = ["overview", "moderation", "users", "reports", "categories", "system", "logs", "notifications", "profile"];
    return validTabs.includes(hash) ? hash : "overview";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) setActiveTab(hash);
  }, [location.hash]);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) setActiveTab(hash);
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`/admin#${tabKey}`);
  };

  // State managed via adminService & Fixtures
  const [reviews, setReviews] = useState(() => mockStore.getReviews());
  const [users, setUsers] = useState(() => mockStore.getUsers());
  const [reports, setReports] = useState(() => mockStore.getReports());
  const [categories, setCategories] = useState(() => mockStore.getCategories());
  const [notifications, setNotifications] = useState(() => mockStore.getNotifications());
  const [logs, setLogs] = useState(() => mockStore.getAuditLogs());

  const refreshAdminData = useCallback(async () => {
    try {
      const [revData, usrData, repData, catData, logData] = await Promise.all([
        adminService.getReviews(),
        adminService.getUsers(),
        adminService.getReports(),
        adminService.getCategories(),
        adminService.getAuditLogs()
      ]);
      if (revData) setReviews(revData);
      if (usrData) setUsers(usrData);
      if (repData) setReports(repData);
      if (catData) setCategories(catData);
      if (logData) setLogs(logData);
      setNotifications(mockStore.getNotifications());
    } catch (err) {
      console.warn("[AdminPortal] Lỗi nạp dữ liệu qua adminService:", err);
    }
  }, []);

  useEffect(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  useEffect(() => {
    const handleStoreChange = () => {
      refreshAdminData();
    };

    window.addEventListener("matchajob:store-changed", handleStoreChange);
    return () => {
      window.removeEventListener("matchajob:store-changed", handleStoreChange);
    };
  }, [refreshAdminData]);

  const pendingReviewsCount = reviews.filter(
    (r) => r.status === "Chờ duyệt" || r.status === "Cần kiểm tra" || r.status === "Chờ xác minh"
  ).length;
  const pendingReportsCount = reports.filter((r) => r.status !== "Đã xử lý").length;
  const activeJobsCount = mockStore.getJobs().filter((j) => j.status === "Đang tuyển").length;

  const dynamicAdminData = {
    ...MATCHAJOB_MOCK.admin,
    metrics: [
      { label: "Tổng người dùng", value: `${(18200 + users.length).toLocaleString("vi-VN")}`, change: "+18,2%", tone: "purple", icon: "●" },
      { label: "Tin đang hiển thị", value: `${(1280 + activeJobsCount).toLocaleString("vi-VN")}`, change: "+7,6%", tone: "green", icon: "▣" },
      { label: "Hồ sơ chờ duyệt", value: `${pendingReviewsCount}`, change: `${reviews.filter((r) => r.risk === "Cao").length} rủi ro cao`, tone: "orange", icon: "◷" },
      { label: "Báo cáo rủi ro", value: `${pendingReportsCount}`, change: `${reports.filter((r) => r.severity === "Nghiêm trọng").length} nghiêm trọng`, tone: "red", icon: "!" }
    ],
    logs,
    reviews,
    users,
    reports,
    categories,
    notifications
  };

  return (
    <Container fluid className="py-4 px-lg-5">


      {/* Admin Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h2 className="fw-bold mb-0 fs-3">Trung tâm Điều hành Quản trị</h2>
            <span className="status-badge status-badge-purple">
              <i className="bi bi-shield-fill-check me-1"></i>Quản trị hệ thống
            </span>
          </div>
          <p className="text-muted small mb-0">Giám sát toàn cảnh hệ thống, kiểm duyệt nội dung và an ninh vận hành</p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Button
            variant="outline-dark"
            size="sm"
            onClick={() => showToast("Đã xuất nhật ký kiểm toán hệ thống (.CSV)")}
          >
            <i className="bi bi-file-earmark-arrow-down me-1"></i>Xuất Audit Log
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleTabChange("notifications")}
          >
            <i className="bi bi-bell me-1"></i>
            Thông báo ({notifications.filter((n) => n.unread).length})
          </Button>
        </div>
      </div>

      {/* 9 SUB-VIEWS RENDERED CONDITIONALLY */}
      {activeTab === "overview" && (
        <AdminOverviewView
          adminData={dynamicAdminData}
          onNavigateTab={handleTabChange}
        />
      )}

      {activeTab === "moderation" && (
        <ModerationView
          reviews={reviews}
          setReviews={setReviews}
        />
      )}

      {activeTab === "users" && (
        <UsersView
          users={users}
          setUsers={setUsers}
        />
      )}

      {activeTab === "reports" && (
        <ReportsView
          reports={reports}
          setReports={setReports}
        />
      )}

      {activeTab === "categories" && (
        <CategoriesView
          categories={categories}
          setCategories={setCategories}
        />
      )}

      {activeTab === "system" && (
        <SystemView />
      )}

      {activeTab === "logs" && (
        <LogsView logs={logs} />
      )}

      {activeTab === "notifications" && (
        <NotificationsView
          notifications={notifications}
          setNotifications={setNotifications}
        />
      )}

      {activeTab === "profile" && (
        <AdminProfileView />
      )}
    </Container>
  );
}
