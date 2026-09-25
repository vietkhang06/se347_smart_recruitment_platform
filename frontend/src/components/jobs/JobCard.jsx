import { Link } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import { useFavorites } from "../../context/FavoritesContext";

export default function JobCard({ job, aosDelay = 0 }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(job.id);

  return (
    <Card 
      className="matcha-card h-100 p-3 position-relative" 
      data-aos="fade-up" 
      data-aos-delay={aosDelay}
    >
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div className="d-flex align-items-center gap-3">
          <div 
            className="rounded-3 d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
            style={{ 
              width: "48px", 
              height: "48px", 
              backgroundColor: job.id % 2 === 0 ? "var(--primary)" : "#1e40af",
              fontSize: "1.1rem" 
            }}
          >
            {job.logo}
          </div>
          <div>
            <h5 className="card-title mb-1 fw-bold fs-6">
              <Link to={`/jobs/${job.id}`} className="text-decoration-none text-body stretched-link">
                {job.title}
              </Link>
            </h5>
            <div className="text-muted small">{job.company}</div>
          </div>
        </div>

        <button 
          className={`btn-fav ${fav ? "active" : ""}`} 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(job.id);
          }}
          title={fav ? "Bỏ lưu" : "Lưu việc làm"}
          style={{ zIndex: 2 }}
        >
          <i className={`bi ${fav ? "bi-heart-fill text-danger" : "bi-heart"}`}></i>
        </button>
      </div>

      <div className="d-flex flex-wrap gap-2 my-2">
        <span className="badge-matcha">{job.salary}</span>
        <Badge bg="secondary" className="bg-opacity-10 text-body border">{job.location}</Badge>
        <Badge bg="secondary" className="bg-opacity-10 text-body border">{job.type}</Badge>
        <Badge bg="secondary" className="bg-opacity-10 text-body border">{job.exp}</Badge>
      </div>

      <p className="text-muted small my-2 line-clamp-2" style={{ maxHeight: "40px", overflow: "hidden" }}>
        {job.desc || "Cơ hội phát triển nghề nghiệp rộng mở với chế độ đãi ngộ cạnh tranh."}
      </p>

      <div className="d-flex justify-content-between align-items-center pt-2 mt-auto border-top">
        <span className="small text-muted">
          <i className="bi bi-clock me-1"></i>{job.posted}
        </span>
        <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-1">
          <i className="bi bi-stars me-1"></i>{job.match}% Phù hợp
        </span>
      </div>
    </Card>
  );
}
