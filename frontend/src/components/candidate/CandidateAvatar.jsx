import { useState } from "react";
export default function CandidateAvatar({ value, onChange }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function select(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) {
      setError("Chọn ảnh JPG, PNG hoặc WebP tối đa 2 MB."); return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
      const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext("2d");
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - size) / 2, (img.naturalHeight - size) / 2, size, size, 0, 0, 256, 256);
      onChange(canvas.toDataURL("image/jpeg", 0.85));
    } catch { setError("Không đọc được ảnh. Hãy chọn tệp khác."); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  }
  return <div className="mb-3">
    <label className="small fw-semibold">Ảnh đại diện
      <input type="file" className="form-control mt-1" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={select} />
    </label>
    <div className="small text-muted">JPG, PNG, WebP · tối đa 2 MB. Chọn ảnh rồi bấm Lưu hồ sơ.</div>
    {value && <button type="button" className="btn btn-sm btn-outline-secondary mt-2" disabled={busy} onClick={() => onChange("")}>Bỏ ảnh</button>}
    {busy && <div role="status">Đang xử lý ảnh…</div>}
    {error && <div role="alert" className="text-danger small">{error}</div>}
  </div>;
}