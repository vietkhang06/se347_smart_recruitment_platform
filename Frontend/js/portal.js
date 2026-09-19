(function(){
  const root = document.querySelector("[data-portal]");
  if(!root) return;

  const role = root.dataset.portal;
  const data = window.MATCHAJOB_MOCK?.[role];
  const content = document.querySelector("#portal-content");
  const title = document.querySelector("[data-portal-title]");
  const subtitle = document.querySelector("[data-portal-subtitle]");

  const escapeHTML = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const statusClass = value => {
    const text = String(value).toLowerCase();
    if(/đang|hoạt động|hiển thị|xác minh|xác nhận|thấp|online/.test(text)) return "is-success";
    if(/chờ|mới|trung bình|sắp/.test(text)) return "is-warning";
    if(/khóa|cao|nghiêm|từ chối|đóng/.test(text)) return "is-danger";
    return "is-neutral";
  };
  const badge = value => `<span class="status-chip ${statusClass(value)}">${escapeHTML(value)}</span>`;
  const skillTags = skills => `<div class="tag-row">${skills.map(skill=>`<span class="tag">${escapeHTML(skill)}</span>`).join("")}</div>`;
  const metrics = items => `<div class="portal-metrics">${items.map(item=>`
    <article class="portal-metric">
      <span class="metric-icon tone-${item.tone}">${item.icon}</span>
      <div><span class="metric-label">${escapeHTML(item.label)}</span><strong>${escapeHTML(item.value)}</strong></div>
      <small class="tone-text-${item.tone}">${escapeHTML(item.change)}</small>
    </article>`).join("")}</div>`;
  const table = (headers, rows) => `<div class="portal-card table-card portal-table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  const empty = text => `<div class="empty-state"><strong>Chưa có dữ liệu</strong><p>${text}</p></div>`;
  const headerActions = html => { const host=document.querySelector("[data-page-actions]"); if(host) host.innerHTML=html||""; };

  const employerViews = {
    overview: {
      title: "Chào buổi sáng, FPT Talent!",
      subtitle: "Đây là tình hình tuyển dụng và những việc cần ưu tiên hôm nay.",
      actions: `<button class="btn btn-outline" data-demo-toast="Báo cáo đã được tạo">⇩ Xuất báo cáo</button><button class="btn btn-primary" data-open-composer>＋ Tạo tin tuyển dụng</button>`,
      render(){
        const upcoming=data.interviews.slice(0,3).map(i=>`<div class="schedule-item"><div class="schedule-time"><strong>${i.time}</strong><span>${i.date}</span></div><div><strong>${i.candidate}</strong><span>${i.type} · ${i.role}</span></div>${badge(i.status)}</div>`).join("");
        const activity=data.activity.map(a=>`<div class="activity-item"><span class="activity-dot tone-${a.tone}"></span><div><strong>${a.text}</strong><span>${a.time}</span></div></div>`).join("");
        return `${metrics(data.metrics)}
          <div class="portal-grid portal-grid-main">
            <section class="portal-card"><div class="card-heading"><div><h2>Hiệu suất ứng tuyển</h2><p>7 ngày gần nhất</p></div><span class="status-chip is-success">+12,8%</span></div><div class="chart-bars" aria-label="Biểu đồ ứng viên"><i style="height:42%"></i><i style="height:58%"></i><i style="height:49%"></i><i style="height:72%"></i><i style="height:66%"></i><i style="height:92%"></i><i style="height:78%"></i></div><div class="chart-labels"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div></section>
            <section class="portal-card"><div class="card-heading"><div><h2>Việc cần làm</h2><p>Ưu tiên theo thời gian</p></div><a href="#interviews" data-view="interviews">Xem lịch</a></div>${upcoming}</section>
          </div>
          <div class="portal-grid portal-grid-equal">
            <section class="portal-card"><div class="card-heading"><div><h2>Ứng viên nổi bật</h2><p>Xếp hạng theo mức độ phù hợp</p></div><a href="#candidates" data-view="candidates">Xem tất cả</a></div>${data.candidates.slice(0,3).map(c=>candidateRow(c)).join("")}</section>
            <section class="portal-card"><div class="card-heading"><div><h2>Hoạt động gần đây</h2><p>Cập nhật từ đội ngũ tuyển dụng</p></div></div>${activity}</section>
          </div>`;
      }
    },
    jobs: {
      title:"Tin tuyển dụng", subtitle:"Quản lý toàn bộ vị trí đang tuyển, bản nháp và tin đã đóng.",
      actions:`<button class="btn btn-outline" data-demo-toast="Đã tải danh sách tin">⇩ Xuất danh sách</button><button class="btn btn-primary" data-open-composer>＋ Tạo tin tuyển dụng</button>`,
      render(){
        const rows=data.jobs.map(j=>`<tr><td><strong>${j.title}</strong><small>${j.id} · ${j.team}</small></td><td>${j.location}</td><td><strong>${j.applicants}</strong><small>${j.views} lượt xem</small></td><td>${j.posted}</td><td>${badge(j.status)}</td><td><button class="table-action" data-demo-toast="Đã mở ${j.title}">Xem</button><button class="table-action" data-confirm="Tạm dừng tin ${j.title}?">•••</button></td></tr>`);
        return `<div class="toolbar portal-toolbar"><div class="segmented"><button class="active">Tất cả</button><button>Đang tuyển</button><button>Chờ duyệt</button><button>Đã đóng</button></div><label class="inline-search">⌕ <input data-table-search placeholder="Tìm theo vị trí hoặc mã tin"></label></div>${table(["Vị trí","Địa điểm","Hiệu suất","Ngày đăng","Trạng thái",""],rows)}`;
      }
    },
    candidates: {
      title:"Kho ứng viên", subtitle:"Tìm, lọc và sắp xếp hồ sơ theo mức độ phù hợp.",
      actions:`<button class="btn btn-outline" data-demo-toast="Danh sách đã được xuất">⇩ Xuất danh sách</button>`,
      render(){ return `<div class="filter-strip"><label class="inline-search grow">⌕ <input data-card-search placeholder="Tên, vị trí hoặc kỹ năng"></label><select class="filter-input"><option>Tất cả vị trí</option><option>Product Designer</option><option>Frontend Engineer</option></select><select class="filter-input"><option>Mức phù hợp</option><option>Trên 90%</option><option>80–90%</option></select></div><div class="candidate-grid">${data.candidates.map(candidateCard).join("")}</div>`; }
    },
    pipeline: {
      title:"Quy trình tuyển dụng", subtitle:"Theo dõi và chuyển ứng viên qua từng giai đoạn.",
      actions:`<button class="btn btn-outline" data-demo-toast="Đã mở cấu hình quy trình">⚙ Tùy chỉnh quy trình</button>`,
      render(){
        const stages=["Mới","Sàng lọc","Bài kiểm tra","Phỏng vấn","Đề nghị"];
        return `<div class="pipeline-board">${stages.map(stage=>{const list=data.candidates.filter(c=>c.stage===stage);return `<section class="pipeline-column"><div class="pipeline-heading"><strong>${stage}</strong><span>${list.length}</span></div>${list.length?list.map(c=>`<article class="pipeline-card"><div class="avatar small">${c.initials}</div><strong>${c.name}</strong><span>${c.role}</span><div class="match-score">${c.match}% phù hợp</div><button class="table-action" data-demo-toast="Đã mở hồ sơ ${c.name}">Xem hồ sơ →</button></article>`).join(""):empty("Kéo ứng viên vào giai đoạn này")}</section>`}).join("")}</div>`;
      }
    },
    interviews: {
      title:"Lịch phỏng vấn", subtitle:"Quản lý lịch hẹn, phòng họp và người tham gia.",
      actions:`<button class="btn btn-outline" data-demo-toast="Đã đồng bộ lịch">↻ Đồng bộ lịch</button><button class="btn btn-primary" data-open-interview>＋ Tạo lịch hẹn</button>`,
      render(){ return `<div class="portal-grid calendar-layout"><section class="portal-card mini-calendar"><div class="card-heading"><h2>Tháng 09/2026</h2><div><button class="icon-btn">‹</button><button class="icon-btn">›</button></div></div><div class="calendar-grid">${["T2","T3","T4","T5","T6","T7","CN"].map(d=>`<b>${d}</b>`).join("")}${Array.from({length:35},(_,i)=>`<button class="${i+1===19?'selected':''}">${i<2?'':i-1}</button>`).join("")}</div></section><section class="portal-card"><div class="card-heading"><div><h2>Lịch sắp tới</h2><p>19–21/09/2026</p></div></div>${data.interviews.map(i=>`<article class="interview-card"><div class="schedule-time"><strong>${i.time}</strong><span>${i.date}</span></div><div class="grow"><strong>${i.candidate}</strong><span>${i.type} · ${i.role}</span><small>${i.people}</small></div>${badge(i.status)}<button class="table-action" data-confirm="Hủy lịch với ${i.candidate}?">•••</button></article>`).join("")}</section></div>`; }
    },
    analytics: {
      title:"Phân tích tuyển dụng", subtitle:"Đo lường hiệu quả theo vị trí, kênh và thời gian.",
      actions:`<button class="btn btn-outline" data-demo-toast="Báo cáo tuyển dụng đã được tạo">⇩ Xuất báo cáo</button>`,
      render(){ return `${metrics([{label:"Thời gian tuyển TB",value:"18 ngày",change:"-3 ngày",tone:"green",icon:"◷"},{label:"Tỷ lệ qua sàng lọc",value:"34%",change:"+4,8%",tone:"purple",icon:"↗"},{label:"Chi phí / ứng viên",value:"284K",change:"-8,2%",tone:"teal",icon:"₫"},{label:"Tỷ lệ nhận offer",value:"81%",change:"+2,1%",tone:"orange",icon:"✓"}])}<div class="portal-grid portal-grid-main"><section class="portal-card"><div class="card-heading"><div><h2>Phễu tuyển dụng</h2><p>Tất cả vị trí · 30 ngày</p></div></div><div class="funnel"><div style="--w:100%"><strong>1.842</strong><span>Lượt xem</span></div><div style="--w:76%"><strong>486</strong><span>Ứng tuyển</span></div><div style="--w:54%"><strong>164</strong><span>Sàng lọc</span></div><div style="--w:36%"><strong>58</strong><span>Phỏng vấn</span></div><div style="--w:22%"><strong>18</strong><span>Nhận việc</span></div></div></section><section class="portal-card"><div class="card-heading"><div><h2>Nguồn ứng viên</h2><p>Chất lượng theo kênh</p></div></div>${[["Tìm kiếm MatchaJob",42],["Giới thiệu nội bộ",24],["Trang công ty",18],["Mạng xã hội",10],["Khác",6]].map(v=>`<div class="progress-row"><span>${v[0]}</span><div><i style="width:${v[1]}%"></i></div><strong>${v[1]}%</strong></div>`).join("")}</section></div>`; }
    },
    company: {
      title:"Hồ sơ doanh nghiệp", subtitle:"Xây dựng hình ảnh tuyển dụng nhất quán và đáng tin cậy.",
      actions:`<button class="btn btn-primary" data-save-form>✓ Lưu thay đổi</button>`,
      render(){const c=data.company;return `<div class="portal-grid profile-layout"><section class="portal-card"><div class="company-cover"><div class="company-logo">MF</div><button class="btn btn-outline btn-sm" data-demo-toast="Chọn ảnh bìa demo">Đổi ảnh bìa</button></div><div class="form-grid"><label class="form-group"><span>Tên doanh nghiệp</span><input class="form-control" value="${c.name}"></label><label class="form-group"><span>Lĩnh vực</span><input class="form-control" value="${c.industry}"></label><label class="form-group"><span>Quy mô</span><input class="form-control" value="${c.size}"></label><label class="form-group"><span>Địa điểm</span><input class="form-control" value="${c.location}"></label><label class="form-group full"><span>Giới thiệu</span><textarea class="form-control">Đội ngũ công nghệ phát triển các sản phẩm số có tác động tích cực đến hàng triệu người dùng.</textarea></label></div></section><aside class="portal-card company-preview"><span class="eyebrow">Xem trước hồ sơ</span><div class="company-logo large">MF</div><h2>${c.name}</h2><p>${c.industry} · ${c.size}</p>${badge("Đã xác minh")}<hr><strong>Quyền lợi nổi bật</strong>${skillTags(["Hybrid linh hoạt","Bảo hiểm sức khỏe","Ngân sách học tập","Thưởng hiệu suất"])}</aside></div>`; }
    },
    billing: {
      title:"Gói dịch vụ & thanh toán", subtitle:"Theo dõi hạn mức, hóa đơn và nâng cấp theo nhu cầu.",
      actions:`<button class="btn btn-primary" data-scroll-plans>↑ Nâng cấp gói</button>`,
      render(){return `<section class="current-plan portal-card"><div><span class="eyebrow">Gói hiện tại</span><h2>Growth</h2><p>Gia hạn ngày 18/10/2026 · Thanh toán tự động</p></div><div class="usage"><div><span>Tin đang hoạt động</span><strong>8 / 15</strong><i><em style="width:53%"></em></i></div><div><span>Hồ sơ đã xem</span><strong>286 / 500</strong><i><em style="width:57%"></em></i></div></div></section><div class="plan-grid" id="plans">${data.plans.map(p=>`<article class="plan-card ${p.current?'featured':''}">${p.current?'<span class="plan-ribbon">Đang sử dụng</span>':''}<h3>${p.name}</h3><div class="plan-price">${p.price}<small>${p.period}</small></div><ul>${p.features.map(f=>`<li>✓ ${f}</li>`).join("")}</ul><button class="btn ${p.current?'btn-outline':'btn-primary'}" data-select-plan="${p.name}">${p.current?'Quản lý gói':'Chọn gói'}</button></article>`).join("")}</div><section class="portal-card"><div class="card-heading"><div><h2>Hóa đơn gần đây</h2><p>Lịch sử giao dịch của doanh nghiệp</p></div></div>${table(["Mã hóa đơn","Ngày","Gói","Số tiền","Trạng thái"],[`<tr><td>#MJ-2026-0901</td><td>18/09/2026</td><td>Growth</td><td>1.490.000đ</td><td>${badge("Đã thanh toán")}</td></tr>`,`<tr><td>#MJ-2026-0801</td><td>18/08/2026</td><td>Growth</td><td>1.490.000đ</td><td>${badge("Đã thanh toán")}</td></tr>`])}</section>`; }
    },
    profile: {
      title:"Hồ sơ nhà tuyển dụng", subtitle:"Quản lý thông tin cá nhân, quyền truy cập và bảo mật.",
      actions:`<button class="btn btn-primary" data-save-form>✓ Lưu thay đổi</button>`,
      render(){return `<div class="portal-grid profile-layout"><section class="portal-card"><div class="profile-identity"><div class="avatar large">LA</div><div><h2>Nguyễn Lan Anh</h2><p>Talent Acquisition Lead · FPT Digital Talent</p>${badge("Quản trị viên tuyển dụng")}</div></div><div class="form-grid"><label class="form-group"><span>Họ và tên</span><input class="form-control" value="Nguyễn Lan Anh"></label><label class="form-group"><span>Chức danh</span><input class="form-control" value="Talent Acquisition Lead"></label><label class="form-group"><span>Email công việc</span><input class="form-control" value="lananh@fpt.com"></label><label class="form-group"><span>Số điện thoại</span><input class="form-control" value="090 123 4567"></label></div></section><aside class="portal-card"><div class="card-heading"><div><h2>Bảo mật tài khoản</h2><p>Cập nhật lần cuối 12/09/2026</p></div></div><div class="setting-row"><div><strong>Xác thực hai bước</strong><span>Bảo vệ tài khoản khi đăng nhập</span></div><button class="switch active" aria-label="Bật xác thực hai bước"></button></div><div class="setting-row"><div><strong>Thông báo đăng nhập</strong><span>Gửi email khi có thiết bị mới</span></div><button class="switch active" aria-label="Bật thông báo"></button></div><button class="btn btn-outline full-width" data-demo-toast="Đã mở màn hình đổi mật khẩu">Đổi mật khẩu</button><div style="height:10px"></div><button class="btn btn-outline full-width text-danger" data-logout>⇥ Đăng xuất</button></aside></div>`; }
    }
  };

  const adminViews = {
    overview:{title:"Tổng quan hệ thống",subtitle:"Dữ liệu vận hành và cảnh báo ưu tiên theo thời gian thực.",actions:`<button class="btn btn-outline" data-demo-toast="Báo cáo hệ thống đã được tạo">⇩ Xuất báo cáo</button>`,render(){return `${metrics(data.metrics)}<div class="portal-grid portal-grid-main"><section class="portal-card"><div class="card-heading"><div><h2>Tăng trưởng nền tảng</h2><p>Người dùng mới trong 7 ngày</p></div><span class="status-chip is-success">+6,4%</span></div><div class="chart-bars admin-chart"><i style="height:52%"></i><i style="height:60%"></i><i style="height:48%"></i><i style="height:76%"></i><i style="height:71%"></i><i style="height:96%"></i><i style="height:84%"></i></div><div class="chart-labels"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div></section><section class="portal-card"><div class="card-heading"><div><h2>Cần xử lý</h2><p>Theo mức độ ưu tiên</p></div></div><button class="priority-item" data-view="reports"><span class="priority-icon tone-red">!</span><span><strong>3 báo cáo nghiêm trọng</strong><small>SLA gần nhất còn 38 phút</small></span><b>→</b></button><button class="priority-item" data-view="moderation"><span class="priority-icon tone-orange">◷</span><span><strong>8 doanh nghiệp chờ xác minh</strong><small>2 hồ sơ đã quá 24 giờ</small></span><b>→</b></button><button class="priority-item" data-view="moderation"><span class="priority-icon tone-purple">▣</span><span><strong>26 tin chờ duyệt</strong><small>8 tin được đánh dấu tự động</small></span><b>→</b></button></section></div><section class="portal-card"><div class="card-heading"><div><h2>Hoạt động quản trị gần đây</h2><p>Các thay đổi quan trọng được ghi lại</p></div><a href="#logs" data-view="logs">Xem nhật ký</a></div>${table(["Thời gian","Người thực hiện","Hành động","Đối tượng"],data.logs.slice(0,3).map(l=>`<tr><td>${l.time}</td><td>${l.actor}</td><td><code>${l.action}</code></td><td>${l.target}</td></tr>`))}</section>`;}},
    users:{title:"Quản lý người dùng",subtitle:"Theo dõi tài khoản, vai trò và trạng thái xác minh.",actions:`<button class="btn btn-primary" data-demo-toast="Đã mở form thêm người dùng">＋ Thêm người dùng</button>`,render(){return `<div class="filter-strip"><label class="inline-search grow">⌕ <input data-table-search placeholder="Tên, email hoặc mã người dùng"></label><select class="filter-input"><option>Tất cả vai trò</option><option>Ứng viên</option><option>Nhà tuyển dụng</option></select><select class="filter-input"><option>Tất cả trạng thái</option><option>Hoạt động</option><option>Tạm khóa</option></select></div>${table(["Người dùng","Vai trò","Ngày tham gia","Trạng thái",""],data.users.map(u=>`<tr><td><strong>${u.name}</strong><small>${u.id} · ${u.email}</small></td><td>${u.role}</td><td>${u.joined}</td><td>${badge(u.status)}</td><td><button class="table-action" data-demo-toast="Đã mở hồ sơ ${u.name}">Chi tiết</button><button class="table-action" data-confirm="Tạm khóa tài khoản ${u.name}?">•••</button></td></tr>`))}`;}},
    moderation:{title:"Kiểm duyệt nội dung",subtitle:"Đối soát doanh nghiệp và tin tuyển dụng trước khi xuất bản.",actions:`<button class="btn btn-outline" data-demo-toast="Đã mở cấu hình kiểm duyệt">⚙ Cấu hình quy tắc</button>`,render(){return `<div class="segmented wide"><button class="active">Tin tuyển dụng <b>${data.reviews.length}</b></button><button>Doanh nghiệp <b>8</b></button><button>Đã xử lý</button></div>${table(["Nội dung","Doanh nghiệp","Mức rủi ro","Gửi lúc","Trạng thái","Hành động"],data.reviews.map(r=>`<tr><td><strong>${r.title}</strong><small>${r.id}</small></td><td>${r.company}</td><td>${badge(r.risk)}</td><td>${r.submitted}</td><td>${badge(r.status)}</td><td><button class="table-action success" data-review="approve" data-id="${r.id}">Duyệt</button><button class="table-action danger" data-review="reject" data-id="${r.id}">Từ chối</button></td></tr>`))}`;}},
    reports:{title:"Báo cáo vi phạm",subtitle:"Ưu tiên trường hợp rủi ro cao và theo dõi thời hạn xử lý.",actions:`<button class="btn btn-outline" data-demo-toast="Đã mở bộ lọc nâng cao">☷ Bộ lọc</button>`,render(){return `<div class="report-summary"><div><strong>3</strong><span>Nghiêm trọng</span></div><div><strong>6</strong><span>Đang xử lý</span></div><div><strong>92%</strong><span>Đúng SLA</span></div></div>${table(["Mã báo cáo","Nội dung","Đối tượng","Mức độ","Thời gian","Trạng thái",""],data.reports.map(r=>`<tr><td><strong>${r.id}</strong></td><td><strong>${r.subject}</strong><small>Báo bởi ${r.reporter}</small></td><td>${r.target}</td><td>${badge(r.severity)}</td><td>${r.age}</td><td>${badge(r.status)}</td><td><button class="table-action" data-demo-toast="Đã mở ${r.id}">Xử lý →</button></td></tr>`))}`;}},
    categories:{title:"Danh mục hệ thống",subtitle:"Quản lý ngành nghề, kỹ năng và dữ liệu bộ lọc.",actions:`<button class="btn btn-outline" data-demo-toast="Đã mở công cụ nhập dữ liệu">⇧ Nhập dữ liệu</button><button class="btn btn-primary" data-demo-toast="Đã mở form tạo danh mục">＋ Tạo danh mục</button>`,render(){return `${table(["Danh mục","Số tin","Kỹ năng liên quan","Trạng thái",""],data.categories.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.jobs}</td><td>${c.skills}</td><td>${badge(c.status)}</td><td><button class="table-action" data-demo-toast="Đã mở ${c.name}">Chỉnh sửa</button></td></tr>`))}<section class="portal-card category-cloud"><div class="card-heading"><div><h2>Kỹ năng được dùng nhiều</h2><p>Có thể bấm để xem nhóm nghề liên quan</p></div></div>${skillTags(["JavaScript","React","Giao tiếp","SQL","Figma","Tiếng Anh","Quản lý dự án","Digital Marketing","Python","Bán hàng B2B"])}</section>`;}},
    system:{title:"Cấu hình hệ thống",subtitle:"Thiết lập quy tắc vận hành, bảo mật và tích hợp.",actions:`<button class="btn btn-primary" data-save-form>✓ Lưu thay đổi</button>`,render(){const settings=[["Tự động duyệt doanh nghiệp đã xác minh","Cho phép tin tiêu chuẩn được xuất bản ngay",true],["Phát hiện nội dung rủi ro","Đưa nội dung bất thường vào hàng chờ",true],["Email báo cáo hàng tuần","Gửi báo cáo vào sáng thứ Hai",false],["Chế độ bảo trì","Tạm dừng truy cập công khai",false],["Ẩn mức lương không minh bạch","Yêu cầu bổ sung khoảng lương",true]];return `<div class="portal-grid portal-grid-main"><section class="portal-card"><div class="card-heading"><div><h2>Cấu hình chung</h2><p>Quy tắc vận hành nền tảng</p></div></div>${settings.map(s=>`<div class="setting-row"><div><strong>${s[0]}</strong><span>${s[1]}</span></div><button class="switch ${s[2]?'active':''}" aria-label="${s[0]}"></button></div>`).join("")}</section><aside><section class="portal-card"><div class="card-heading"><div><h2>Tình trạng dịch vụ</h2><p>Cập nhật theo thời gian thực</p></div></div>${[["Web ứng viên","120ms"],["Web tuyển dụng","142ms"],["Matching service","320ms"],["Email service","98ms"],["Thanh toán","164ms"]].map(v=>`<div class="service-row"><span class="activity-dot tone-green"></span><div><strong>${v[0]}</strong><small>Online</small></div><b>${v[1]}</b></div>`).join("")}</section><section class="portal-card"><div class="card-heading"><h2>Bảo mật</h2></div><div class="info-row"><span>Hết hạn phiên</span><strong>30 phút</strong></div><div class="info-row"><span>Xác thực hai lớp</span><strong>Bắt buộc</strong></div></section></aside></div>`;}},
    logs:{title:"Nhật ký hệ thống",subtitle:"Tra cứu thay đổi quan trọng và sự kiện bảo mật.",actions:`<button class="btn btn-outline" data-demo-toast="Nhật ký đã được xuất">⇩ Xuất CSV</button>`,render(){return `<div class="filter-strip"><label class="inline-search grow">⌕ <input data-table-search placeholder="Tìm theo hành động, đối tượng hoặc người thực hiện"></label><input class="filter-input" type="date" value="2026-09-19"></div>${table(["Thời gian","Người thực hiện","Hành động","Đối tượng","Địa chỉ IP"],data.logs.map(l=>`<tr><td>${l.time}</td><td>${l.actor}</td><td><code>${l.action}</code></td><td>${l.target}</td><td>${l.ip}</td></tr>`))}`;}},
    notifications:{title:"Trung tâm thông báo",subtitle:"Theo dõi sự kiện cần xử lý và tùy chỉnh cảnh báo.",actions:`<button class="btn btn-outline" data-mark-read>✓ Đánh dấu đã đọc</button>`,render(){return `<div class="notification-list">${data.notifications.map(n=>`<article class="notification-card ${n.unread?'unread':''}"><span class="priority-icon tone-${n.tone}">${n.tone==='red'?'!':n.tone==='orange'?'◷':'✓'}</span><div class="grow"><strong>${n.title}</strong><p>${n.detail}</p><small>${n.time}</small></div><button class="table-action" data-demo-toast="Đã mở nội dung liên quan">Xem →</button></article>`).join("")}</div>`;}},
    profile:{title:"Hồ sơ quản trị viên",subtitle:"Quản lý thông tin cá nhân và phạm vi quản trị.",actions:`<button class="btn btn-primary" data-save-form>✓ Lưu thay đổi</button>`,render(){return `<div class="portal-grid profile-layout"><section class="portal-card"><div class="profile-identity"><div class="avatar large admin-avatar">AD</div><div><h2>Hà Minh Đức</h2><p>Platform Administrator</p>${badge("Super Admin")}</div></div><div class="form-grid"><label class="form-group"><span>Họ và tên</span><input class="form-control" value="Hà Minh Đức"></label><label class="form-group"><span>Email</span><input class="form-control" value="admin@matchajob.vn"></label><label class="form-group"><span>Số điện thoại</span><input class="form-control" value="090 888 2026"></label><label class="form-group"><span>Múi giờ</span><select class="form-control"><option>Asia/Ho_Chi_Minh</option></select></label></div></section><aside class="portal-card"><div class="card-heading"><div><h2>Phạm vi quyền</h2><p>Cập nhật bởi chủ sở hữu hệ thống</p></div></div>${skillTags(["Người dùng","Kiểm duyệt","Báo cáo","Danh mục","Cấu hình","Audit log"])}<hr><button class="btn btn-outline full-width" data-demo-toast="Đã mở màn hình bảo mật">Bảo mật tài khoản</button><div style="height:10px"></div><button class="btn btn-outline full-width text-danger" data-logout>⇥ Đăng xuất</button></aside></div>`;}}
  };

  function candidateRow(c){return `<div class="candidate-row"><div class="avatar">${c.initials}</div><div class="grow"><strong>${c.name}</strong><span>${c.role} · ${c.experience}</span></div><div class="match-score">${c.match}%</div><button class="table-action" data-demo-toast="Đã mở hồ sơ ${c.name}">Xem</button></div>`;}
  function candidateCard(c){return `<article class="candidate-card"><div class="candidate-card-head"><div class="avatar">${c.initials}</div><div class="grow"><h3>${c.name}</h3><p>${c.role}</p></div><span class="match-badge">${c.match}%</span></div><div class="candidate-meta"><span>◷ ${c.experience}</span><span>⌖ ${c.location}</span></div>${skillTags(c.skills)}<div class="candidate-card-actions"><button class="btn btn-outline btn-sm" data-demo-toast="Đã lưu ${c.name}">Lưu hồ sơ</button><button class="btn btn-primary btn-sm" data-demo-toast="Đã gửi lời mời cho ${c.name}">Mời ứng tuyển</button></div></article>`;}

  const views = role === "admin" ? adminViews : employerViews;
  const fallback = "overview";
  function currentView(){return location.hash.replace("#","") || fallback;}
  function render(viewName=currentView()){
    const view=views[viewName] || views[fallback];
    if(!views[viewName]) viewName=fallback;
    document.querySelectorAll("[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===viewName));
    title.textContent=view.title;
    subtitle.textContent=view.subtitle;
    headerActions(view.actions);
    content.innerHTML=view.render();
    content.dataset.currentView=viewName;
    wire();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  // --- EMPLOYER SAVED POSTS SYNC ---
  if(role === "employer" && data?.jobs) {
    try {
      const saved = JSON.parse(localStorage.getItem("matchajob-employer-posts") || "null");
      if(Array.isArray(saved) && saved.length > 0) {
        data.jobs = saved;
      } else {
        localStorage.setItem("matchajob-employer-posts", JSON.stringify(data.jobs));
      }
    } catch(e){}
  }

  function openModal(titleText,body,confirmText="Xác nhận"){
    const modal=document.querySelector("#portal-modal");
    if(!modal) return;
    modal.querySelector("[data-modal-title]").textContent=titleText;
    modal.querySelector("[data-modal-body]").innerHTML=body;
    modal.querySelector("[data-modal-confirm]").textContent=confirmText;
    modal.classList.add("show");
  }
  function closeModal(){document.querySelector("#portal-modal")?.classList.remove("show");}

  // --- JOB COMPOSER CONTROLLER (FOR EMPLOYER) ---
  const composerModal = document.querySelector("#job-composer-modal");
  let composerReqTags = ["1 năm kinh nghiệm chuyên môn", "Cao Đẳng trở lên", "Tiếng Anh Giao tiếp cơ bản"];
  let composerSpecTags = ["Sales Xuất nhập khẩu/Logistics khác", "Xuất nhập khẩu / Hải quan", "Logistic / Vận tải", "Hàng hải", "B2B", "Direct Sales", "Telesales", "Online Sales"];
  let composerInitialized = false;

  let currentSalaryCurrency = "Triệu VNĐ";
  let calViewYear = 2026;
  let calViewMonth = 9; // October (0-indexed: 9 = October)
  let calSelectedDate = "19/10/2026";

  function formatCalDate(d, m, y) {
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d)}/${pad(m + 1)}/${y}`;
  }

  function parseCalDate(str) {
    if(!str) return null;
    const parts = str.split("/");
    if(parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if(!isNaN(d) && !isNaN(m) && !isNaN(y)) return { d, m, y };
    }
    return null;
  }

  function renderCustomCalendar() {
    const titleEl = document.querySelector("#cal-title");
    const gridEl = document.querySelector("#cal-days-grid");
    if(!titleEl || !gridEl) return;

    titleEl.textContent = `Tháng ${calViewMonth + 1}/${calViewYear}`;
    gridEl.innerHTML = "";

    const firstDayObj = new Date(calViewYear, calViewMonth, 1);
    let startCol = firstDayObj.getDay();
    startCol = (startCol === 0 ? 6 : startCol - 1); // Monday is col 0, Sunday is col 6

    const totalDays = new Date(calViewYear, calViewMonth + 1, 0).getDate();

    const now = new Date();
    const todayStr = formatCalDate(now.getDate(), now.getMonth(), now.getFullYear());
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for(let i = 0; i < startCol; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "cal-day-cell empty";
      gridEl.appendChild(emptyCell);
    }

    for(let day = 1; day <= totalDays; day++) {
      const cellDate = new Date(calViewYear, calViewMonth, day);
      cellDate.setHours(0, 0, 0, 0);
      const isPast = cellDate < todayZero;

      const dateStr = formatCalDate(day, calViewMonth, calViewYear);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day-cell";
      cell.textContent = day;

      if(dateStr === calSelectedDate) {
        cell.classList.add("selected");
      }
      if(dateStr === todayStr) {
        cell.classList.add("today");
      }

      if(isPast) {
        cell.classList.add("disabled");
        cell.disabled = true;
        cell.title = "Không thể chọn ngày trong quá khứ";
      } else {
        cell.addEventListener("click", () => {
          calSelectedDate = dateStr;
          const input = document.querySelector("#composer-deadline");
          if(input) input.value = dateStr;
          renderCustomCalendar();
          closeCalendarPopup();
          renderLivePreview();
        });
      }

      gridEl.appendChild(cell);
    }

    // Disable prev button if viewing current month/year or past
    const isPastMonth = (calViewYear < now.getFullYear()) ||
      (calViewYear === now.getFullYear() && calViewMonth <= now.getMonth());
    const prevBtn = document.querySelector("#cal-prev");
    if(prevBtn) {
      prevBtn.disabled = isPastMonth;
      prevBtn.style.opacity = isPastMonth ? "0.3" : "1";
      prevBtn.style.cursor = isPastMonth ? "not-allowed" : "pointer";
    }
  }

  function openCalendarPopup() {
    const popup = document.querySelector("#custom-calendar-popup");
    if(!popup) return;
    const parsed = parseCalDate(calSelectedDate);
    if(parsed) {
      calViewYear = parsed.y;
      calViewMonth = parsed.m;
    }
    renderCustomCalendar();
    popup.classList.add("open");
    setTimeout(() => {
      const modalBody = document.querySelector(".composer-modal-body");
      if(modalBody) {
        modalBody.scrollBy({ top: 180, behavior: "smooth" });
      }
    }, 40);
  }

  function closeCalendarPopup() {
    document.querySelector("#custom-calendar-popup")?.classList.remove("open");
  }

  function formatSalaryNumberInput(input) {
    if(!input) return;
    const raw = input.value.replace(/\D/g, "");
    if(!raw) {
      input.value = "";
      return;
    }
    input.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function updateSalaryInputs(mode) {
    const host = document.querySelector("#composer-salary-inputs");
    if(!host) return;

    const existingCurr = document.querySelector("#composer-salary-currency")?.value;
    if(existingCurr) currentSalaryCurrency = existingCurr;

    const currencySelectHtml = `
      <select class="form-control salary-currency-select" id="composer-salary-currency" aria-label="Loại tiền tệ" style="width:140px;min-width:140px;flex-shrink:0;">
        <option value="Triệu VNĐ" ${currentSalaryCurrency === "Triệu VNĐ" ? "selected" : ""}>Triệu VNĐ</option>
        <option value="$" ${currentSalaryCurrency === "$" ? "selected" : ""}>$ (USD)</option>
      </select>
    `;

    if(mode === "range") {
      host.innerHTML = `
        <span>Khoảng lương <b class="req">*</b></span>
        <div class="salary-inputs-with-currency" style="display:flex;align-items:center;gap:8px;width:100%;">
          ${currencySelectHtml}
          <div class="salary-pair-inputs" style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
            <input type="text" inputmode="numeric" class="form-control salary-num-input" name="salary_min" id="composer-salary-min" placeholder="Từ (VD: 15,000,000)" value="15,000,000" style="min-width:60px;flex:1;">
            <span class="salary-separator" style="color:var(--muted);font-weight:800;font-size:13px;padding:0 2px;flex-shrink:0;">-</span>
            <input type="text" inputmode="numeric" class="form-control salary-num-input" name="salary_max" id="composer-salary-max" placeholder="Đến (VD: 25,000,000)" value="25,000,000" style="min-width:60px;flex:1;">
          </div>
        </div>`;
    } else if(mode === "from") {
      host.innerHTML = `
        <span>Mức lương tối thiểu <b class="req">*</b></span>
        <div class="salary-inputs-with-currency" style="display:flex;align-items:center;gap:8px;width:100%;">
          ${currencySelectHtml}
          <input type="text" inputmode="numeric" class="form-control salary-num-input" name="salary_from" id="composer-salary-from" placeholder="Nhập mức lương tối thiểu (VD: 15,000,000)" value="15,000,000" style="min-width:60px;flex:1;">
        </div>`;
    } else if(mode === "under") {
      host.innerHTML = `
        <span>Mức lương tối đa <b class="req">*</b></span>
        <div class="salary-inputs-with-currency" style="display:flex;align-items:center;gap:8px;width:100%;">
          ${currencySelectHtml}
          <input type="text" inputmode="numeric" class="form-control salary-num-input" name="salary_under" id="composer-salary-under" placeholder="Nhập mức lương tối đa (VD: 20,000,000)" value="20,000,000" style="min-width:60px;flex:1;">
        </div>`;
    } else {
      host.innerHTML = `
        <span>Mức lương</span>
        <div class="salary-note-badge">Mức lương hiển thị: <strong>Thỏa thuận</strong></div>`;
    }

    const currEl = document.querySelector("#composer-salary-currency");
    if(currEl) {
      currEl.addEventListener("change", (e) => {
        currentSalaryCurrency = e.target.value;
        renderLivePreview();
      });
    }

    host.querySelectorAll(".salary-num-input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        formatSalaryNumberInput(e.target);
        renderLivePreview();
      });
      inp.addEventListener("keydown", (e) => {
        if(["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) ||
           (e.ctrlKey || e.metaKey)) {
          return;
        }
        if(!/^\d$/.test(e.key)) {
          e.preventDefault();
        }
      });
      formatSalaryNumberInput(inp);
    });
  }

  function renderComposerTags() {
    const reqHost = document.querySelector("#container-tags-req");
    const specHost = document.querySelector("#container-tags-spec");
    if(reqHost) {
      reqHost.innerHTML = composerReqTags.map((t, idx) => `
        <span class="composer-tag-chip">${escapeHTML(t)}<button type="button" class="remove-btn" data-remove-req="${idx}" aria-label="Xóa tag">×</button></span>
      `).join("");
    }
    if(specHost) {
      specHost.innerHTML = composerSpecTags.map((t, idx) => `
        <span class="composer-tag-chip">${escapeHTML(t)}<button type="button" class="remove-btn" data-remove-spec="${idx}" aria-label="Xóa tag">×</button></span>
      `).join("");
    }
  }

  function addComposerTag(type, value) {
    const tag = (value || "").trim();
    if(!tag) return;
    if(type === "req") {
      if(!composerReqTags.includes(tag)) composerReqTags.push(tag);
    } else {
      if(!composerSpecTags.includes(tag)) composerSpecTags.push(tag);
    }
    renderComposerTags();
  }

  function updateToolbarState(editor, toolbar) {
    if(!toolbar) return;
    const boldBtn = toolbar.querySelector('[data-wysiwyg="bold"]');
    const bulletBtn = toolbar.querySelector('[data-wysiwyg="bullet"]');
    if(boldBtn) {
      boldBtn.classList.toggle("active", document.queryCommandState("bold"));
    }
    if(bulletBtn) {
      bulletBtn.classList.toggle("active", document.queryCommandState("insertUnorderedList"));
    }
  }

  function renderLivePreview() {
    const previewHost = document.querySelector("#employer-job-preview-pane");
    if(!previewHost) return;

    const title = document.querySelector("#composer-title")?.value || "Chưa đặt tiêu đề";
    const city = document.querySelector("#composer-city")?.value || "TP. Hồ Chí Minh";
    const address = document.querySelector("#composer-address")?.value || "";
    const jobLevel = document.querySelector("#composer-job-level")?.value || "Nhân viên";
    const workType = document.querySelector("#composer-work-type")?.value || "Toàn thời gian";
    const deadline = document.querySelector("#composer-deadline")?.value || "Chưa chọn";
    const exp = document.querySelector("#composer-experience")?.value || "Không yêu cầu kinh nghiệm";

    const salaryMode = document.querySelector("#composer-salary-mode")?.value;
    const curr = document.querySelector("#composer-salary-currency")?.value || currentSalaryCurrency;
    let salaryText = "Thỏa thuận";
    if(salaryMode === "range") {
      const min = document.querySelector("#composer-salary-min")?.value || "15";
      const max = document.querySelector("#composer-salary-max")?.value || "25";
      salaryText = `${min} - ${max} ${curr}`;
    } else if(salaryMode === "from") {
      const fromVal = document.querySelector("#composer-salary-from")?.value || "15";
      salaryText = `Từ ${fromVal} ${curr}`;
    } else if(salaryMode === "under") {
      const underVal = document.querySelector("#composer-salary-under")?.value || "20";
      salaryText = `Dưới ${underVal} ${curr}`;
    }

    const descHtml = document.querySelector("#composer-desc")?.innerHTML || "";
    const reqHtml = document.querySelector("#composer-req")?.innerHTML || "";
    const sumInd = document.querySelector("#composer-sum-industry")?.value || "Xuất nhập khẩu / Hải quan, Logistic / Vận tải, Hàng hải";
    const sumReq = document.querySelector("#composer-sum-req")?.value || "Tìm kiếm khách hàng, Đàm phán, Giao tiếp, Chăm Sóc Khách Hàng";
    const sumPref = document.querySelector("#composer-sum-pref")?.value || "Tiếng Anh giao tiếp, Tin học văn phòng, Am Hiểu Về Incoterms";
    const incomeHtml = document.querySelector("#composer-income")?.innerHTML || "";
    const benefitsHtml = document.querySelector("#composer-benefits")?.innerHTML || "";
    const scheduleHtml = document.querySelector("#composer-schedule")?.innerHTML || "";
    const mapLink = document.querySelector("#composer-map-link")?.value || "";

    previewHost.innerHTML = `
      <div class="prev-hero">
        <h2 class="prev-title">${escapeHTML(title)}</h2>
        <div class="prev-tags-row">
          <span class="prev-city-badge">⌖ ${escapeHTML(city)}</span>
          <span class="prev-badge salary">₫ ${escapeHTML(salaryText)}</span>
          <span class="prev-badge">💼 ${escapeHTML(jobLevel)}</span>
          <span class="prev-badge">⏰ ${escapeHTML(workType)}</span>
          <span class="prev-badge">◷ ${escapeHTML(exp)}</span>
          <span class="prev-badge">📅 Hạn nộp: ${escapeHTML(deadline)}</span>
        </div>
        ${address ? `<p class="muted" style="margin:10px 0 0;font-size:12px">📍 Địa chỉ làm việc: ${escapeHTML(address)}</p>` : ''}
      </div>

      <!-- Khối Tổng quan tags (Hình 2) -->
      <section class="prev-overview-card">
        <div class="prev-overview-head">
          <h4><span class="title-bar"></span>Tổng quan</h4>
          <span class="status-chip is-success" style="cursor:pointer">🔔 Gửi tôi việc làm tương tự</span>
        </div>
        <div class="prev-overview-row">
          <strong>Yêu cầu:</strong>
          <div class="prev-tag-chips">
            ${composerReqTags.map(t=>`<span class="prev-tag-chip">${escapeHTML(t)}</span>`).join("")}
          </div>
        </div>
        <div class="prev-overview-row">
          <strong>Chuyên môn:</strong>
          <div class="prev-tag-chips">
            ${composerSpecTags.map(t=>`<span class="prev-tag-chip">${escapeHTML(t)}</span>`).join("")}
          </div>
        </div>
      </section>

      <!-- Khối Mô tả công việc (Hình 3) -->
      <section class="prev-section">
        <div class="prev-section-title"><span class="title-bar"></span>Mô tả công việc</div>
        <div class="prev-rich-content">${descHtml}</div>
      </section>

      <!-- Khối Yêu cầu ứng viên (Hình 4) -->
      <section class="prev-section">
        <div class="prev-section-title"><span class="title-bar"></span>Yêu cầu ứng viên</div>
        <div class="prev-rich-content">${reqHtml}</div>
      </section>

      <!-- Khối Yêu cầu tóm tắt (Hình 5) -->
      <section class="prev-section">
        <div class="prev-section-title"><span class="title-bar"></span>Yêu cầu tóm tắt</div>
        <div class="prev-summary-card">
          <div class="prev-summary-row">
            <span class="prev-summary-icon">💡</span>
            <div class="prev-summary-text">
              <small>Kiến thức ngành</small>
              <strong>${escapeHTML(sumInd)}</strong>
            </div>
          </div>
          <div class="prev-summary-row">
            <span class="prev-summary-icon">📐</span>
            <div class="prev-summary-text">
              <small>Kỹ năng cần có</small>
              <strong>${escapeHTML(sumReq)}</strong>
            </div>
          </div>
          <div class="prev-summary-row">
            <span class="prev-summary-icon">✏️</span>
            <div class="prev-summary-text">
              <small>Kỹ năng nên có</small>
              <strong>${escapeHTML(sumPref)}</strong>
            </div>
          </div>
        </div>
      </section>

      ${incomeHtml ? `
      <!-- Khối Thu nhập -->
      <section class="prev-section">
        <div class="prev-section-title"><span class="title-bar"></span>Thu nhập & Chính sách đãi ngộ</div>
        <div class="prev-rich-content">${incomeHtml}</div>
      </section>` : ''}

      ${benefitsHtml ? `
      <!-- Khối Quyền lợi -->
      <section class="prev-section">
        <div class="prev-section-title"><span class="title-bar"></span>Quyền lợi ứng viên</div>
        <div class="prev-rich-content">${benefitsHtml}</div>
      </section>` : ''}

      <!-- Khối Địa điểm & Thời gian làm việc -->
      <section class="prev-section">
        <div class="prev-section-title"><span class="title-bar"></span>Địa điểm & Thời gian làm việc</div>
        <div class="prev-rich-content">${scheduleHtml}</div>
        ${mapLink ? `
          <div style="margin-top:14px">
            <a href="${escapeHTML(mapLink)}" target="_blank" class="btn btn-outline btn-sm">
              📍 Mở vị trí công ty trên Google Maps ↗
            </a>
          </div>` : ''}
      </section>
    `;
  }

  function saveJobPosting(status="Đang tuyển") {
    const titleInput = document.querySelector("#composer-title");
    const title = titleInput?.value?.trim();
    if(!title) {
      window.MatchaJob.toast("Vui lòng nhập tên vị trí tuyển dụng!");
      titleInput?.focus();
      return;
    }

    const city = document.querySelector("#composer-city")?.value || "TP. Hồ Chí Minh";
    const address = document.querySelector("#composer-address")?.value || "";
    const jobLevel = document.querySelector("#composer-job-level")?.value || "Nhân viên";
    const workType = document.querySelector("#composer-work-type")?.value || "Toàn thời gian";
    const deadline = document.querySelector("#composer-deadline")?.value || "19/10/2026";
    const exp = document.querySelector("#composer-experience")?.value || "1 năm kinh nghiệm";

    const salaryMode = document.querySelector("#composer-salary-mode")?.value;
    const curr = document.querySelector("#composer-salary-currency")?.value || currentSalaryCurrency;
    let salaryText = "Thỏa thuận";
    if(salaryMode === "range") {
      const min = document.querySelector("#composer-salary-min")?.value || "15";
      const max = document.querySelector("#composer-salary-max")?.value || "25";
      salaryText = `${min} - ${max} ${curr}`;
    } else if(salaryMode === "from") {
      const fromVal = document.querySelector("#composer-salary-from")?.value || "15";
      salaryText = `Từ ${fromVal} ${curr}`;
    } else if(salaryMode === "under") {
      const underVal = document.querySelector("#composer-salary-under")?.value || "20";
      salaryText = `Dưới ${underVal} ${curr}`;
    }

    const newJob = {
      id: "J" + (data.jobs.length + 101),
      title: title,
      team: "FPT Talent",
      location: city.includes("Hồ Chí Minh") ? "TP.HCM" : city,
      fullAddress: address,
      jobLevel: jobLevel,
      workType: workType,
      salary: salaryText,
      applicants: 0,
      views: 1,
      posted: "Hôm nay",
      status: status,
      deadline: deadline,
      exp: exp,
      desc: document.querySelector("#composer-desc")?.innerHTML || "",
      req: document.querySelector("#composer-req")?.innerHTML || ""
    };

    data.jobs.unshift(newJob);
    try {
      localStorage.setItem("matchajob-employer-posts", JSON.stringify(data.jobs));
    } catch(e){}

    closeJobComposer();
    window.MatchaJob.toast(status === "Đang tuyển" ? `Đã đăng tin: "${title}" thành công!` : `Đã lưu bản nháp: "${title}"`);
    render(location.hash.replace("#","") || "jobs");
  }

  function initComposer() {
    if(composerInitialized || !composerModal) return;
    composerInitialized = true;

    // Default deadline to 19/10/2026
    const deadlineInput = document.querySelector("#composer-deadline");
    if(deadlineInput && !deadlineInput.value) {
      deadlineInput.value = calSelectedDate;
    }

    // Initialize custom calendar controls
    document.querySelector("#cal-prev")?.addEventListener("click", () => {
      const now = new Date();
      if (calViewYear < now.getFullYear() || (calViewYear === now.getFullYear() && calViewMonth <= now.getMonth())) {
        return;
      }
      calViewMonth--;
      if(calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
      renderCustomCalendar();
    });
    document.querySelector("#cal-next")?.addEventListener("click", () => {
      calViewMonth++;
      if(calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
      renderCustomCalendar();
    });
    document.querySelector("#cal-btn-today")?.addEventListener("click", () => {
      const now = new Date();
      calSelectedDate = formatCalDate(now.getDate(), now.getMonth(), now.getFullYear());
      calViewYear = now.getFullYear();
      calViewMonth = now.getMonth();
      if(deadlineInput) deadlineInput.value = calSelectedDate;
      renderCustomCalendar();
      closeCalendarPopup();
      renderLivePreview();
    });
    document.querySelector("#cal-btn-30d")?.addEventListener("click", () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      calSelectedDate = formatCalDate(future.getDate(), future.getMonth(), future.getFullYear());
      calViewYear = future.getFullYear();
      calViewMonth = future.getMonth();
      if(deadlineInput) deadlineInput.value = calSelectedDate;
      renderCustomCalendar();
      closeCalendarPopup();
      renderLivePreview();
    });
    document.querySelector("#cal-btn-done")?.addEventListener("click", closeCalendarPopup);

    document.querySelector("#btn-open-datepicker")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const popup = document.querySelector("#custom-calendar-popup");
      if(popup?.classList.contains("open")) closeCalendarPopup();
      else openCalendarPopup();
    });
    deadlineInput?.addEventListener("click", (e) => {
      e.stopPropagation();
      openCalendarPopup();
    });

    document.addEventListener("click", (e) => {
      const wrap = document.querySelector("#composer-datepicker-wrap");
      if(wrap && !wrap.contains(e.target)) {
        closeCalendarPopup();
      }
    });

    // Initialize salary inputs
    const salaryMode = document.querySelector("#composer-salary-mode");
    if(salaryMode) {
      updateSalaryInputs(salaryMode.value);
      salaryMode.addEventListener("change", () => {
        updateSalaryInputs(salaryMode.value);
        renderLivePreview();
      });
    }

    // Initial tags
    renderComposerTags();

    // Wire tag adding
    const inputReq = document.querySelector("#input-tag-req");
    const btnAddReq = document.querySelector("#btn-add-tag-req");
    if(btnAddReq && inputReq) {
      btnAddReq.addEventListener("click", () => {
        addComposerTag("req", inputReq.value);
        inputReq.value = "";
      });
      inputReq.addEventListener("keydown", e => {
        if(e.key === "Enter") {
          e.preventDefault();
          addComposerTag("req", inputReq.value);
          inputReq.value = "";
        }
      });
    }

    const inputSpec = document.querySelector("#input-tag-spec");
    const btnAddSpec = document.querySelector("#btn-add-tag-spec");
    if(btnAddSpec && inputSpec) {
      btnAddSpec.addEventListener("click", () => {
        addComposerTag("spec", inputSpec.value);
        inputSpec.value = "";
      });
      inputSpec.addEventListener("keydown", e => {
        if(e.key === "Enter") {
          e.preventDefault();
          addComposerTag("spec", inputSpec.value);
          inputSpec.value = "";
        }
      });
    }

    // Suggest tags click
    document.querySelectorAll("#suggest-tags-req .chip-add").forEach(chip => {
      chip.addEventListener("click", () => addComposerTag("req", chip.dataset.tag));
    });
    document.querySelectorAll("#suggest-tags-spec .chip-add").forEach(chip => {
      chip.addEventListener("click", () => addComposerTag("spec", chip.dataset.tag));
    });

    // Tag removal click
    composerModal.addEventListener("click", e => {
      if(e.target.dataset.removeReq !== undefined) {
        composerReqTags.splice(Number(e.target.dataset.removeReq), 1);
        renderComposerTags();
      } else if(e.target.dataset.removeSpec !== undefined) {
        composerSpecTags.splice(Number(e.target.dataset.removeSpec), 1);
        renderComposerTags();
      }
    });

    // Default template contents for contenteditable rich editor boxes
    const descBox = document.querySelector("#composer-desc");
    if(descBox && !descBox.innerHTML.trim()) {
      descBox.innerHTML = `<ul>
<li>Nghiên cứu thị trường, tìm kiếm khách hàng có nhu cầu vận chuyển hàng hóa nội địa và quốc tế, xuất nhập khẩu hàng hóa.</li>
<li>Tư vấn và giới thiệu các dịch vụ Logistics phù hợp với nhu cầu khách hàng/đại lý với mức giá cạnh tranh.</li>
<li>Tiếp cận khách hàng (gọi điện, email, gặp mặt v.v...), tổng hợp báo giá cho khách hàng và xúc tiến ký kết các hợp đồng.</li>
<li>Phát triển khách hàng mới và duy trì mối quan hệ với khách hàng cũ, mở rộng mạng lưới khách hàng trong nước/quốc tế: thường xuyên giữ liên lạc qua các kênh như Email, WeChat, WhatsApp, Zalo, Teams...</li>
<li>Đạt KPI về sản lượng và lợi nhuận do Ban Giám đốc giao.</li>
<li>Báo cáo định kỳ về hiệu suất làm việc và các vấn đề phát sinh cho quản lý trực tiếp theo yêu cầu.</li>
<li>Hoàn thành chỉ tiêu doanh số, lợi nhuận đề ra.</li>
</ul>`;
    }

    const reqBox = document.querySelector("#composer-req");
    if(reqBox && !reqBox.innerHTML.trim()) {
      reqBox.innerHTML = `<ul>
<li>Tốt nghiệp <strong>Đại học/Cao đẳng</strong> các ngành Kinh tế, chuyên ngành Xuất nhập khẩu, Ngoại thương, Quản trị kinh doanh, Kinh tế vận tải biển...</li>
<li>Kinh nghiệm làm việc <strong>1 năm trong ngành Logistics</strong></li>
<li><strong>Tiếng Anh giao tiếp</strong> tốt là một lợi thế</li>
<li>Sử dụng thành thạo <strong>tin học văn phòng</strong>.</li>
<li>Có <strong>định hướng lâu dài</strong> theo ngành Sales Logistics.</li>
<li>Năng động, chăm chỉ và có <strong>đam mê</strong> với kinh doanh.</li>
<li><strong>Khả năng</strong> đàm phán, thuyết phục, giao tiếp và chăm sóc khách hàng tốt.</li>
<li><strong>Tinh thần</strong> làm việc nhóm, chịu áp lực trong công việc, có trách nhiệm cao.</li>
</ul>`;
    }

    const incomeBox = document.querySelector("#composer-income");
    if(incomeBox && !incomeBox.innerHTML.trim()) {
      incomeBox.innerHTML = `<ul>
<li>Lương cơ bản: <strong>15.000.000đ - 25.000.000đ/tháng</strong> (thỏa thuận theo năng lực và kinh nghiệm thực tế)</li>
<li><strong>Hoa hồng theo doanh số</strong>: 3% - 6% lợi nhuận gộp theo từng lô hàng, không giới hạn mức trần.</li>
<li><strong>Phụ cấp</strong>: Ăn trưa 50.000đ/ngày, tiền điện thoại, xăng xe công tác và tiếp khách.</li>
<li><strong>Thưởng định kỳ</strong>: Thưởng hiệu suất hàng tháng, thưởng nóng khi chốt hợp đồng lớn, thưởng lương tháng thứ 13 và thưởng KPI năm.</li>
</ul>`;
    }

    const benefitsBox = document.querySelector("#composer-benefits");
    if(benefitsBox && !benefitsBox.innerHTML.trim()) {
      benefitsBox.innerHTML = `<ul>
<li>Đầy đủ chế độ <strong>BHXH, BHYT, BHTN</strong> theo quy định của Luật Lao động ngay sau thử việc.</li>
<li>Tham gia gói <strong>bảo hiểm sức khỏe cao cấp FPT Care</strong> dành cho nhân viên và người thân.</li>
<li>Chế độ <strong>review tăng lương định kỳ 2 lần/năm</strong> dựa trên năng lực và đóng góp thực tế.</li>
<li>Du lịch nghỉ dưỡng cao cấp hàng năm (Resort 4-5 sao), teambuilding định kỳ hàng quý.</li>
<li>Được đào tạo bài bản về <strong>kỹ năng đàm phán thương mại quốc tế</strong> và phần mềm quản trị logistics hiện đại.</li>
<li>Cơ hội thăng tiến lên vị trí <strong>Team Leader / Trưởng phòng Kinh doanh</strong> sau 1 - 2 năm.</li>
</ul>`;
    }

    const scheduleBox = document.querySelector("#composer-schedule");
    if(scheduleBox && !scheduleBox.innerHTML.trim()) {
      scheduleBox.innerHTML = `<ul>
<li>Thứ 2 - Thứ 6: 08h00 - 17h30 (nghỉ trưa 12h00 - 13h30)</li>
<li>Thứ 7: 08h00 - 12h00 (buổi chiều và Chủ Nhật nghỉ)</li>
<li>Hỗ trợ làm việc linh hoạt (Remote/Hybrid) theo đặc thù dự án.</li>
</ul>`;
    }

    // WYSIWYG Toolbar button interactions (Word-like behavior)
    document.querySelectorAll("[data-wysiwyg]").forEach(btn => {
      btn.addEventListener("mousedown", (e) => {
        // e.preventDefault() preserves cursor / selection in contenteditable and avoids page scroll jump!
        e.preventDefault();
        const cmd = btn.dataset.wysiwyg;
        const targetId = btn.dataset.target;
        const editor = document.getElementById(targetId);
        if(!editor) return;

        if(document.activeElement !== editor && !editor.contains(document.activeElement)) {
          editor.focus();
        }

        if(cmd === "bold") {
          document.execCommand("bold", false, null);
        } else if(cmd === "bullet") {
          document.execCommand("insertUnorderedList", false, null);
        }
        updateToolbarState(editor, btn.closest(".mini-toolbar"));
        renderLivePreview();
      });
    });

    // Track active states on typing / selection change
    document.querySelectorAll(".rich-editor-box").forEach(box => {
      const toolbar = box.previousElementSibling?.querySelector(".mini-toolbar");
      const syncHandler = () => updateToolbarState(box, toolbar);
      box.addEventListener("keyup", syncHandler);
      box.addEventListener("mouseup", syncHandler);
      box.addEventListener("focus", syncHandler);
      box.addEventListener("input", renderLivePreview);
    });

    // Input changes trigger live preview update
    ["#composer-title", "#composer-city", "#composer-address", "#composer-job-level", "#composer-work-type", "#composer-experience", "#composer-sum-industry", "#composer-sum-req", "#composer-sum-pref", "#composer-map-link"].forEach(sel => {
      document.querySelector(sel)?.addEventListener("input", renderLivePreview);
      document.querySelector(sel)?.addEventListener("change", renderLivePreview);
    });

    // Test map button
    document.querySelector("#btn-test-map")?.addEventListener("click", () => {
      const mapLink = document.querySelector("#composer-map-link")?.value?.trim();
      if(mapLink) {
        window.open(mapLink, "_blank");
      } else {
        window.MatchaJob.toast("Vui lòng nhập link Google Maps trước");
      }
    });

    // Switch between Edit and Preview tabs
    document.querySelectorAll("[data-composer-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.composerTab;
        document.querySelectorAll("[data-composer-tab]").forEach(b => b.classList.toggle("active", b === btn));
        const formPane = document.querySelector("#employer-job-composer-form");
        const prevPane = document.querySelector("#employer-job-preview-pane");
        if(tab === "preview") {
          formPane?.classList.remove("active");
          prevPane?.classList.add("active");
          renderLivePreview();
        } else {
          formPane?.classList.add("active");
          prevPane?.classList.remove("active");
        }
      });
    });

    // Close buttons
    document.querySelectorAll("[data-composer-close]").forEach(btn => {
      btn.addEventListener("click", closeJobComposer);
    });
    composerModal.addEventListener("click", e => {
      if(e.target === composerModal) closeJobComposer();
    });

    // Publish and Draft buttons
    document.querySelector("#btn-publish-job")?.addEventListener("click", () => saveJobPosting("Đang tuyển"));
    document.querySelector("#btn-save-draft")?.addEventListener("click", () => saveJobPosting("Bản nháp"));
  }

  function openJobComposer() {
    if(!composerModal) return;
    initComposer();
    // Reset to edit tab
    document.querySelectorAll("[data-composer-tab]").forEach(b => b.classList.toggle("active", b.dataset.composerTab === "edit"));
    document.querySelector("#employer-job-composer-form")?.classList.add("active");
    document.querySelector("#employer-job-preview-pane")?.classList.remove("active");
    composerModal.classList.add("show");
  }

  function closeJobComposer() {
    composerModal?.classList.remove("show");
  }

  function wire(){
    document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",e=>{e.preventDefault();location.hash=btn.dataset.view;}));
    document.querySelectorAll("[data-demo-toast]").forEach(btn=>btn.addEventListener("click",()=>window.MatchaJob.toast(btn.dataset.demoToast)));
    document.querySelectorAll("[data-confirm]").forEach(btn=>btn.addEventListener("click",()=>openModal("Xác nhận thao tác",`<p>${escapeHTML(btn.dataset.confirm)}</p><p class="muted">Thao tác sẽ được lưu dưới dạng dữ liệu demo trên trình duyệt.</p>`,"Xác nhận")));
    document.querySelectorAll(".switch").forEach(btn=>btn.addEventListener("click",()=>btn.classList.toggle("active")));
    document.querySelectorAll("[data-save-form]").forEach(btn=>btn.addEventListener("click",()=>window.MatchaJob.toast("Đã lưu thay đổi demo")));
    document.querySelectorAll("[data-open-composer]").forEach(btn=>btn.addEventListener("click",openJobComposer));
    document.querySelectorAll("[data-open-interview]").forEach(btn=>btn.addEventListener("click",()=>openModal("Tạo lịch phỏng vấn",`<form class="form-grid"><label class="form-group full"><span>Ứng viên</span><select class="form-control">${data.candidates.map(c=>`<option>${c.name} · ${c.role}</option>`).join("")}</select></label><label class="form-group"><span>Ngày</span><input type="date" class="form-control" value="2026-09-20"></label><label class="form-group"><span>Giờ</span><input type="time" class="form-control" value="09:00"></label><label class="form-group full"><span>Hình thức</span><select class="form-control"><option>Google Meet</option><option>Trực tiếp tại văn phòng</option></select></label></form>`,"Tạo lịch")));
    document.querySelectorAll("[data-review]").forEach(btn=>btn.addEventListener("click",()=>openModal(btn.dataset.review==="approve"?"Phê duyệt tin tuyển dụng":"Từ chối tin tuyển dụng",`<p>Bạn đang xử lý hồ sơ <strong>${btn.dataset.id}</strong>.</p><label class="form-group"><span>Ghi chú kiểm duyệt</span><textarea class="form-control" placeholder="Nhập ghi chú cho nhà tuyển dụng"></textarea></label>`,btn.dataset.review==="approve"?"Phê duyệt":"Từ chối")));
    document.querySelectorAll("[data-select-plan]").forEach(btn=>btn.addEventListener("click",()=>openModal("Xác nhận gói dịch vụ",`<p>Bạn đã chọn gói <strong>${escapeHTML(btn.dataset.selectPlan)}</strong>.</p><div class="payment-summary"><span>Tạm tính</span><strong>${btn.dataset.selectPlan==="Growth"?"1.490.000đ":"Liên hệ tư vấn"}</strong></div><label class="form-group"><span>Phương thức thanh toán</span><select class="form-control"><option>Thẻ nội địa / QR</option><option>Thẻ quốc tế</option><option>Chuyển khoản doanh nghiệp</option></select></label>`,"Tiếp tục thanh toán")));
    document.querySelector("[data-scroll-plans]")?.addEventListener("click",()=>document.querySelector("#plans")?.scrollIntoView({behavior:"smooth"}));
    document.querySelector("[data-mark-read]")?.addEventListener("click",()=>{document.querySelectorAll(".notification-card.unread").forEach(n=>n.classList.remove("unread"));window.MatchaJob.toast("Đã đánh dấu tất cả là đã đọc")});
    document.querySelectorAll("[data-logout]").forEach(btn=>btn.addEventListener("click",e=>{e.preventDefault();window.MatchaJob.logout();}));
    document.querySelectorAll("[data-table-search],[data-card-search]").forEach(input=>input.addEventListener("input",()=>{const q=input.value.toLowerCase();const selector=input.matches("[data-card-search]")?".candidate-card":"tbody tr";content.querySelectorAll(selector).forEach(item=>item.classList.toggle("hidden",!item.textContent.toLowerCase().includes(q)));}));
  }

  document.querySelectorAll("[data-modal-close]").forEach(btn=>btn.addEventListener("click",closeModal));
  document.querySelector("#portal-modal")?.addEventListener("click",e=>{if(e.target.id==="portal-modal") closeModal();});
  document.querySelector("[data-modal-confirm]")?.addEventListener("click",()=>{closeModal();window.MatchaJob.toast("Thao tác demo đã được cập nhật")});
  window.addEventListener("hashchange",()=>render());
  render();
})();
