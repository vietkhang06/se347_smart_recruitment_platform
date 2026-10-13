import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { mockStore } from "../../services/mockStore";

import OverviewView from "./views/OverviewView";
import JobsView from "./views/JobsView";
import CandidatesView from "./views/CandidatesView";
import PipelineView from "./views/PipelineView";
import InterviewsView from "./views/InterviewsView";
import AnalyticsView from "./views/AnalyticsView";
import CompanyView from "./views/CompanyView";
import BillingView from "./views/BillingView";
import ProfileView from "./views/ProfileView";

import JobComposerModal from "./components/JobComposerModal";
import CandidateDetailModal from "./components/CandidateDetailModal";
import InterviewModal from "./components/InterviewModal";

export default function EmployerPortal() {
  const { user } = useAuth();

  let companyId = "";
  let error = "";

  try {
    companyId = mockStore.getHRCompanyId();
  } catch (err) {
    error = err.message;
  }

  if (error || user?.role !== "employer") {
    return (
      <Container className="py-5">
        <div className="alert alert-warning">
          {error || "Đăng nhập bằng tài khoản HR."}
        </div>
        <Link to="/login">Đến trang đăng nhập</Link>
      </Container>
    );
  }

  return (
    <EmployerWorkspace
      key={`${user.email}:${companyId}`}
      companyId={companyId}
    />
  );
}

