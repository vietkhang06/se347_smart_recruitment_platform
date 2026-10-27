import { IS_API } from "../../services/dataMode";
export default function DataModeNotice() {
  if (IS_API) return null;
  return <aside className="border-bottom bg-light text-dark py-1" aria-label="Chế độ dữ liệu">
    <div className="container small">Bản demo • Dữ liệu và tệp được lưu trên trình duyệt này. Các vai trò dùng chung dữ liệu demo.</div>
  </aside>;
}