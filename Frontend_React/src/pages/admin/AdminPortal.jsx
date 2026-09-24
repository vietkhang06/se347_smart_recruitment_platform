import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
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

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    window.location.hash = tabKey;
  };

  const adminData = MATCHAJOB_MOCK.admin;
  const [reviews, setReviews] = useState(adminData.reviews);
  const [users, setUsers] = useState(adminData.users);
  const [reports, setReports] = useState(adminData.reports);
  const [categories, setCategories] = useState(adminData.categories || []);
  const [notifications, setNotifications] = useState(adminData.notifications || []);

  const pendingReviewsCount = reviews.filter((r) => r.status === "Chờ duyệt" || r.status === "Cần kiểm tra").length;
  const pendingReportsCount = reports.filter((r) => r.status !== "Đã xử lý").length;

  return (
    <Container fluid className="py-4 px-lg-5">
      {/* Admin Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h2 className="fw-bold mb-0 fs-3">Trung tâm Điều hành Quản trị</h2>
            <Badge bg="dark" className="border">
              <i className="bi bi-shield-fill-check me-1 text-warning"></i>SUPER ADMIN
            </Badge>
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

      {/* Admin Navigation Tabs (9 Sub-views) */}
      <Nav
        variant="pills"
        className="mb-4 gap-2 border-bottom pb-3 flex-nowrap overflow-auto"
        activeKey={activeTab}
      >
        <Nav.Item>
          <Nav.Link eventKey="overview" onClick={() => handleTabChange("overview")} className="fw-medium text-nowrap">
            <i className="bi bi-grid-1x2 me-1"></i>Tổng quan hệ thống
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="moderation" onClick={() => handleTabChange("moderation")} className="fw-medium text-nowrap">
            <i className="bi bi-check2-circle me-1"></i>Kiểm duyệt ({pendingReviewsCount})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="users" onClick={() => handleTabChange("users")} className="fw-medium text-nowrap">
            <i className="bi bi-people me-1"></i>Người dùng ({users.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="reports" onClick={() => handleTabChange("reports")} className="fw-medium text-nowrap">
            <i className="bi bi-exclamation-triangle me-1"></i>Báo cáo vi phạm ({pendingReportsCount})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="categories" onClick={() => handleTabChange("categories")} className="fw-medium text-nowrap">
            <i className="bi bi-tags me-1"></i>Danh mục ngành nghề
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="system" onClick={() => handleTabChange("system")} className="fw-medium text-nowrap">
            <i className="bi bi-sliders me-1"></i>Cấu hình hệ thống
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="logs" onClick={() => handleTabChange("logs")} className="fw-medium text-nowrap">
            <i className="bi bi-journal-text me-1"></i>Nhật ký hệ thống
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="notifications" onClick={() => handleTabChange("notifications")} className="fw-medium text-nowrap">
            <i className="bi bi-bell me-1"></i>Thông báo
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="profile" onClick={() => handleTabChange("profile")} className="fw-medium text-nowrap">
            <i className="bi bi-person-badge me-1"></i>Hồ sơ Admin
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* 9 SUB-VIEWS RENDERED CONDITIONALLY */}
      {activeTab === "overview" && (
        <AdminOverviewView
          adminData={adminData}
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
        <LogsView logs={adminData.logs} />
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
