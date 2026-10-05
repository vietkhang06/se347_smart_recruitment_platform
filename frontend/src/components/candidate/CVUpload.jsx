import { useEffect, useId, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { saveCV, downloadCV, readCV } from "../../services/candidateService";
import Modal from "react-bootstrap/Modal";
import { ErrorNotice } from "./CandidateUI";
export default function CVUpload({
  value,
  onChange,
  onBusyChange,
  disabled = false,
}) {
  const { user } = useAuth();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview,setPreview] = useState("");
  useEffect(() => () => {if(preview) URL.revokeObjectURL(preview);},[preview]);
  async function choose(file) {
    if (!file || busy || disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const cv = await saveCV(user, file);
      onChange(cv);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <div
      className="candidate-upload"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        choose(e.dataTransfer.files[0]);
      }}
    >
      <ErrorNotice message={error} />
      <i className="bi bi-file-earmark-pdf fs-2 text-success" />
      <p className="fw-semibold mt-2 mb-1">
        {value ? value.name : "Chọn CV để giới thiệu bản thân"}
      </p>
      <p className="candidate-note">
        {value ? `${(value.size / 1024).toFixed(0)} KB · ` : ""}PDF, tối đa 5
        MB. Có thể kéo tệp vào đây.
      </p>
      <label htmlFor={id} className="form-label">
        {busy ? "Đang lưu CV…" : value ? "Thay CV" : "Tải CV từ máy"}
      </label>
      <input
        id={id}
        className="form-control form-control-sm"
        type="file"
        accept=".pdf,application/pdf"
        disabled={busy || disabled}
        onChange={(e) => {
          choose(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <Modal show={Boolean(preview)} onHide={()=>setPreview("")} size="lg" centered><Modal.Header closeButton><Modal.Title className="fs-5">Xem CV</Modal.Title></Modal.Header><Modal.Body>{preview && <iframe title="Nội dung CV PDF" src={preview} style={{width:"100%",height:"65vh",border:0}}/>}<p className="small text-muted mt-2">Nếu thiết bị không hiển thị PDF, hãy đóng cửa sổ và chọn Tải bản đã chọn.</p></Modal.Body></Modal>
      {value && (
        <div className="d-flex gap-2 mt-3 flex-wrap">
          <button type="button" className="btn btn-sm btn-success" onClick={async()=>{try {setPreview(URL.createObjectURL(await readCV(user,value)));} catch(e){setError(e.message);}}}>Xem CV</button>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={async () => {
              try {
                await downloadCV(user, value);
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Tải bản đã chọn
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={busy || disabled}
            onClick={() => onChange(null)}
          >
            Bỏ chọn
          </button>
        </div>
      )}
    </div>
  );
}
