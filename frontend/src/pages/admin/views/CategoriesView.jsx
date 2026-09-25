import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import CategoryModal from "../components/CategoryModal";
import { useToast } from "../../../context/ToastContext";

export default function CategoriesView({ categories, setCategories }) {
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);

  const topSkills = [
    "JavaScript",
    "React",
    "Giao tiếp & Đàm phán",
    "SQL & Database",
    "Figma & UI/UX",
    "Tiếng Anh Thương mại",
    "Quản lý dự án Agile/Scrum",
    "Digital Marketing & SEO",
    "Python & AI",
    "Bán hàng B2B"
  ];

  const handleCreateCategory = (newCat) => {
    setCategories([...categories, newCat]);
    showToast(`Đã thêm danh mục mới: ${newCat.name}`);
  };

  const toggleCategoryStatus = (idx) => {
    setCategories(
      categories.map((c, i) => {
        if (i === idx) {
          const nextStatus = c.status === "Hiển thị" ? "Nháp" : "Hiển thị";
          showToast(`Đã chuyển danh mục ${c.name} sang: ${nextStatus}`);
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Danh mục ngành nghề & Kỹ năng hệ thống</h5>
          <p className="text-muted small mb-0">Quản lý cấu trúc dữ liệu việc làm, các bộ lọc tìm kiếm và từ khóa gợi ý</p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-dark"
            size="sm"
            onClick={() => showToast("Đã nhập dữ liệu danh mục chuẩn từ Bộ Lao động")}
          >
            <i className="bi bi-box-arrow-in-down me-1"></i>Nhập dữ liệu
          </Button>
          <Button
            variant="success"
            size="sm"
            className="fw-bold"
            onClick={() => setShowAddModal(true)}
          >
            <i className="bi bi-plus-lg me-1"></i>Thêm danh mục mới
          </Button>
        </div>
      </div>

      {/* Categories Table */}
      <Card className="matcha-card p-4 border-0 shadow-sm mb-4">
        <h6 className="fw-bold mb-3">Danh sách nhóm ngành nghề ({categories.length})</h6>
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Tên danh mục ngành nghề</th>
                <th>Số lượng tin tuyển dụng</th>
                <th>Số kỹ năng liên kết</th>
                <th>Trạng thái hiển thị</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, idx) => (
                <tr key={idx}>
                  <td className="fw-semibold text-body">{c.name}</td>
                  <td><strong className="text-success">{c.jobs}</strong> tin</td>
                  <td>{c.skills} kỹ năng</td>
                  <td>
                    <Badge bg={c.status === "Hiển thị" ? "success" : "secondary"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => toggleCategoryStatus(idx)}
                      >
                        {c.status === "Hiển thị" ? "Ẩn" : "Hiện"}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => showToast(`Đã mở giao diện biên tập cho ${c.name}`)}
                      >
                        Chỉnh sửa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Top Skills Tag Cloud */}
      <Card className="matcha-card p-4 border-0 shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <h6 className="fw-bold mb-0">Kỹ năng thịnh hành (Skill Cloud)</h6>
            <p className="text-muted small mb-0">Top các kỹ năng được nhà tuyển dụng tìm kiếm và xuất hiện nhiều nhất</p>
          </div>
          <span className="badge bg-success bg-opacity-10 text-success">Cập nhật theo thời gian thực</span>
        </div>

        <div className="d-flex flex-wrap gap-2 pt-2">
          {topSkills.map((s) => (
            <button
              key={s}
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill"
              onClick={() => showToast(`Đang lọc các tin tuyển dụng liên quan đến kỹ năng: ${s}`)}
            >
              #{s}
            </button>
          ))}
        </div>
      </Card>

      {/* Add Category Modal */}
      <CategoryModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onCategoryCreated={handleCreateCategory}
      />
    </div>
  );
}
