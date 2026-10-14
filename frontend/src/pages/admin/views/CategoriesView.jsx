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

export default function CategoriesView({
  categories,
  setCategories
}) {
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const isAllSelected =
    categories.length > 0 &&
    categories.every((category) =>
      selectedCategoryIds.includes(category.id || category.name)
    );

  const isPartiallySelected =
    !isAllSelected &&
    categories.some((category) =>
      selectedCategoryIds.includes(category.id || category.name)
    );

  const handleSelectAll = () => {
    setSelectedCategoryIds(
      isAllSelected
        ? []
        : categories.map((category) => category.id || category.name)
    );
  };

  const handleToggleSelectCategory = (id) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const handleBulkStatus = (status) => {
    if (!selectedCategoryIds.length) return;

    let succeeded = 0;
    const failedIds = [];

    selectedCategoryIds.forEach((id) => {
      try {
        const category = mockStore
          .getCategories()
          .find((item) => (item.id || item.name) === id);

        if (!category?.id) {
          throw new Error("Không tìm thấy mã danh mục hợp lệ.");
        }

        mockStore.saveCategory({
          ...category,
          status
        });

        const saved = mockStore
          .getCategories()
          .find((item) => item.id === category.id);

        if (saved?.status !== status) {
          throw new Error("Không lưu được trạng thái danh mục.");
        }

        succeeded += 1;
      } catch {
        failedIds.push(id);
      }
    });

    setCategories(mockStore.getCategories());
    setSelectedCategoryIds(failedIds);

    if (failedIds.length) {
      showToast(
        `Đã cập nhật ${succeeded} danh mục; ` +
        `${failedIds.length} danh mục chưa cập nhật được.`
      );
      return;
    }

    showToast(
      status === "Hiển thị"
        ? `Đã công khai ${succeeded} danh mục ngành nghề.`
        : `Đã ẩn ${succeeded} danh mục ngành nghề.`
    );
  };

  const handleBulkDelete = () => {
    if (
      window.confirm(
        `Xác nhận xóa ${selectedCategoryIds.length} danh mục ngành nghề đã chọn?`
      )
    ) {
      selectedCategoryIds.forEach((id) =>
        mockStore.deleteCategory(id)
      );
      setCategories(mockStore.getCategories());
      showToast(
        `Đã xóa ${selectedCategoryIds.length} danh mục ngành nghề`
      );
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
    showToast(
      `Đã chuyển danh mục ${name} sang: ${nextStatus}`
    );
  };

  const handleDeleteCategory = (id, name) => {
    if (
      window.confirm(
        `Xác nhận xóa danh mục ngành nghề "${name}"?`
      )
    ) {
      mockStore.deleteCategory(id);
      setCategories(mockStore.getCategories());
      showToast(`Đã xóa danh mục ${name}`);
      setSelectedCategoryIds((prev) =>
        prev.filter((item) => item !== id)
      );
    }
  };

  return (
    <div data-aos="fade-up">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 className="fw-bold mb-0">
            Danh mục ngành nghề & Kỹ năng hệ thống ({categories.length})
          </h5>
          <p className="text-muted small mb-0">
            Quản lý cấu trúc dữ liệu việc làm, các bộ lọc tìm kiếm
            và từ khóa gợi ý
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-dark"
            size="sm"
            onClick={() =>
              showToast("Chức năng nhập danh mục chưa được triển khai.")
            }
          >
            <i className="bi bi-box-arrow-in-down me-1" />
            Nhập dữ liệu
          </Button>

          <Button
            variant="success"
            size="sm"
            className="fw-bold"
            onClick={() => setShowAddModal(true)}
          >
            <i className="bi bi-plus-lg me-1" />
            Thêm ngành nghề
          </Button>
        </div>
      </div>

      {selectedCategoryIds.length > 0 && (
        <div
          className="alert d-flex flex-wrap justify-content-between align-items-center py-2 px-3 mb-3 rounded-3 border"
          style={{
            backgroundColor: "var(--primary-soft)",
            borderColor: "var(--primary)",
            color: "var(--text)"
          }}
        >
          <div className="d-flex align-items-center gap-2 small fw-semibold">
            <i className="bi bi-check2-circle fs-5 text-success" />
            <span>
              Đã chọn{" "}
              <strong className="text-success">
                {selectedCategoryIds.length}
              </strong>{" "}
              danh mục ngành nghề
            </span>
          </div>

          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Button
              variant="outline-success"
              size="sm"
              className="rounded-pill"
              onClick={() => handleBulkStatus("Hiển thị")}
            >
              <i className="bi bi-eye me-1" />
              Hiển thị đã chọn
            </Button>

            <Button
              variant="outline-warning"
              size="sm"
              className="rounded-pill"
              onClick={() => handleBulkStatus("Ẩn")}
            >
              <i className="bi bi-eye-slash me-1" />
              Ẩn đã chọn
            </Button>

            <Button
              variant="outline-danger"
              size="sm"
              className="rounded-pill"
              onClick={handleBulkDelete}
            >
              <i className="bi bi-trash me-1" />
              Xóa đã chọn
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
                          if (input) {
                            input.indeterminate = isPartiallySelected;
                          }
                        }}
                        onChange={handleSelectAll}
                        aria-label="Chọn tất cả danh mục"
                      />
                    </th>
                    <th className="text-start text-nowrap">
                      Tên ngành nghề
                    </th>
                    <th className="text-center text-nowrap">
                      Tin tuyển dụng
                    </th>
                    <th className="text-center text-nowrap">
                      Bộ kỹ năng chuẩn
                    </th>
                    <th className="text-center text-nowrap">
                      Trạng thái
                    </th>
                    <th
                      className="text-center text-nowrap"
                      style={{ width: "80px" }}
                    >
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!categories.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-muted py-4"
                      >
                        Chưa có danh mục ngành nghề.
                      </td>
                    </tr>
                  )}

                  {categories.map((category) => {
                    const idKey = category.id || category.name;
                    const isSelected = selectedCategoryIds.includes(idKey);
                    const isVisible =
                      !category.status ||
                      category.status === "Hiển thị" ||
                      category.status === "visible";

                    return (
                      <tr
                        key={idKey}
                        className={isSelected ? "table-active" : ""}
                      >
                        <td className="text-center">
                          <Form.Check
                            className="matcha-checkbox-wrap"
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleToggleSelectCategory(idKey)
                            }
                            aria-label={`Chọn danh mục ${category.name}`}
                          />
                        </td>

                        <td className="text-start fw-semibold text-body">
                          <i
                            className={`bi ${
                              category.icon || "bi-folder"
                            } me-2 text-success`}
                          />
                          {category.name}
                        </td>

                        <td className="text-center">
                          <strong className="text-body">
                            {category.jobs ?? category.jobCount ?? 0}
                          </strong>{" "}
                          <span className="small text-muted">
                            tin đăng
                          </span>
                        </td>

                        <td className="text-center">
                          <span className="fw-semibold text-body">
                            {category.skills ?? 0}
                          </span>{" "}
                          <span className="small text-muted">
                            kỹ năng
                          </span>
                        </td>

                        <td className="text-center">
                          <span
                            className={`status-badge ${
                              isVisible
                                ? "status-badge-success"
                                : "status-badge-secondary"
                            }`}
                          >
                            {isVisible ? "Hiển thị" : category.status}
                          </span>
                        </td>

                        <td className="text-center">
                          <Dropdown align="end">
                            <Dropdown.Toggle as={CustomThreeDotsToggle} />
                            <Dropdown.Menu className="matcha-dropdown-menu py-2">
                              <Dropdown.Item
                                onClick={() =>
                                  toggleCategoryStatus(
                                    category.id,
                                    category.name
                                  )
                                }
                                className="small py-2"
                              >
                                <i
                                  className={`bi ${
                                    isVisible
                                      ? "bi-eye-slash text-warning"
                                      : "bi-eye text-success"
                                  } me-2`}
                                />
                                {isVisible
                                  ? "Chuyển về trạng thái ẩn"
                                  : "Công khai ngành nghề"}
                              </Dropdown.Item>

                              <Dropdown.Item
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      String(idKey)
                                    );
                                    showToast("Đã sao chép mã danh mục.");
                                  } catch {
                                    showToast(
                                      "Không thể sao chép mã danh mục."
                                    );
                                  }
                                }}
                                className="small py-2"
                              >
                                <i className="bi bi-link-45deg text-secondary me-2" />
                                Sao chép mã ngành nghề
                              </Dropdown.Item>

                              <Dropdown.Item
                                onClick={() =>
                                  showToast(
                                    `Chức năng cấu hình bộ kỹ năng cho ${category.name} chưa được triển khai.`
                                  )
                                }
                                className="small py-2"
                              >
                                <i className="bi bi-sliders text-primary me-2" />
                                Cấu hình bộ kỹ năng ({category.skills ?? 0})
                              </Dropdown.Item>

                              <Dropdown.Divider />

                              <Dropdown.Item
                                onClick={() =>
                                  handleDeleteCategory(
                                    category.id,
                                    category.name
                                  )
                                }
                                className="small py-2 text-danger"
                              >
                                <i className="bi bi-trash text-danger me-2" />
                                Xóa danh mục này
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

        <div className="col-lg-4">
          <Card className="matcha-card p-4 border-0 shadow-sm h-100">
            <h6 className="fw-bold mb-2">
              Từ khóa kỹ năng phổ biến (Top Skills Pool)
            </h6>
            <p
              className="small text-muted mb-3"
              style={{ fontSize: "12.5px" }}
            >
              Danh sách từ khóa kỹ năng tham khảo cho tin tuyển dụng
              và hồ sơ ứng viên.
            </p>

            <div className="d-flex flex-wrap gap-1">
              {MOCK_TOP_SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className="btn btn-sm py-1 px-2 border rounded-pill d-inline-flex align-items-center transition-all"
                  style={{
                    fontSize: "12px",
                    backgroundColor: "var(--surface-2)",
                    color: "var(--text)",
                    borderColor: "var(--border)"
                  }}
                  onClick={() =>
                    showToast(`Từ khóa kỹ năng: ${skill}`)
                  }
                  title={skill}
                >
                  <span className="text-success me-1 fw-bold">#</span>
                  {skill}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <CategoryModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onCategoryCreated={handleCreateCategory}
      />
    </div>
  );
}