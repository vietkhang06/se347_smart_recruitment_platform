import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import { IS_API } from "../../services/dataMode";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { mockStore } from "../../services/mockStore";
import { companyService, jobService, interviewService, applicationService } from "../../services";

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

function exportCandidatesCSV(candidates) {
  const cell = value => {
    let text = String(value ?? "");
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [
    ["Mã hồ sơ", "Họ tên", "Vị trí", "Email", "Điện thoại", "Giai đoạn"],
    ...candidates.map(c => [c.id, c.name || c.candidateName, c.appliedJobTitle || c.role || c.candidateRole,
      c.email || c.candidateEmail, c.phone || c.candidatePhone, c.stage || "Mới"])
  ];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "matchajob-candidates.csv";
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EmployerPortal() {
  const { user } = useAuth();
  let companyId = user?.companyId || "";
  let error = "";
  if (!IS_API) {
    try { companyId = mockStore.getHRCompanyId(); }
    catch (err) { error = err.message; }
  }
  if (!user || !["employer", "Nhà tuyển dụng"].includes(user.role) || !companyId || error) {
    return <Container className="py-5">
      <div className="alert alert-warning">{error || "Tài khoản HR chưa liên kết với doanh nghiệp hợp lệ."}</div>
      <Link to="/login?role=employer">Đến trang đăng nhập</Link>
    </Container>;
  }
  return <EmployerWorkspace key={`${user.id || user.email}:${companyId}`} companyId={companyId} />;
}

function EmployerWorkspace({ companyId }) {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const getTab = hash => {
    const tab = String(hash || "").replace("#", "");
    return ["overview", "jobs", "candidates", "pipeline", "interviews", "analytics", "company", "billing", "profile"].includes(tab) ? tab : "overview";
  };
  const getInitialTab = () => getTab(location.hash);

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    setActiveTab(getTab(hash));
  }, [location.hash]);

  const handleTabChange = tabKey => {
    const next = getTab(tabKey);
    setActiveTab(next);
    navigate({ pathname: location.pathname, search: location.search, hash: `#${next}` });
  };

  const [company, setCompany] = useState(
    () => IS_API ? null : mockStore.getCompanies().find(item => String(item.id) === String(companyId)) || null
  );

  const [jobs, setJobs] = useState(
    () => IS_API ? [] : mockStore.getEmployerJobs(companyId)
  );

  const [candidates, setCandidates] = useState(
    () => IS_API ? [] : mockStore.getCandidates()
  );

  const [interviews, setInterviews] = useState(
    () => IS_API ? [] : mockStore.getInterviews()
  );

  const [plans, setPlans] = useState(
    () => mockStore.getPlans()
  );

  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const refreshStoreData = useCallback(async () => {
    setLoadError("");
    const results = await Promise.allSettled([
      companyService.getCompany(companyId),
      jobService.getEmployerJobs(companyId),
      applicationService.getApplications(companyId),
      interviewService.getInterviews(companyId)
    ]);
    const setters = [setCompany, setJobs, setCandidates, setInterviews];
    const labels = ["doanh nghiệp", "tin tuyển dụng", "ứng viên", "lịch phỏng vấn"];
    const errors = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && (index === 0 ? result.value?.name : Array.isArray(result.value))) {
        setters[index](result.value);
      } else {
        if (index === 2) setCandidates([]);
        errors.push(`Không tải được ${labels[index]}: ${result.status === "rejected" ? result.reason?.message || "Lỗi tải dữ liệu" : "Dữ liệu không hợp lệ"}`);
      }
    });
    setPlans(mockStore.getPlans());
    setLoadError(errors.join(". "));
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    refreshStoreData();
  }, [refreshStoreData]);

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
  const [composerMode, setComposerMode] = useState("create");
  const [composerJobToEdit, setComposerJobToEdit] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState(null);

  const handleOpenCreateJob = () => {
    setComposerMode("create");
    setComposerJobToEdit(null);
    setShowComposer(true);
  };

  const handleOpenEditJob = (job) => {
    setComposerMode("edit");
    setComposerJobToEdit(job);
    setShowComposer(true);
  };

  const handleOpenCandidate = candidate => {
    setSelectedCandidate(candidate);
    setShowCandidateModal(true);
  };

  const handleInviteCandidate = candidate => {
    const current = candidate || mockStore.getCandidateById(candidate?.id);
    if (!current || current.withdrawnAt || /đã rút|từ chối|không phù hợp/i.test(current.stage || "")) {
      showToast("Hồ sơ không còn ở trạng thái cho phép mời phỏng vấn.", "danger");
      return;
    }
    setInterviewCandidate(current);
    setShowInterviewModal(true);
  };

  const handleCandidateStageChange = async (candidateId, nextStage) => {
    try {
      await applicationService.updateApplicationStage(candidateId, nextStage);
      await refreshStoreData();
      setSelectedCandidate(current => current && String(current.id) === String(candidateId)
        ? { ...current, stage: nextStage } : current);
      showToast(`Đã chuyển ứng viên sang giai đoạn: ${nextStage}`);
    } catch (err) {
      showToast(err?.message || "Không thể chuyển giai đoạn ứng viên.", "danger");
      throw err;
    }
  };

  const handleCandidateReject = async (candidateId, reason) => {
    try {
      await applicationService.updateApplicationStage(candidateId, "Từ chối", reason);
      await refreshStoreData();
      setSelectedCandidate(current => current && String(current.id) === String(candidateId)
        ? { ...current, stage: "Từ chối", rejectReason: reason } : current);
      showToast("Đã lưu lý do từ chối ứng viên.");
    } catch (err) {
      showToast(err?.message || "Không thể từ chối hồ sơ.", "danger");
      throw err;
    }
  };

  const handleJobCreated = () => {
    refreshStoreData();
    handleTabChange("jobs");
  };

  const handleJobUpdated = () => {
    refreshStoreData();
  };

  const handleInterviewCreated = () => {
    refreshStoreData();
    handleTabChange("interviews");
  };

  const activeJobsCount = jobs.filter(
    job => mockStore.isJobAcceptingApplications(job)
  ).length;

  const newCandidatesCount = candidates.filter(
    candidate =>
      candidate.stage === "Mới" ||
      candidate.stage === "Sàng lọc"
  ).length;

  if (!company) return <Container className="py-5">
    <div className={loading ? "text-muted" : "alert alert-warning"} role={loading ? "status" : "alert"}>
      {loading ? "Đang tải doanh nghiệp…" : loadError || "Không tìm thấy doanh nghiệp của tài khoản."}
    </div>
    {!loading && <Button variant="outline-success" onClick={refreshStoreData}>Thử lại</Button>}
  </Container>;

  return (
    <Container fluid className="py-4 px-lg-5">
      {loadError && <div className="alert alert-warning" role="alert">{loadError} <Button size="sm" variant="outline-dark" onClick={refreshStoreData}>Thử lại</Button></div>}
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
            onClick={() => {
              try { exportCandidatesCSV(candidates); showToast("Đã tạo tệp CSV ứng viên."); }
              catch (err) { showToast(err.message || "Không thể tạo tệp CSV.", "danger"); }
            }}
          >
            <i className="bi bi-download me-1" />
            Xuất danh sách ứng viên
          </Button>

          <Button
            variant="success"
            size="sm"
            className="fw-bold"
            onClick={handleOpenCreateJob}
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
          onOpenComposer={handleOpenCreateJob}
          onOpenCandidate={handleOpenCandidate}
          onNavigateTab={handleTabChange}
        />
      )}

      {activeTab === "jobs" && (
        <JobsView
          jobs={jobs}
          setJobs={setJobs}
          onOpenComposer={handleOpenCreateJob}
          onEditJob={handleOpenEditJob}
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
          onStageChange={handleCandidateStageChange}
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
        <>
        <div className="alert alert-info small">Biểu đồ hiệu suất và nguồn ứng viên đang sử dụng dữ liệu minh họa.</div>
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
        </>
      )}

      {activeTab === "company" && (
        <CompanyView
          companyData={company}
          onCompanyUpdated={updated => { if (updated?.name) setCompany(updated); refreshStoreData(); }}
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
        onHide={() => {
          setShowComposer(false);
          setComposerJobToEdit(null);
        }}
        mode={composerMode}
        jobToEdit={composerJobToEdit}
        onJobCreated={handleJobCreated}
        onJobUpdated={handleJobUpdated}
        onNavigateProfile={() => {
          setShowComposer(false);
          setComposerJobToEdit(null);
          handleTabChange("profile");
        }}
      />

      <CandidateDetailModal
        onMatchingCompleted={result => {
          const patch = item => String(item.applicationId || item.id) === result.applicationId
            ? { ...item, match: result.overallScore, matchScore: result.overallScore, skillsScore: result.skillsScore, experienceScore: result.experienceScore, matchRationale: result.explanation }
            : item;
          setCandidates(items => items.map(patch));
          setSelectedCandidate(item => item ? patch(item) : item);
        }}
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