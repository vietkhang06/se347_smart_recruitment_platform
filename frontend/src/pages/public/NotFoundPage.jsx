import { Link } from "react-router-dom";
export default function NotFoundPage() {
  return <section className="container py-5 text-center">
    <h1>404 — Không tìm thấy trang</h1>
    <p>Kiểm tra lại đường dẫn hoặc quay về trang chủ.</p>
    <Link to="/" className="btn btn-success">Về trang chủ</Link>
  </section>;
}
