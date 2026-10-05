import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCandidateData } from "../../hooks/useCandidateData";
import { getProfile, completeness, getApplications, getInterviews, getSaved, notifications, readNotifications, markNotificationsRead } from "../../services/candidateService";
import { CandidateLayout, Empty } from "../../components/candidate/CandidateUI";
export default function DashboardPage() {
  const {user}=useAuth();
  const data=useCandidateData(()=>({profile:getProfile(user),apps:getApplications(user),interviews:getInterviews(user),saved:getSaved(user),news:notifications(user),read:readNotifications(user)}));
  const progress=completeness(data.profile);
  const unread=data.news.filter(n=>!data.read.includes(n.id));
  return <CandidateLayout title={`Chào ${data.profile.name || 'bạn'},`} subtitle="Theo dõi cơ hội của bạn và những việc cần làm tiếp theo.">
    <div className="candidate-stats">{[[data.apps.length,"Đơn đã gửi","applications"],[data.interviews.filter(i=>!["Đã hủy","Hoàn tất","Ứng viên từ chối"].includes(i.status)).length,"Lịch cần theo dõi","interviews"],[data.saved.length,"Việc đã lưu","saved"]].map(([n,label,path])=><Link key={path} to={`/candidate/${path}`} className="candidate-stat text-decoration-none text-body"><span className="candidate-note">{label}</span><strong>{n}</strong><span className="small text-success">Xem chi tiết →</span></Link>)}</div>
    <div className="candidate-grid"><div><section className="candidate-panel"><div className="d-flex justify-content-between flex-wrap gap-2 mb-3"><h2>Cập nhật tuyển dụng <span className="badge bg-success">{unread.length} mới</span></h2>{unread.length>0 && <button className="btn btn-sm btn-outline-success" onClick={()=>markNotificationsRead(user,data.news.map(n=>n.id))}>Đánh dấu đã đọc</button>}</div>
      {data.news.length ? <div className="d-grid gap-2">{data.news.slice(0,30).map(n=><Link key={n.id} to={n.to} onClick={()=>markNotificationsRead(user,[...new Set([...data.read,n.id])])} className="candidate-update"><span className={`bi ${data.read.includes(n.id)?'bi-check-circle':'bi-bell-fill text-success'}`}/><div><strong>{n.title}</strong><p className="mb-0 small text-muted">{n.text}</p>{n.at && <time className="candidate-note">{new Date(n.at).toLocaleString('vi-VN')}</time>}</div></Link>)}</div>:<Empty title="Cơ hội đầu tiên đang chờ bạn" text="Hoàn thiện hồ sơ rồi khám phá các công việc đang tuyển." to="/jobs" action="Khám phá việc làm"/>}</section></div>
    <aside><section className="candidate-panel"><h2>Hồ sơ sẵn sàng {progress}%</h2><div className="progress my-3" role="progressbar" aria-label="Mức độ hoàn thiện hồ sơ" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="progress-bar bg-success" style={{width:`${progress}%`}}/></div><p className="text-muted">Thông tin liên hệ, kỹ năng và CV giúp nhà tuyển dụng hiểu bạn hơn.</p><Link className="btn btn-success w-100" to="/candidate/profile">Hoàn thiện hồ sơ & CV</Link></section><section className="candidate-panel"><h2>Bước tiếp theo</h2><ul className="small text-muted ps-3"><li className="mb-2">Kiểm tra CV và số điện thoại trước khi gửi đơn.</li><li className="mb-2">Theo dõi trạng thái hồ sơ sau khi HR xử lý.</li><li>Xác nhận lịch hẹn hoặc gửi đề nghị đổi lịch.</li></ul></section></aside></div>
  </CandidateLayout>;
}
