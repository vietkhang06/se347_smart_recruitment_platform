import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";
import CategoryModal from "../components/CategoryModal";
import CustomThreeDotsToggle from "../../../components/common/CustomThreeDotsToggle";
import { useToast } from "../../../context/ToastContext";
import { MOCK_TOP_SKILLS } from "../../../mock";
import { mockStore } from "../../../services/mockStore";

export default function CategoriesView({ categories, setCategories }) {
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const isAllSelected = categories.length > 0 && selectedCategoryIds.length === categories.length;
  const isPartiallySelected = selectedCategoryIds.length > 0 && selectedCategoryIds.length < categories.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(categories.map((c) => c.id || c.name));
    }
  };

  const handleToggleSelectCategory = (id) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkHide = () => {
    selectedCategoryIds.forEach((id) => mockStore.updateCategory(id, { status: "Ẩn" }));
    setCategories(mockStore.getCategories());
    showToast(`Đã chuyển ẩn ${selectedCategoryIds.length} danh mục ngành nghề`);
    setSelectedCategoryIds([]);
  };

  const handleBulkShow = () => {
    selectedCategoryIds.forEach((id) => mockStore.updateCategory(id, { status: "Hiển thị" }));
    setCategories(mockStore.getCategories());
    showToast(`Đã công khai ${selectedCategoryIds.length} danh mục ngành nghề`);
    setSelectedCategoryIds([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Xác nhận xóa ${selectedCategoryIds.length} danh mục ngành nghề đã chọn?`)) {
      selectedCategoryIds.forEach((id) => mockStore.deleteCategory(id));
      setCategories(mockStore.getCategories());
      showToast(`Đã xóa ${selectedCategoryIds.length} danh mục ngành nghề`);
      setSelectedCategoryIds([]);
    }
  };

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

      {/* Bulk Action Banner */}
      {selectedCategoryIds.length > 0 && (
        <div
          className="alert d-flex flex-wrap justify-content-between align-items-center py-2 px-3 mb-3 rounded-3 border"
          style={{ backgroundColor: "var(--primary-soft)", borderColor: "var(--primary)", color: "var(--text)" }}
        >
          <div className="d-flex align-items-center gap-2 small fw-semibold">
            <i className="bi bi-check2-circle fs-5 text-success"></i>
            <span>Đã chọn <strong className="text-success">{selectedCategoryIds.length}</strong> danh mục ngành nghề</span>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Button
              variant="outline-success"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkShow}
            >
              <i className="bi bi-eye me-1"></i>Hiển thị đã chọn
            </Button>
            <Button
              variant="outline-warning"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkHide}
            >
              <i className="bi bi-eye-slash me-1"></i>Ẩn đã chọn
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkDelete}
            >
              <i className="bi bi-trash me-1"></i>Xóa đã chọn
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none text-muted p-0 ms-2 small"
              onClick={() => setSelectedCategoryIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Left: Categories Table */}
        <div className="col-lg-8">
          <Card className="matcha-card p-4 border-0 shadow-sm">
            <div className="table-responsive">
              <Table hover className="matcha-table align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: "48px", textAlign: "center" }}>
                      <Form.Check
                        className="matcha-checkbox-wrap"
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isPartiallySelected;
                        }}
                        onChange={handleSelectAll}
                        aria-label="Chọn tất cả danh mục"
                      />
                    </th>
                    <th className="text-start text-nowrap">Tên ngành nghề</th>
                    <th className="text-center text-nowrap">Tin tuyển dụng</th>
                    <th className="text-center text-nowrap">Bộ kỹ năng chuẩn</th>
                    <th className="text-center text-nowrap">Trạng thái</th>
                    <th className="text-center text-nowrap" style={{ width: "80px" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => {
                    const idKey = c.id || c.name;
                    const isSelected = selectedCategoryIds.includes(idKey);
                    const isVisible = c.status === "Hiển thị" || c.status === "visible";
                    return (
                      <tr key={idKey} className={isSelected ? "table-active" : ""}>
                        <td className="text-center">
                          <Form.Check
                            className="matcha-checkbox-wrap"
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectCategory(idKey)}
                            aria-label={`Chọn danh mục ${c.name}`}
                          />
                        </td>
                        <td className="text-start fw-semibold text-body">
                          <i className={`bi ${c.icon || "bi-folder"} me-2 text-success`}></i>
                          {c.name}
                        </td>
                        <td className="text-center">
                          <strong className="text-body">{c.jobs || c.jobCount || 0}</strong> <span className="small text-muted">tin đăng</span>
                        </td>
                        <td className="text-center">
                          <span className="fw-semibold text-body">{c.skills || 10}</span> <span className="small text-muted">kỹ năng</span>
                        </td>
                        <td className="text-center">
                          <span className={`status-badge ${isVisible ? "status-badge-success" : "status-badge-secondary"}`}>
                            {c.status === "visible" ? "Hiển thị" : (c.status || "Hiển thị")}
                          </span>
                        </td>
                        <td className="text-center">
                          <Dropdown align="end">
                            <Dropdown.Toggle as={CustomThreeDotsToggle} />
                            <Dropdown.Menu className="matcha-dropdown-menu py-2">
                              <Dropdown.Item onClick={() => toggleCategoryStatus(c.id, c.name)} className="small py-2">
                                <i className={`bi ${isVisible ? "bi-eye-slash text-warning" : "bi-eye text-success"} me-2`}></i>
                                {isVisible ? "Chuyển về trạng thái ẩn" : "Công khai ngành nghề"}
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => showToast(`Đã sao chép mã danh mục ${c.id || c.name}`)} className="small py-2">
                                <i className="bi bi-link-45deg text-secondary me-2"></i>Sao chép mã ngành nghề
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => showToast(`Cấu hình bộ kỹ năng cho ${c.name}`)} className="small py-2">
                                <i className="bi bi-sliders text-primary me-2"></i>Cấu hình bộ kỹ năng ({c.skills || 10})
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item onClick={() => handleDeleteCategory(c.id, c.name)} className="small py-2 text-danger">
                                <i className="bi bi-trash text-danger me-2"></i>Xóa danh mục này
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Right: System Skill Tags - Refined and smaller font */}
        <div className="col-lg-4">
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <h6 className="fw-bold mb-2">Từ khóa kỹ năng phổ biến (Top Skills Pool)</h6>
            <p className="small text-muted mb-3" style={{ fontSize: "12.5px" }}>
              Các kỹ năng này được thuật toán AI dùng để tự động matching giữa JD tuyển dụng và CV ứng viên:
            </p>
            <div className="d-flex flex-wrap gap-1">
              {MOCK_TOP_SKILLS.map((sk) => (
                <button
                  key={sk}
                  type="button"
                  className="btn btn-sm py-1 px-2 border rounded-pill d-inline-flex align-items-center transition-all"
                  style={{
                    fontSize: "12px",
                    backgroundColor: "var(--surface-2)",
                    color: "var(--text)",
                    borderColor: "var(--border)"
                  }}
                  onClick={() => showToast(`Kỹ năng "${sk}" đang có 128 tin tuyển dụng liên quan`)}
                  title={`Xem việc làm có kỹ năng ${sk}`}
                >
                  <span className="text-success me-1 fw-bold">#</span>{sk}
                </button>
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
