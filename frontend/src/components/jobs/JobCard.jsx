import { Link } from "react-router-dom";
import { useFavorites } from "../../context/FavoritesContext";
import { isJobOpen } from "../../services/candidateService";
import "../../styles/candidate.css";
export default function JobCard({ job }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(job.id);
  const open = isJobOpen(job);
  return (
    <article className="candidate-panel candidate-job-card h-100 mb-0 d-flex flex-column">
      <div className="d-flex gap-3 align-items-start mb-3">
        <div
          className="candidate-avatar"
          style={{ width: 48, height: 48, fontSize: "1rem", borderRadius: 12 }}
        >
          {job.logo || "CT"}
        </div>
        <div className="flex-grow-1">
          <Link className="candidate-job-title" to={`/jobs/${job.id}`}>
            {job.title}
          </Link>
          <div className="text-muted small mt-1">{job.company}</div>
        </div>
        <button
          type="button"
          className={`btn btn-sm ${saved ? "btn-success" : "btn-outline-secondary"}`}
          aria-label={`${saved ? "Bỏ lưu" : "Lưu"} ${job.title}`}
          aria-pressed={saved}
          onClick={() => toggleFavorite(job.id)}
        >
          <i className={`bi bi-heart${saved ? "-fill" : ""}`} />
        </button>
      </div>
      <strong className="text-success mb-3">
        {job.salary || "Thỏa thuận"}
      </strong>
      <div className="candidate-tags mb-3">
        <span>
          <i className="bi bi-geo-alt" /> {job.location}
        </span>
        <span>{job.type}</span>
        {job.exp && <span>{job.exp}</span>}
      </div>
      <p className="text-muted small flex-grow-1">{job.desc}</p>
      <div className="border-top pt-3 d-flex justify-content-between gap-2 small">
        <span className="text-muted">
          Hạn: {job.deadline || "Chưa công bố"}
        </span>
        <span className={open ? "text-success" : "text-muted"}>
          {open ? "Đang nhận hồ sơ" : "Ngừng nhận hồ sơ"}
        </span>
      </div>
    </article>
  );
}
