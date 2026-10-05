import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useCandidateData } from "../../hooks/useCandidateData";
import { getInterviews, safeUrl, respondInterview } from "../../services/candidateService";
import { CandidateLayout, Empty, Status, ErrorNotice } from "../../components/candidate/CandidateUI";
export default function InterviewsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const interviews = useCandidateData(() => getInterviews(user));
  const [response, setResponse] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = interviews.filter(iv => filter === "all" || (filter === "active" ? !["Đã hủy","Hoàn tất","Ứng viên từ chối"].includes(iv.status) : ["Đã hủy","Hoàn tất","Ứng viên từ chối"].includes(iv.status)));
  function submit(e) {
    e.preventDefault();
    try { respondInterview(user,response.id,response.status,note);setResponse(null);showToast("Đã gửi phản hồi tới nhà tuyển dụng."); } catch(e) {setError(e.message);}
  }
  return <CandidateLayout title="Lịch phỏng vấn" subtitle="Xem lịch hẹn, xác nhận tham gia hoặc trao đổi thời gian phù hợp với nhà tuyển dụng.">
    <label htmlFor="interview-filter" className="form-label">Lọc lịch hẹn</label>
    <select id="interview-filter" className="form-select mb-4" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả lịch hẹn</option><option value="active">Cần theo dõi</option><option value="past">Đã hoàn tất / hủy / từ chối</option></select>
    {visible.length ? visible.map(iv=><article key={iv.id} className="candidate-panel">
      <div className="d-flex justify-content-between gap-3 flex-wrap mb-3"><div><h2>{iv.role}</h2><p className="text-muted mb-0"><i className="bi bi-calendar3 me-2"/>{iv.date} · {iv.time} (giờ Việt Nam)</p></div><div><Status stage={iv.status}/></div></div>
      <dl className="row mb-0"><dt className="col-sm-4">Hình thức</dt><dd className="col-sm-8">{iv.type}</dd><dt className="col-sm-4">Người phỏng vấn</dt><dd className="col-sm-8">{iv.people || "Đang cập nhật"}</dd><dt className="col-sm-4">Ghi chú / Địa điểm</dt><dd className="col-sm-8 candidate-description">{iv.note || "Chưa có ghi chú"}</dd></dl>
      {iv.candidateResponse && <div className="alert alert-light border mt-3"><strong>Phản hồi của bạn: {iv.candidateResponse}</strong>{iv.candidateNote && <p className="mb-0 mt-1 candidate-description">{iv.candidateNote}</p>}</div>}
      {!["Đã hủy","Hoàn tất"].includes(iv.status) && <div className="d-flex gap-2 flex-wrap mt-3">
        {safeUrl(iv.meetingLink) && <a className="btn btn-outline-success" href={safeUrl(iv.meetingLink)} target="_blank" rel="noopener noreferrer">Mở phòng phỏng vấn <i className="bi bi-box-arrow-up-right ms-2"/></a>}
        {[['Đã xác nhận','Xác nhận tham gia'],['Đề nghị đổi lịch','Đề nghị đổi lịch'],['Ứng viên từ chối','Từ chối lịch hẹn']].map(([status,label])=><button key={status} disabled={iv.candidateResponse===status && iv.status===status} className={`btn ${status==='Đã xác nhận'?'btn-success':'btn-outline-secondary'}`} onClick={()=>{setResponse({id:iv.id,status});setNote("");setError("");}}>{label}</button>)}
      </div>}
    </article>) : <Empty title="Chưa có lịch hẹn phù hợp" text="Khi nhà tuyển dụng tạo lịch cho hồ sơ của bạn, thông tin sẽ xuất hiện tại đây." to="/candidate/applications" action="Xem đơn ứng tuyển"/>}
    <Modal show={Boolean(response)} onHide={()=>setResponse(null)} centered><Modal.Header closeButton><Modal.Title className="fs-5">{response?.status}</Modal.Title></Modal.Header><form onSubmit={submit}><Modal.Body><ErrorNotice message={error}/><label htmlFor="interview-note" className="form-label">Lời nhắn cho nhà tuyển dụng{response?.status !== 'Đã xác nhận' ? ' *' : ' (không bắt buộc)'}</label><textarea id="interview-note" className="form-control" rows={4} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Nếu đổi lịch, hãy đề xuất ngày và giờ bạn có thể tham gia."/><p className="candidate-note mt-2">Đề nghị đổi lịch chưa thay đổi thời gian hẹn. Hãy chờ nhà tuyển dụng sắp xếp và gửi lịch mới.</p></Modal.Body><Modal.Footer><button type="button" className="btn btn-outline-secondary" onClick={()=>setResponse(null)}>Quay lại</button><button className="btn btn-success" type="submit">Gửi phản hồi</button></Modal.Footer></form></Modal>
  </CandidateLayout>;
}
