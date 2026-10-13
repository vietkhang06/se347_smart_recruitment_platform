import { useState } from "react";
import {
  uploadCV,
  downloadCV
} from "../../services/profileService";

export default function CandidateCV({
  value,
  onChange,
  onBusy = () => {}
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function select(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setBusy(true);
    onBusy(true);

    try {
      onChange(await uploadCV(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <div className="border rounded-3 p-3 bg-surface-2">
      <div className="fw-semibold mb-2">
        <i className="bi bi-file-earmark-person text-success me-2" />
        {value.cvName || "Chưa đính kèm CV"}
      </div>

      {value.cvId ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-success mb-3"
          onClick={() =>
            downloadCV(value.cvId).catch(err => setError(err.message))
          }
        >
          Tải lại CV
        </button>
      ) : value.cvName ? (
        <p className="small text-warning">
          CV cũ chỉ có tên tệp. Hãy tải lại nội dung CV.
        </p>
      ) : null}

      <label className="d-block small fw-semibold">
        {busy ? "Đang lưu CV…" : "Chọn hoặc thay CV"}

        <input
          className="form-control mt-2"
          type="file"
          accept=".pdf,.doc,.docx"
          disabled={busy}
          onChange={select}
        />
      </label>

      <div className="small text-muted mt-2">
        PDF, DOC, DOCX · tối đa 5 MB.
        Tệp được lưu trong trình duyệt này.
      </div>

      {error && (
        <div className="alert alert-danger mt-2 mb-0" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}