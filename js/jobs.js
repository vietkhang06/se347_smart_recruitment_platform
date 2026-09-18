(function(){
  const jobs = window.JOBLY_DATA?.jobs || [];

  function card(job){
    const isFav = window.Jobly.getFavorites().includes(job.id);
    return `
      <article class="job-card">
        <div class="job-card-top">
          <div class="logo-box">${job.logo}</div>
          <div class="job-card-main">
            <h3 class="job-title"><a href="job-detail.html?id=${job.id}">${job.title}</a></h3>
            <div class="company-name">${job.company}</div>
          </div>
          <button class="favorite-btn ${isFav ? "active":""}" data-favorite="${job.id}" title="Lưu công việc">${isFav ? "♥":"♡"}</button>
        </div>
        <div class="job-tags">
          <span class="pill">${job.salary}</span>
          <span class="pill success">${job.match}% phù hợp</span>
        </div>
        <div class="job-meta">
          <span>${job.location}</span>
          <span>${job.type}</span>
          <span>${job.exp}</span>
        </div>
        <div class="job-card-footer">
          <span class="tiny">${job.posted}</span>
          <a class="btn btn-soft btn-sm" href="job-detail.html?id=${job.id}">Xem chi tiết</a>
        </div>
      </article>`;
  }

  function wireFavorites(scope=document){
    scope.querySelectorAll("[data-favorite]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const id = Number(btn.dataset.favorite);
        const active = window.Jobly.toggleFavorite(id);
        btn.classList.toggle("active",active);
        btn.textContent = active ? "♥":"♡";
        window.Jobly.toast(active ? "Đã lưu công việc" : "Đã bỏ lưu công việc");
      });
    });
  }

  const featured = document.querySelector("[data-featured-jobs]");
  if(featured){
    featured.innerHTML = jobs.slice(0,3).map(card).join("");
    wireFavorites(featured);
  }

  const jobsGrid = document.querySelector("[data-jobs-grid]");
  if(jobsGrid){
    const qInput = document.querySelector("#filter-q");
    const locSelect = document.querySelector("#filter-location");
    const typeSelect = document.querySelector("#filter-type");
    const sortSelect = document.querySelector("#sort-jobs");
    const resultCount = document.querySelector("[data-result-count]");

    const params = new URLSearchParams(location.search);
    if(qInput) qInput.value = params.get("q") || "";
    if(locSelect && params.get("location")){
      [...locSelect.options].forEach(o=>{
        if(o.value.toLowerCase().includes(params.get("location").toLowerCase())) locSelect.value=o.value;
      });
    }

    function render(){
      const q=(qInput?.value || "").trim().toLowerCase();
      const loc=locSelect?.value || "";
      const type=typeSelect?.value || "";
      const sort=sortSelect?.value || "match";

      let filtered = jobs.filter(job=>{
        const hay = `${job.title} ${job.company} ${job.category}`.toLowerCase();
        return (!q || hay.includes(q))
          && (!loc || job.location === loc)
          && (!type || job.type === type);
      });

      if(sort==="match") filtered.sort((a,b)=>b.match-a.match);
      if(sort==="salary") filtered.sort((a,b)=>parseInt(b.salary)-parseInt(a.salary));
      if(sort==="new") filtered.sort((a,b)=>a.id-b.id);

      resultCount.textContent = `${filtered.length} công việc`;
      jobsGrid.innerHTML = filtered.length
        ? filtered.map(card).join("")
        : `<div class="empty-state">Không tìm thấy công việc phù hợp. Hãy thử thay đổi bộ lọc.</div>`;
      wireFavorites(jobsGrid);
    }

    [qInput,locSelect,typeSelect,sortSelect].forEach(el=>{
      el?.addEventListener(el.tagName==="INPUT" ? "input":"change",render);
    });

    document.querySelector("[data-reset-filter]")?.addEventListener("click",()=>{
      if(qInput) qInput.value="";
      if(locSelect) locSelect.value="";
      if(typeSelect) typeSelect.value="";
      if(sortSelect) sortSelect.value="match";
      render();
    });
    render();
  }

  const companiesGrid = document.querySelector("[data-companies-grid]");
  if(companiesGrid){
    companiesGrid.innerHTML = (window.JOBLY_DATA.companies || []).map(c=>`
      <article class="company-card">
        <div class="logo-box">${c.logo}</div>
        <h3>${c.name}</h3>
        <div class="tiny">${c.industry}</div>
        <p>${c.desc}</p>
        <div class="company-card-footer">
          <span class="match">${c.jobs} vị trí mở</span>
          <a class="text-link" href="jobs.html?q=${encodeURIComponent(c.name)}">Xem việc làm →</a>
        </div>
      </article>
    `).join("");
  }

  const detailHost = document.querySelector("[data-job-detail]");
  if(detailHost){
    const params = new URLSearchParams(location.search);
    const id = Number(params.get("id") || 1);
    const job = jobs.find(j=>j.id===id) || jobs[0];
    document.title = `${job.title} - JOBLY`;
    detailHost.innerHTML = `
      <div class="detail-header">
        <div class="logo-box">${job.logo}</div>
        <div>
          <h1>${job.title}</h1>
          <div class="company-name">${job.company} · ${job.location}</div>
          <div class="salary-match">
            <span class="pill">${job.salary}</span>
            <span class="pill success">${job.match}% phù hợp</span>
          </div>
        </div>
      </div>
      <section class="detail-section">
        <h2>Mô tả công việc</h2>
        <p>Tham gia phát triển sản phẩm cùng đội ngũ đa chức năng, phối hợp chặt chẽ với thiết kế, sản phẩm và kỹ thuật để tạo ra trải nghiệm người dùng chất lượng cao.</p>
      </section>
      <section class="detail-section">
        <h2>Trách nhiệm chính</h2>
        <ul>
          <li>Phân tích yêu cầu và chuyển thành giải pháp có thể triển khai.</li>
          <li>Phối hợp với các thành viên trong nhóm, review và cải tiến chất lượng sản phẩm.</li>
          <li>Theo dõi hiệu quả sau khi phát hành và đề xuất tối ưu.</li>
        </ul>
      </section>
      <section class="detail-section">
        <h2>Yêu cầu</h2>
        <ul>
          <li>Kinh nghiệm: ${job.exp}.</li>
          <li>Chủ động, giao tiếp tốt và có khả năng làm việc nhóm.</li>
          <li>Ưu tiên ứng viên có portfolio hoặc dự án thực tế liên quan.</li>
        </ul>
      </section>
      <section class="detail-section">
        <h2>Quyền lợi</h2>
        <ul>
          <li>Mức lương cạnh tranh: ${job.salary}.</li>
          <li>Môi trường học hỏi nhanh, quy trình rõ ràng và cơ hội phát triển nghề nghiệp.</li>
          <li>Bảo hiểm, nghỉ phép và các chế độ theo chính sách công ty.</li>
        </ul>
      </section>`;
    document.querySelector("[data-detail-company]").textContent = job.company;
    document.querySelector("[data-detail-location]").textContent = job.location;
    document.querySelector("[data-detail-type]").textContent = job.type;
    document.querySelector("[data-detail-category]").textContent = job.category;
    document.querySelector("[data-apply-job]")?.addEventListener("click",()=>{
      document.querySelector("#apply-modal")?.classList.add("show");
    });
  }
})();