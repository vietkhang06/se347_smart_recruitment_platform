(function(){
  const jobs = window.MATCHAJOB_DATA?.jobs || [];
  const safe = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const card = job => `<article class="job-card compact-card">
    <div class="job-card-top"><div class="logo-box">${safe(job.logo)}</div><div class="job-card-main"><h3 class="job-title"><a href="job-detail.html?id=${job.id}">${safe(job.title)}</a></h3><div class="company-name">${safe(job.company)}</div></div><button class="favorite-btn active" data-favorite="${job.id}" title="Bỏ lưu">♥</button></div>
    <div class="job-tags"><span class="pill">${safe(job.salary)}</span><span class="pill success">${job.match}% phù hợp</span></div>
    <div class="job-meta"><span>${safe(job.location)}</span><span>${safe(job.type)}</span><span>${safe(job.exp)}</span></div>
    <div class="job-card-footer"><span class="tiny">${safe(job.posted)}</span><a class="btn btn-soft btn-sm" href="job-detail.html?id=${job.id}">Xem chi tiết</a></div>
  </article>`;

  const savedHost=document.querySelector("[data-saved-jobs]");
  if(savedHost){
    let ids=window.MatchaJob.getFavorites();
    if(!ids.length){ids=[1,2,5]; localStorage.setItem("matchajob-favorites",JSON.stringify(ids));}
    const render=()=>{
      const current=window.MatchaJob.getFavorites();
      const list=jobs.filter(j=>current.includes(j.id));
      savedHost.innerHTML=list.length?list.map(card).join(""):`<div class="empty-state"><strong>Chưa có việc làm đã lưu</strong><p>Lưu những vị trí bạn quan tâm để xem lại sau.</p><a class="btn btn-primary" href="jobs.html">Khám phá việc làm</a></div>`;
      savedHost.querySelectorAll("[data-favorite]").forEach(btn=>btn.addEventListener("click",()=>{window.MatchaJob.toggleFavorite(Number(btn.dataset.favorite));render();window.MatchaJob.toast("Đã bỏ lưu công việc");}));
    };
    render();
  }

  const applicationsHost=document.querySelector("[data-applications]");
  if(applicationsHost){
    const stored=JSON.parse(localStorage.getItem("matchajob-applications")||"[]");
    const defaults=[
      {title:"Senior Product Designer",company:"FPT Digital Talent",logo:"FP",date:"18/09/2026",stage:"Phỏng vấn",next:"19/09 · 09:00"},
      {title:"Product Designer",company:"Tiki",logo:"TK",date:"14/09/2026",stage:"Bài kiểm tra",next:"Hạn nộp 20/09"},
      {title:"UI/UX Designer",company:"VNG",logo:"VN",date:"09/09/2026",stage:"Đã xem hồ sơ",next:"Đang chờ phản hồi"}
    ];
    const items=[...stored.map((a,i)=>({title:a.jobTitle||"Vị trí đã ứng tuyển",company:a.company||"Doanh nghiệp",logo:"MJ",date:new Date(a.at).toLocaleDateString("vi-VN"),stage:"Đã gửi hồ sơ",next:"Đang chờ phản hồi",id:`local-${i}`})),...defaults];
    applicationsHost.innerHTML=items.map((a,i)=>`<article class="application-card"><div class="logo-box">${a.logo}</div><div class="application-main"><div><h3>${safe(a.title)}</h3><p>${safe(a.company)} · Ứng tuyển ${safe(a.date)}</p></div><span class="status-chip ${a.stage==='Phỏng vấn'?'is-success':a.stage==='Bài kiểm tra'?'is-warning':'is-neutral'}">${safe(a.stage)}</span><div class="application-timeline"><i class="done"></i><i class="done"></i><i class="${a.stage==='Phỏng vấn'?'done':''}"></i><i></i></div><small>Bước tiếp theo: ${safe(a.next)}</small></div><button class="table-action" data-demo="${i}">Chi tiết →</button></article>`).join("");
    applicationsHost.querySelectorAll("[data-demo]").forEach(btn=>btn.addEventListener("click",()=>window.MatchaJob.toast("Đã mở tiến trình ứng tuyển demo")));
  }

  const profileForm=document.querySelector("#candidate-profile-form");
  profileForm?.addEventListener("submit",e=>{e.preventDefault();const payload=Object.fromEntries(new FormData(profileForm));localStorage.setItem("matchajob-candidate-profile",JSON.stringify(payload));window.MatchaJob.toast("Đã lưu hồ sơ");});
  const savedProfile=JSON.parse(localStorage.getItem("matchajob-candidate-profile")||"null");
  if(profileForm && savedProfile){Object.entries(savedProfile).forEach(([key,value])=>{const field=profileForm.elements[key];if(field)field.value=value;});}

  document.querySelector("[data-cv-check]")?.addEventListener("click",()=>{
    const panel=document.querySelector("[data-cv-result]");
    panel.classList.remove("hidden");
    panel.scrollIntoView({behavior:"smooth",block:"center"});
    window.MatchaJob.toast("Đã hoàn tất kiểm tra CV mẫu");
  });
})();
