import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import CategoryModal from "../components/CategoryModal";
import { useToast } from "../../../context/ToastContext";
import { MOCK_TOP_SKILLS } from "../../../mock";
import { mockStore } from "../../../services/mockStore";

export default function CategoriesView({ categories, setCategories }) {
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleCreateCategory = (newCat) => {
    mockStore.saveCategory(newCat);
    setCategories(mockStore.getCategories());
    showToast(`Đã thêm danh mục mới: ${newCat.name}`);
  };

  const toggleCategoryStatus = (id, name) => {
    const nextStatus = mockStore.toggleCategoryStatus(id);
    setCategories(mockStore.getCategories());
    showToast(`Đã chuyển danh mục ${name} sang: ${nextStatus}`);
  };

  const handleDeleteCategory = (id, name) => {
    if (window.confirm(`Xác nhận xóa danh mục ngành nghề "${name}"?`)) {
      mockStore.deleteCategory(id);
      setCategories(mockStore.getCategories());
      showToast(`Đã xóa danh mục ${name}`);
    }
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">Danh mục ngành nghề & Kỹ năng hệ thống ({categories.length})</h5>
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
            <i className="bi bi-plus-lg me-1"></i>Thêm ngành nghề
          </Button>
        </div>
      </div>

      <div className="row g-4">
        {/* Left: Categories Table */}
        <div className="col-lg-8">
          <Card className="matcha-card p-4 border-0 shadow-sm">
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Tên ngành nghề</th>
                    <th>Tin tuyển dụng</th>
                    <th>Bộ kỹ năng chuẩn</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id || c.name}>
                      <td className="fw-semibold">
                        <i className={`bi ${c.icon || "bi-folder"} me-2 text-success`}></i>
                        {c.name}
                      </td>
                      <td>
                        <strong className="text-primary">{c.jobs || 0}</strong> tin đăng
                      </td>
                      <td>{c.skills || 10} kỹ năng</td>
                      <td>
                        <Badge bg={c.status === "Hiển thị" ? "success" : "secondary"}>
                          {c.status}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant={c.status === "Hiển thị" ? "outline-warning" : "outline-success"}
                            size="sm"
                            title={c.status === "Hiển thị" ? "Chuyển về nháp" : "Hiển thị công khai"}
                            onClick={() => toggleCategoryStatus(c.id, c.name)}
                          >
                            <i className={`bi ${c.status === "Hiển thị" ? "bi-eye-slash" : "bi-eye"}`}></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            title="Xóa danh mục"
                            onClick={() => handleDeleteCategory(c.id, c.name)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Right: System Skill Tags */}
        <div className="col-lg-4">
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <h6 className="fw-bold mb-3">Từ khóa kỹ năng phổ biến (Top Skills Pool)</h6>
            <p className="small text-muted mb-3">
              Các kỹ năng này được thuật toán AI dùng để tự động matching giữa JD tuyển dụng và CV ứng viên:
            </p>
            <div className="d-flex flex-wrap gap-2">
              {MOCK_TOP_SKILLS.map((sk) => (
                <Badge
                  key={sk}
                  bg="secondary"
                  className="bg-opacity-10 text-body p-2 fs-6 cursor-pointer"
                  onClick={() => showToast(`Kỹ năng "${sk}" đang có 128 tin tuyển dụng liên quan`)}
                >
                  <i className="bi bi-hash me-1 text-success"></i>{sk}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Category Modal */}
      <CategoryModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onCategoryCreated={handleCreateCategory}
      />
    </div>
  );
}