function EmployerWorkspace({ companyId }) {
  const { showToast } = useToast();
  const location = useLocation();

  const getInitialTab = () => {
    const hash = window.location.hash.replace("#", "");

    const validTabs = [
      "overview", "jobs", "candidates", "pipeline",
      "interviews", "analytics", "company",
      "billing", "profile"
    ];

    return validTabs.includes(hash) ? hash : "overview";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) setActiveTab(hash);
  }, [location.hash]);

  const handleTabChange = tabKey => {
    setActiveTab(tabKey);
    window.location.hash = tabKey;
  };

  const [company, setCompany] = useState(
    () => mockStore.getCompany(companyId)
  );

  const [jobs, setJobs] = useState(
    () => mockStore.getEmployerJobs(companyId)
  );

  const [candidates, setCandidates] = useState(
    () => mockStore.getCandidates()
  );

  const [interviews, setInterviews] = useState(
    () => mockStore.getInterviews()
  );

  const [plans, setPlans] = useState(
    () => mockStore.getPlans()
  );

  const refreshStoreData = useCallback(() => {
    setCompany(mockStore.getCompany(companyId));
    setJobs(mockStore.getEmployerJobs(companyId));
    setCandidates(mockStore.getCandidates());
    setInterviews(mockStore.getInterviews());
    setPlans(mockStore.getPlans());
  }, [companyId]);

  useEffect(() => {
    const handleStoreChange = () => refreshStoreData();

    window.addEventListener(
      "matchajob:store-changed",
      handleStoreChange
    );
    window.addEventListener("storage", handleStoreChange);

    return () => {
      window.removeEventListener(
        "matchajob:store-changed",
        handleStoreChange
      );
      window.removeEventListener(
        "storage",
        handleStoreChange
      );
    };
  }, [refreshStoreData]);

  const [showComposer, setShowComposer] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState(null);

  const handleOpenCandidate = candidate => {
    setSelectedCandidate(candidate);
    setShowCandidateModal(true);
  };

  const handleInviteCandidate = candidate => {
    setInterviewCandidate(candidate);
    setShowInterviewModal(true);
  };

  const handleCandidateStageChange = (candidateId, nextStage) => {
    mockStore.updateCandidateStage(candidateId, nextStage);
    setCandidates(mockStore.getCandidates());

    if (
      selectedCandidate &&
      selectedCandidate.id === candidateId
    ) {
      setSelectedCandidate({
        ...selectedCandidate,
        stage: nextStage
      });
    }
  };

  const handleCandidateReject = (candidateId, reason) => {
    mockStore.rejectCandidate(candidateId, reason);
    setCandidates(mockStore.getCandidates());

    if (
      selectedCandidate &&
      selectedCandidate.id === candidateId
    ) {
      setSelectedCandidate({
        ...selectedCandidate,
        stage: "Đã từ chối"
      });
    }
  };

  const handleJobCreated = () => {
    setJobs(mockStore.getEmployerJobs(companyId));
    handleTabChange("jobs");
  };

  const handleInterviewCreated = () => {
    setInterviews(mockStore.getInterviews());
    handleTabChange("interviews");
  };

  const activeJobsCount = jobs.filter(
    job => job.status === "Đang tuyển"
  ).length;

  const newCandidatesCount = candidates.filter(
    candidate =>
      candidate.stage === "Mới" ||
      candidate.stage === "Sàng lọc"
  ).length;

  return (
    <Container fluid className="py-4 px-lg-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h2 className="fw-bold mb-0 fs-3">{company.name}</h2>

            {company.verified && (
              <Badge
                bg="success"
                className="bg-opacity-10 text-success border"
              >
                <i className="bi bi-patch-check-fill me-1" />
                Doanh nghiệp đã xác minh
              </Badge>
            )}
          </div>

          <p className="text-muted small mb-0">
            Trung tâm quản lý tuyển dụng & nhân tài thông minh
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Button
            variant="outline-success"
            size="sm"
            onClick={() =>
              showToast(
                "Báo cáo hiệu suất đã được tạo và gửi về email HR"
              )
            }
          >
            <i className="bi bi-download me-1" />
            Xuất báo cáo
          </Button>

          <Button
            variant="success"
            size="sm"
            className="fw-bold"
            onClick={() => setShowComposer(true)}
          >
            <i className="bi bi-plus-lg me-1" />
            Tạo tin tuyển dụng
          </Button>
        </div>
      </div>

      {activeTab === "overview" && (
        <OverviewView
          employerData={{
            company,
            metrics: [
              {
                label: "Tin đang tuyển",
                value: String(activeJobsCount),
                change: `Tổng ${jobs.length} tin`,
                tone: "green",
                icon: "▣"
              },
              {
                label: "Ứng viên tiếp nhận",
                value: String(candidates.length),
                change: `${newCandidatesCount} mới cần duyệt`,
                tone: "purple",
                icon: "●"
              },
              {
                label: "Lịch phỏng vấn",
                value: String(interviews.length),
                change: `${
                  interviews.filter(
                    item => item.status === "Sắp diễn ra"
                  ).length
                } sắp diễn ra`,
                tone: "orange",
                icon: "◷"
              },
              {
                label: "Tỷ lệ phản hồi",
                value: "94%",
                change: "+4,2% tuần này",
                tone: "teal",
                icon: "↗"
              }
            ],
            interviews,
            candidates,
            activity: [
              {
                time: "09:14",
                text: "Nguyễn An Khang đã xác nhận lịch phỏng vấn",
                tone: "green"
              },
              {
                time: "Hôm qua",
                text: "Tin Senior Product Designer có 8 hồ sơ mới",
                tone: "purple"
              },
              {
                time: "18/09",
                text: "Lê Quốc Huy đã hoàn tất bài test kỹ thuật",
                tone: "teal"
              }
            ],
            weeklyPerformance: {
              labels: [
                "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5",
                "Thứ 6", "Thứ 7", "Chủ nhật"
              ],
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
          onNavigateCandidates={() =>
            handleTabChange("pipeline")
          }
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
        <AnalyticsView
          employerData={{
            company,
            jobs,
            candidates,
            interviews,
            weeklyPerformance: {
              labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
              applications: [24, 38, 31, 52, 45, 68, 56],
              views: [110, 145, 132, 210, 185, 290, 240]
            },
            funnel: {
              labels: [
                "Ứng tuyển", "Sàng lọc", "Bài test",
                "Phỏng vấn", "Nhận Offer"
              ],
              counts: [candidates.length, 4, 3, 2, 1]
            },
            sources: {
              labels: [
                "MatchaJob", "LinkedIn", "Nội bộ giới thiệu",
                "Facebook", "Khác"
              ],
              data: [48, 26, 14, 8, 4]
            }
          }}
        />
      )}

      {activeTab === "company" && (
        <CompanyView
          companyData={company}
          onCompanyUpdated={updated => setCompany(updated)}
        />
      )}

      {activeTab === "billing" && (
        <BillingView
          plans={plans}
          activeJobsCount={activeJobsCount}
        />
      )}

      {activeTab === "profile" && <ProfileView />}

      <JobComposerModal
        show={showComposer}
        onHide={() => setShowComposer(false)}
        onJobCreated={handleJobCreated}
        onNavigateProfile={() => {
          setShowComposer(false);
          handleTabChange("profile");
        }}
      />

      <CandidateDetailModal
        candidate={selectedCandidate}
        show={showCandidateModal}
        onHide={() => setShowCandidateModal(false)}
        onInviteInterview={candidate => {
          setShowCandidateModal(false);
          handleInviteCandidate(candidate);
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