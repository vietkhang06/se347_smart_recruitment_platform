import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Badge, Button } from "react-bootstrap";
import { MATCHAJOB_MOCK } from "../../services/mockData";
import { mockStore } from "../../services/mockStore";
import { useToast } from "../../context/ToastContext";

import AdminOverviewView from "./views/AdminOverviewView";
import ModerationView from "./views/ModerationView";
import UsersView from "./views/UsersView";
import ReportsView from "./views/ReportsView";
import CategoriesView from "./views/CategoriesView";
import SystemView from "./views/SystemView";
import LogsView, { exportAuditLogs } from "./views/LogsView";
import NotificationsView from "./views/NotificationsView";
import AdminProfileView from "./views/AdminProfileView";

const VALID_TABS = [
  "overview",
  "moderation",
  "users",
  "reports",
  "categories",
  "system",
  "logs",
  "notifications",
  "profile"
];

function getTab(hash) {
  const tab = hash.replace("#", "");
  return VALID_TABS.includes(tab) ? tab : "overview";
}

export default function AdminPortal() {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(() =>
    getTab(window.location.hash)
  );

  const [reviews, setReviews] = useState(() =>
    mockStore.getReviews()
  );

  const [users, setUsers] = useState(() =>
    mockStore.getUsers()
  );

  const [reports, setReports] = useState(() =>
    mockStore.getReports()
  );

  const [categories, setCategories] = useState(() =>
    mockStore.getCategories()
  );

  const [notifications, setNotifications] = useState(() =>
    mockStore.getNotifications()
  );

  const [logs, setLogs] = useState(() =>
    mockStore.getAuditLogs()
  );

  useEffect(() => {
    setActiveTab(getTab(location.hash));
  }, [location.hash]);

  useEffect(() => {
    const refresh = () => {
      setReviews(mockStore.getReviews());
      setUsers(mockStore.getUsers());
      setReports(mockStore.getReports());
      setCategories(mockStore.getCategories());
      setNotifications(mockStore.getNotifications());
      setLogs(mockStore.getAuditLogs());
    };

    window.addEventListener(
      "matchajob:store-changed",
      refresh
    );
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(
        "matchajob:store-changed",
        refresh
      );
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const handleTabChange = (tab) => {
    const next = VALID_TABS.includes(tab) ? tab : "overview";
    setActiveTab(next);
    navigate({ pathname: location.pathname, search: location.search, hash: `#${next}` });
  };

  const pendingReviewsCount = reviews.filter((review) =>
    ["Chờ duyệt", "Cần kiểm tra", "Chờ xác minh"].includes(
      review.status
    )
  ).length;

  const pendingReportsCount = reports.filter(
    (report) => report.status !== "Đã xử lý"
  ).length;

  const severeReportsCount = reports.filter(
    (report) =>
      report.severity === "Nghiêm trọng" &&
      report.status !== "Đã xử lý"
  ).length;

  const activeJobsCount = mockStore
    .getJobs()
    .filter((job) =>
      mockStore.isJobAcceptingApplications(job)
    ).length;

  const pendingCompanyReviews = reviews.filter(
    (review) =>
      review.type === "company" &&
      ["Chờ xác minh", "Cần kiểm tra"].includes(review.status)
  ).length;

  const pendingJobReviews = reviews.filter(
    (review) =>
      review.type === "job" &&
      ["Chờ duyệt", "Cần kiểm tra"].includes(review.status)
  ).length;

  const highRiskReviews = reviews.filter(
    (review) =>
      review.risk === "Cao" &&
      !["Đã duyệt", "Đã từ chối"].includes(review.status)
  ).length;

  const dynamicAdminData = {
    ...MATCHAJOB_MOCK.admin,
    metrics: [
      {
        label: "Tổng người dùng",
        value: users.length.toLocaleString("vi-VN"),
        change: "Tài khoản trong hệ thống",
        tone: "purple",
        icon: "●"
      },
      {
        label: "Tin đang nhận hồ sơ",
        value: activeJobsCount.toLocaleString("vi-VN"),
        change: "Đã duyệt và chưa hết hạn",
        tone: "green",
        icon: "▣"
      },
      {
        label: "Hồ sơ chờ duyệt",
        value: `${pendingReviewsCount}`,
        change: `${highRiskReviews} rủi ro cao`,
        tone: "orange",
        icon: "◷"
      },
      {
        label: "Báo cáo rủi ro",
        value: `${pendingReportsCount}`,
        change: `${severeReportsCount} nghiêm trọng`,
        tone: "red",
        icon: "!"
      }
    ],
    logs,
    reviews,
    users,
    reports,
    categories,
    notifications,
    alerts: {
      pendingCompanyReviews,
      pendingJobReviews,
      highRiskReviews,
      severeReportsCount
    }
  };

  return (
    <Container fluid className="py-4 px-lg-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h2 className="fw-bold mb-0 fs-3">
              Trung tâm Điều hành Quản trị
            </h2>

            <Badge bg="dark" className="border status-badge-purple">
              <i className="bi bi-shield-fill-check me-1 text-warning" />
              Quản trị hệ thống
            </Badge>
          </div>

          <p className="text-muted small mb-0">
            Giám sát toàn cảnh hệ thống, kiểm duyệt nội dung
            và an ninh vận hành
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Button
            variant="outline-dark"
            size="sm"
            onClick={() => {
              try {
                exportAuditLogs(logs);
                showToast("Đã tạo tệp nhật ký CSV.");
              } catch {
                showToast("Không thể tạo tệp CSV.");
              }
            }}
          >
            <i className="bi bi-file-earmark-arrow-down me-1" />
            Xuất Audit Log
          </Button>

          <Button
            variant="outline-primary"
            size="sm"
            onClick={() =>
              handleTabChange("notifications")
            }
          >
            <i className="bi bi-bell me-1" />
            Thông báo (
            {notifications.filter((item) => item.unread).length}
            )
          </Button>
        </div>
      </div>

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

      {activeTab === "system" && <SystemView />}

      {activeTab === "logs" && <LogsView logs={logs} />}

      {activeTab === "notifications" && (
        <NotificationsView
          notifications={notifications}
          setNotifications={setNotifications}
        />
      )}

      {activeTab === "profile" && <AdminProfileView />}
    </Container>
  );
}