import { useState } from "react";
import { CandidateLayout, Empty } from "../../components/candidate/CandidateUI";
import { useFavorites } from "../../context/FavoritesContext";
import { useCandidateData } from "../../hooks/useCandidateData";
import { getPublicJobs, isJobOpen } from "../../services/candidateService";
import JobCard from "../../components/jobs/JobCard";
export default function SavedJobsPage() {
  const { favorites } = useFavorites();
  const jobs = useCandidateData(getPublicJobs);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const saved = jobs.filter((j) => favorites.includes(j.id));
  const visible = saved.filter((j) => !onlyOpen || isJobOpen(j));
  return (
    <CandidateLayout
      title="Việc làm đã lưu"
      subtitle="Giữ lại những cơ hội bạn muốn cân nhắc."
    >
      <div className="d-flex justify-content-between gap-2 flex-wrap mb-3">
        <strong>{saved.length} công việc đã lưu</strong>
        <label className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />{" "}
          Chỉ hiện tin đang tuyển
        </label>
      </div>
      {visible.length ? (
        <div className="row g-3">
          {visible.map((job) => (
            <div className="col-lg-6" key={job.id}>
              <JobCard job={job} />
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title={
            saved.length
              ? "Không có tin đang tuyển trong danh sách"
              : "Bạn chưa lưu công việc nào"
          }
          text="Nhấn biểu tượng trái tim ở tin tuyển dụng để xem lại tại đây."
          to="/jobs"
          action="Khám phá việc làm"
        />
      )}
    </CandidateLayout>
  );
}
