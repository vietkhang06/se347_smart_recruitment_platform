import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

export default function CategoryModal({ show, onHide, onCategoryCreated }) {
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("JavaScript, React, Figma, UI/UX");
  const [status, setStatus] = useState("Hiển thị");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCat = {
      name: name.trim(),
      jobs: 0,
      skills: skills.split(",").length,
      status
    };

    onCategoryCreated(newCat);
    setName("");
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-folder-plus text-success me-2"></i>Thêm danh mục ngành nghề mới
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Tên ngành nghề / Danh mục</Form.Label>
            <Form.Control
              type="text"
              required
              placeholder="VD: Trí tuệ nhân tạo (AI & Machine Learning)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Các kỹ năng liên quan (cách nhau bằng dấu phẩy)</Form.Label>
            <Form.Control
              type="text"
              placeholder="VD: Python, PyTorch, LLM, Computer Vision"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small fw-semibold">Trạng thái công khai</Form.Label>
            <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Hiển thị">Hiển thị (Áp dụng cho bộ lọc)</option>
              <option value="Nháp">Bản nháp (Chưa công khai)</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Hủy</Button>
          <Button variant="success" type="submit" className="fw-bold">
            Thêm danh mục
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
