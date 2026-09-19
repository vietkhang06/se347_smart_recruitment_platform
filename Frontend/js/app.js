(function(){
  const body=document.body;
  const savedTheme=localStorage.getItem("matchajob-theme") || localStorage.getItem("jobly-theme");
  if(savedTheme==="dark") body.classList.add("dark");

  function syncThemeIcons(){document.querySelectorAll("[data-theme-toggle]").forEach(btn=>{btn.textContent=body.classList.contains("dark")?"☀":"☾";btn.setAttribute("aria-label",body.classList.contains("dark")?"Chuyển sang giao diện sáng":"Chuyển sang giao diện tối");});}
  syncThemeIcons();
  document.querySelectorAll("[data-theme-toggle]").forEach(btn=>btn.addEventListener("click",()=>{body.classList.toggle("dark");localStorage.setItem("matchajob-theme",body.classList.contains("dark")?"dark":"light");syncThemeIcons();}));

  document.querySelectorAll("[data-mobile-menu]").forEach(btn=>btn.addEventListener("click",()=>{document.querySelector(".nav,.portal-nav")?.classList.toggle("open");}));
  document.querySelectorAll("[data-global-search]").forEach(input=>input.addEventListener("keydown",e=>{if(e.key==="Enter"&&input.value.trim())location.href=`jobs.html?q=${encodeURIComponent(input.value.trim())}`;}));
  document.querySelectorAll("[data-home-search]").forEach(form=>form.addEventListener("submit",e=>{e.preventDefault();const q=form.querySelector('[name="q"]')?.value.trim()||"";const locationValue=form.querySelector('[name="location"]')?.value.trim()||"";const params=new URLSearchParams();if(q)params.set("q",q);if(locationValue)params.set("location",locationValue);location.href=`jobs.html?${params.toString()}`;}));

  document.querySelectorAll("[data-demo-toast]").forEach(btn=>btn.addEventListener("click",()=>window.MatchaJob.toast(btn.dataset.demoToast)));

  function getBrandDestination(){
    if(body.dataset.portal==="employer") return "employer.html#overview";
    if(body.dataset.portal==="admin") return "admin.html#overview";
    try{
      const demoUser=JSON.parse(localStorage.getItem("matchajob-demo-user")||"null");
      if(demoUser?.loggedIn){
        if(demoUser.role==="employer") return "employer.html#overview";
        if(demoUser.role==="admin") return "admin.html#overview";
      }
    }catch{}
    return "index.html";
  }

  function syncBrandLinks(){
    const target=getBrandDestination();
    document.querySelectorAll("a.brand").forEach(link=>{
      link.setAttribute("href",target);
      link.addEventListener("click",e=>{
        const dest=getBrandDestination();
        if(location.pathname.endsWith("employer.html") && dest.includes("employer.html")){
          e.preventDefault();
          if(location.hash==="#overview"){
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          } else {
            location.hash="overview";
          }
        } else if(location.pathname.endsWith("admin.html") && dest.includes("admin.html")){
          e.preventDefault();
          if(location.hash==="#overview"){
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          } else {
            location.hash="overview";
          }
        }
      });
    });
  }
  syncBrandLinks();

  function wireUserDropdowns(){
    document.querySelectorAll("[data-user-menu-trigger]").forEach(btn=>{
      btn.onclick=(e)=>{
        e.stopPropagation();
        const menu=btn.closest(".user-dropdown")?.querySelector("[data-user-menu]");
        const isOpen=menu?.classList.contains("open");
        document.querySelectorAll("[data-user-menu].open").forEach(m=>m.classList.remove("open"));
        if(!isOpen && menu){
          menu.classList.add("open");
          btn.setAttribute("aria-expanded","true");
        } else {
          btn.setAttribute("aria-expanded","false");
        }
      };
    });
    document.addEventListener("click",e=>{
      if(!e.target.closest(".user-dropdown")){
        document.querySelectorAll("[data-user-menu].open").forEach(m=>{
          m.classList.remove("open");
          m.closest(".user-dropdown")?.querySelector("[data-user-menu-trigger]")?.setAttribute("aria-expanded","false");
        });
      }
    });
    document.querySelectorAll("[data-logout]").forEach(btn=>{
      btn.onclick=(e)=>{
        e.preventDefault();
        window.MatchaJob.logout(btn.dataset.logoutRedirect);
      };
    });
  }
  wireUserDropdowns();

  function syncHeaderAuth(){
    const actions=document.querySelector(".header-actions");
    if(!actions) return;
    const loginLink=actions.querySelector('a[href="login.html"]');
    const registerLink=actions.querySelector('a[href="register.html"]');
    if(!loginLink && !registerLink) return;

    try{
      const demoUser=JSON.parse(localStorage.getItem("matchajob-demo-user")||"null");
      if(!demoUser || !demoUser.loggedIn) return;

      loginLink?.remove();
      registerLink?.remove();

      const userChipWrapper=document.createElement("div");
      userChipWrapper.className="user-dropdown";
      if(demoUser.role==="employer"){
        userChipWrapper.innerHTML=`
          <button class="user-chip" data-user-menu-trigger aria-expanded="false" aria-label="Menu tài khoản"><span class="avatar tiny-avatar">LA</span><span>Lan Anh</span><b>⌄</b></button>
          <div class="user-dropdown-menu" data-user-menu>
            <div class="user-dropdown-header"><strong>Lan Anh</strong><small>Nhà tuyển dụng · FPT Talent</small></div>
            <a class="user-dropdown-item" href="employer.html#overview"><span>▣</span> Dashboard tuyển dụng</a>
            <a class="user-dropdown-item" href="employer.html#jobs"><span>▦</span> Quản lý tin</a>
            <a class="user-dropdown-item" href="employer.html#profile"><span>⚙</span> Hồ sơ cá nhân</a>
            <div class="user-dropdown-divider"></div>
            <button class="user-dropdown-item text-danger" data-logout><span>⇥</span> Đăng xuất</button>
          </div>`;
      } else if(demoUser.role==="admin"){
        userChipWrapper.innerHTML=`
          <button class="user-chip" data-user-menu-trigger aria-expanded="false" aria-label="Menu tài khoản"><span class="avatar tiny-avatar admin-avatar">AD</span><span>Admin</span><b>⌄</b></button>
          <div class="user-dropdown-menu" data-user-menu>
            <div class="user-dropdown-header"><strong>Hà Minh Đức</strong><small>Quản trị viên nền tảng</small></div>
            <a class="user-dropdown-item" href="admin.html#overview"><span>▣</span> Dashboard Admin</a>
            <a class="user-dropdown-item" href="admin.html#moderation"><span>✓</span> Kiểm duyệt nội dung</a>
            <a class="user-dropdown-item" href="admin.html#profile"><span>⚙</span> Hồ sơ quản trị</a>
            <div class="user-dropdown-divider"></div>
            <button class="user-dropdown-item text-danger" data-logout><span>⇥</span> Đăng xuất</button>
          </div>`;
      } else {
        userChipWrapper.innerHTML=`
          <button class="user-chip" data-user-menu-trigger aria-expanded="false" aria-label="Menu tài khoản"><span class="avatar tiny-avatar">AK</span><span>An Khang</span><b>⌄</b></button>
          <div class="user-dropdown-menu" data-user-menu>
            <div class="user-dropdown-header"><strong>Nguyễn An Khang</strong><small>Ứng viên · Product Designer</small></div>
            <a class="user-dropdown-item" href="profile.html"><span>👤</span> Hồ sơ & CV</a>
            <a class="user-dropdown-item" href="saved.html"><span>♥</span> Việc làm đã lưu</a>
            <a class="user-dropdown-item" href="applications.html"><span>📋</span> Đơn ứng tuyển</a>
            <div class="user-dropdown-divider"></div>
            <button class="user-dropdown-item text-danger" data-logout><span>⇥</span> Đăng xuất</button>
          </div>`;
      }
      const mobileBtn=actions.querySelector(".mobile-menu-btn");
      if(mobileBtn) actions.insertBefore(userChipWrapper, mobileBtn);
      else actions.appendChild(userChipWrapper);
      wireUserDropdowns();
    }catch{}
  }
  syncHeaderAuth();

  window.MatchaJob={
    toast(message){let toast=document.querySelector(".toast");if(!toast){toast=document.createElement("div");toast.className="toast";toast.setAttribute("role","status");document.body.appendChild(toast);}toast.textContent=message;toast.classList.add("show");clearTimeout(window.__matchaJobToastTimer);window.__matchaJobToastTimer=setTimeout(()=>toast.classList.remove("show"),2400);},
    getFavorites(){try{return JSON.parse(localStorage.getItem("matchajob-favorites")||localStorage.getItem("jobly-favorites")||"[]");}catch{return []; }},
    toggleFavorite(id){const favorites=this.getFavorites();const index=favorites.indexOf(id);if(index>=0)favorites.splice(index,1);else favorites.push(id);localStorage.setItem("matchajob-favorites",JSON.stringify(favorites));return favorites.includes(id);},
    logout(redirectUrl){
      const user=JSON.parse(localStorage.getItem("matchajob-demo-user")||"null");
      const role=user?.role||(document.body.dataset.portal||"candidate");
      localStorage.removeItem("matchajob-demo-user");
      this.toast("Đã đăng xuất thành công.");
      setTimeout(()=>{
        if(redirectUrl){
          location.href=redirectUrl;
        } else if(role==="employer"){
          location.href="login.html?role=employer";
        } else if(role==="admin"){
          location.href="login.html?role=admin";
        } else {
          location.href="index.html";
        }
      },450);
    }
  };
  window.Jobly=window.MatchaJob;
})();

