import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useFavorites } from "../../context/FavoritesContext";
import { MATCHAJOB_DATA } from "../../services/data";
import JobCard from "../../components/jobs/JobCard";

export default function SavedJobsPage() {
  const { favorites } = useFavorites();

  const savedJobs = MATCHAJOB_DATA.jobs.filter(j => favorites.includes(j.id));

  return (
    <Container className="py-5">
      <div className="mb-4">
        <h1 className="fw-bold mb-1">Cơ hội việc làm đã lưu</h1>
        <p className="text-muted">Theo dõi các vị trí tuyển dụng bạn đang quan tâm ({savedJobs.length} vị trí)</p>
      </div>

      {savedJobs.length === 0 ? (
        <Card className="matcha-card p-5 text-center border-0 shadow-sm" data-aos="zoom-in">
          <div className="fs-1 text-danger mb-2"><i className="bi bi-heart"></i></div>
          <h4 className="fw-bold">Bạn chưa lưu công việc nào</h4>
          <p className="text-muted small">Hãy bấm biểu tượng trái tim tại các tin tuyển dụng để xem lại tại đây bất kỳ lúc nào.</p>
          <div>
            <Button as={Link} to="/jobs" variant="success">
              Khám phá việc làm ngay
            </Button>
          </div>
        </Card>
      ) : (
        <Row className="g-4">
          {savedJobs.map((job, idx) => (
            <Col lg={6} key={job.id}>
              <JobCard job={job} aosDelay={idx * 80} />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}
