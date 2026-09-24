import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import { MATCHAJOB_MOCK } from "../../services/mockData";
import { useToast } from "../../context/ToastContext";

// Modular Views
import OverviewView from "./views/OverviewView";
import JobsView from "./views/JobsView";
import CandidatesView from "./views/CandidatesView";
import PipelineView from "./views/PipelineView";
import InterviewsView from "./views/InterviewsView";
import AnalyticsView from "./views/AnalyticsView";
import CompanyView from "./views/CompanyView";
import BillingView from "./views/BillingView";
import ProfileView from "./views/ProfileView";

// Modals
import JobComposerModal from "./components/JobComposerModal";
import CandidateDetailModal from "./components/CandidateDetailModal";
import InterviewModal from "./components/InterviewModal";

export default function EmployerPortal() {
  const { showToast } = useToast();
  const location = useLocation();

  // Tab state synced with URL hash
  const getInitialTab = () => {
    const hash = window.location.hash.replace("#", "");
    const validTabs = ["overview", "jobs", "candidates", "pipeline", "interviews", "analytics", "company", "billing", "profile"];
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

  // State for data
  const employerData = MATCHAJOB_MOCK.employer;
  const [jobs, setJobs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("matchajob-employer-posts") || "null");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch (e) {}
    return employerData.jobs;
  });

  const [candidates, setCandidates] = useState(employerData.candidates);
  const [interviews, setInterviews] = useState(employerData.interviews);

  // Modals state
  const [showComposer, setShowComposer] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState(null);

  // Handle open candidate details
  const handleOpenCandidate = (candidate) => {
    setSelectedCandidate(candidate);
    setShowCandidateModal(true);
  };

  // Handle open interview modal with candidate prefilled
  const handleInviteCandidate = (candidate) => {
    setInterviewCandidate(candidate);
    setShowInterviewModal(true);
  };

  // Handle job created
  const handleJobCreated = (newJob) => {
    setJobs([newJob, ...jobs]);
    setActiveTab("jobs");
    window.location.hash = "jobs";
  };

  // Handle interview created
  const handleInterviewCreated = (newInterview) => {
    setInterviews([newInterview, ...interviews]);
    setActiveTab("interviews");
    window.location.hash = "interviews";
  };

  return (
    <Container fluid className="py-4 px-lg-5">
      {/* Portal Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h2 className="fw-bold mb-0 fs-3">{employerData.company.name}</h2>
            <Badge bg="success" className="bg-opacity-10 text-success border">
              <i className="bi bi-patch-check-fill me-1"></i>Doanh nghiệp đã xác minh
            </Badge>
          </div>
          <p className="text-muted small mb-0">Trung tâm quản lý tuyển dụng & nhân tài thông minh</p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => showToast("Báo cáo hiệu suất đã được tạo và gửi về email HR")}
          >
            <i className="bi bi-download me-1"></i>Xuất báo cáo
          </Button>
          <Button
            variant="success"
            size="sm"
            className="fw-bold"
            onClick={() => setShowComposer(true)}
          >
            <i className="bi bi-plus-lg me-1"></i>Tạo tin tuyển dụng
          </Button>
        </div>
      </div>

      {/* Portal Navigation Tabs (9 Sub-views) */}
      <Nav
        variant="pills"
        className="mb-4 gap-2 border-bottom pb-3 flex-nowrap overflow-auto"
        activeKey={activeTab}
      >
        <Nav.Item>
          <Nav.Link eventKey="overview" onClick={() => handleTabChange("overview")} className="fw-medium text-nowrap">
            <i className="bi bi-speedometer2 me-1"></i>Tổng quan
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="jobs" onClick={() => handleTabChange("jobs")} className="fw-medium text-nowrap">
            <i className="bi bi-briefcase me-1"></i>Tin tuyển dụng ({jobs.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="candidates" onClick={() => handleTabChange("candidates")} className="fw-medium text-nowrap">
            <i className="bi bi-people me-1"></i>Kho ứng viên ({candidates.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="pipeline" onClick={() => handleTabChange("pipeline")} className="fw-medium text-nowrap">
            <i className="bi bi-kanban me-1"></i>Quy trình (Kanban)
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="interviews" onClick={() => handleTabChange("interviews")} className="fw-medium text-nowrap">
            <i className="bi bi-calendar-event me-1"></i>Phỏng vấn ({interviews.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="analytics" onClick={() => handleTabChange("analytics")} className="fw-medium text-nowrap">
            <i className="bi bi-bar-chart-fill me-1"></i>Phân tích HR
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="company" onClick={() => handleTabChange("company")} className="fw-medium text-nowrap">
            <i className="bi bi-building me-1"></i>Doanh nghiệp
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="billing" onClick={() => handleTabChange("billing")} className="fw-medium text-nowrap">
            <i className="bi bi-credit-card me-1"></i>Dịch vụ & Gói
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="profile" onClick={() => handleTabChange("profile")} className="fw-medium text-nowrap">
            <i className="bi bi-person-circle me-1"></i>Hồ sơ HR
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* 9 SUB-VIEWS RENDERED CONDITIONALLY */}
      {activeTab === "overview" && (
        <OverviewView
          employerData={{ ...employerData, interviews, candidates }}
          onOpenComposer={() => setShowComposer(true)}
          onOpenCandidate={handleOpenCandidate}
          onNavigateTab={handleTabChange}
        />
      )}

      {activeTab === "jobs" && (
        <JobsView
          jobs={jobs}
          setJobs={setJobs}
          onOpenComposer={() => setShowComposer(true)}
        />
      )}

      {activeTab === "candidates" && (
        <CandidatesView
          candidates={candidates}
          onOpenCandidate={handleOpenCandidate}
          onInviteCandidate={handleInviteCandidate}
        />
      )}

      {activeTab === "pipeline" && (
        <PipelineView
          candidates={candidates}
          setCandidates={setCandidates}
          onOpenCandidate={handleOpenCandidate}
        />
      )}

      {activeTab === "interviews" && (
        <InterviewsView
          interviews={interviews}
          setInterviews={setInterviews}
          onOpenInterviewModal={() => {
            setInterviewCandidate(null);
            setShowInterviewModal(true);
          }}
        />
      )}

      {activeTab === "analytics" && (
        <AnalyticsView employerData={employerData} />
      )}

      {activeTab === "company" && (
        <CompanyView companyData={employerData.company} />
      )}

      {activeTab === "billing" && (
        <BillingView plans={employerData.plans} />
      )}

      {activeTab === "profile" && (
        <ProfileView />
      )}

      {/* MODALS */}
      <JobComposerModal
        show={showComposer}
        onHide={() => setShowComposer(false)}
        onJobCreated={handleJobCreated}
      />

      <CandidateDetailModal
        candidate={selectedCandidate}
        show={showCandidateModal}
        onHide={() => setShowCandidateModal(false)}
        onInviteInterview={(c) => {
          setShowCandidateModal(false);
          handleInviteCandidate(c);
        }}
      />

      <InterviewModal
        show={showInterviewModal}
        onHide={() => setShowInterviewModal(false)}
        candidates={candidates}
        defaultCandidate={interviewCandidate}
        onScheduleCreated={handleInterviewCreated}
      />
    </Container>
  );
}
