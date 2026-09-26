import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import { useToast } from "../../context/ToastContext";
import { mockStore } from "../../services/mockStore";

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

  // State managed via unified mockStore
  const [company, setCompany] = useState(() => mockStore.getCompany("COMP-01"));
  const [jobs, setJobs] = useState(() => mockStore.getEmployerJobs("COMP-01"));
  const [candidates, setCandidates] = useState(() => mockStore.getCandidates());
  const [interviews, setInterviews] = useState(() => mockStore.getInterviews());
  const [plans, setPlans] = useState(() => mockStore.getPlans());

  // Reload data from store
  const refreshStoreData = useCallback(() => {
    setCompany(mockStore.getCompany("COMP-01"));
    setJobs(mockStore.getEmployerJobs("COMP-01"));
    setCandidates(mockStore.getCandidates());
    setInterviews(mockStore.getInterviews());
    setPlans(mockStore.getPlans());
  }, []);

  // Listen to store changes from any component/tab
  useEffect(() => {
    const handleStoreChange = () => {
      refreshStoreData();
    };
    window.addEventListener("matchajob:store-changed", handleStoreChange);
    return () => {
      window.removeEventListener("matchajob:store-changed", handleStoreChange);
    };
  }, [refreshStoreData]);

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

  // Candidate stage transition
  const handleCandidateStageChange = (candidateId, nextStage) => {
    mockStore.updateCandidateStage(candidateId, nextStage);
    const updated = mockStore.getCandidates();
    setCandidates(updated);
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      setSelectedCandidate({ ...selectedCandidate, stage: nextStage });
    }
  };

  // Candidate reject
  const handleCandidateReject = (candidateId, reason) => {
    mockStore.rejectCandidate(candidateId, reason);
    const updated = mockStore.getCandidates();
    setCandidates(updated);
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      setSelectedCandidate({ ...selectedCandidate, stage: "Đã từ chối" });
    }
  };

  // Handle job created
  const handleJobCreated = (newJob) => {
    setJobs(mockStore.getEmployerJobs("COMP-01"));
    setActiveTab("jobs");
    window.location.hash = "jobs";
  };

  // Handle interview created
  const handleInterviewCreated = (newInterview) => {
    setInterviews(mockStore.getInterviews());
    setActiveTab("interviews");
    window.location.hash = "interviews";
  };

  // Metrics calculation
  const activeJobsCount = jobs.filter((j) => j.status === "Đang tuyển").length;
  const newCandidatesCount = candidates.filter((c) => c.stage === "Mới" || c.stage === "Sàng lọc").length;

  return (
    <Container fluid className="py-4 px-lg-5">


      {/* Portal Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h2 className="fw-bold mb-0 fs-3">{company.name}</h2>
            {company.verified && (
              <Badge bg="success" className="bg-opacity-10 text-success border">
                <i className="bi bi-patch-check-fill me-1"></i>Doanh nghiệp đã xác minh
              </Badge>
            )}
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

      {/* 9 SUB-VIEWS RENDERED CONDITIONALLY */}
      {activeTab === "overview" && (
        <OverviewView
          employerData={{
            company,
            metrics: [
              { label: "Tin đang tuyển", value: String(activeJobsCount), change: `Tổng ${jobs.length} tin`, tone: "green", icon: "▣" },
              { label: "Ứng viên tiếp nhận", value: String(candidates.length), change: `${newCandidatesCount} mới cần duyệt`, tone: "purple", icon: "●" },
              { label: "Lịch phỏng vấn", value: String(interviews.length), change: `${interviews.filter(iv => iv.status === "Sắp diễn ra").length} sắp diễn ra`, tone: "orange", icon: "◷" },
              { label: "Tỷ lệ phản hồi", value: "94%", change: "+4,2% tuần này", tone: "teal", icon: "↗" }
            ],
            interviews,
            candidates,
            activity: [
              { time: "09:14", text: "Nguyễn An Khang đã xác nhận lịch phỏng vấn", tone: "green" },
              { time: "Hôm qua", text: "Tin Senior Product Designer có 8 hồ sơ mới", tone: "purple" },
              { time: "18/09", text: "Lê Quốc Huy đã hoàn tất bài test kỹ thuật", tone: "teal" }
            ],
            weeklyPerformance: {
              labels: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"],
              applications: [24, 38, 31, 52, 45, 68, 56],
              views: [110, 145, 132, 210, 185, 290, 240]
            }
          }}
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
          onNavigateCandidates={(job) => {
            setActiveTab("pipeline");
            window.location.hash = "pipeline";
          }}
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
          onInviteCandidate={handleInviteCandidate}
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
        <AnalyticsView employerData={{ company, jobs, candidates, interviews, weeklyPerformance: { labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], applications: [24, 38, 31, 52, 45, 68, 56], views: [110, 145, 132, 210, 185, 290, 240] }, funnel: { labels: ["Ứng tuyển", "Sàng lọc", "Bài test", "Phỏng vấn", "Nhận Offer"], counts: [candidates.length, 4, 3, 2, 1] }, sources: { labels: ["MatchaJob", "LinkedIn", "Nội bộ giới thiệu", "Facebook", "Khác"], data: [48, 26, 14, 8, 4] } }} />
      )}

      {activeTab === "company" && (
        <CompanyView
          companyData={company}
          onCompanyUpdated={(updated) => setCompany(updated)}
        />
      )}

      {activeTab === "billing" && (
        <BillingView plans={plans} activeJobsCount={activeJobsCount} />
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
        onStageChange={handleCandidateStageChange}
        onRejectCandidate={handleCandidateReject}
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
