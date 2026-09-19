(function(){
  const value = selector => document.querySelector(selector)?.value.trim() || "";
  const params = new URLSearchParams(location.search);
  const roleCopy = {
    candidate:{label:"ỨNG VIÊN",name:"ứng viên",icon:"◇",title:"Tìm công việc phù hợp, phát triển đúng hướng.",copy:"Một tài khoản giúp bạn quản lý CV, lưu công việc và theo dõi từng vòng ứng tuyển.",destination:"index.html"},
    employer:{label:"NHÀ TUYỂN DỤNG",name:"nhà tuyển dụng",icon:"◆",title:"Tuyển đúng người, phát triển đúng hướng.",copy:"Quản lý tin, ứng viên, phỏng vấn và hiệu suất tuyển dụng trong một không gian thống nhất.",destination:"employer.html"},
    admin:{label:"QUẢN TRỊ VIÊN",name:"quản trị viên",icon:"⚙",title:"Vận hành minh bạch, giữ nền tảng an toàn.",copy:"Khu vực quản trị dành cho tài khoản đã được cấp quyền trên hệ thống.",destination:"admin.html"}
  };

  let currentBgRole = null;
  let bgTransitionTimer = null;

  function switchAuthBackground(role){
    const slides = document.querySelectorAll(".auth-bg-slide");
    if(!slides.length) return;

    const target = document.querySelector(`.auth-bg-slide[data-bg-role="${role}"]`);
    if(!target) return;

    if(!currentBgRole){
      currentBgRole = role;
      slides.forEach(s=>{
        s.classList.remove("active","previous");
        s.style.transition = "none";
        if(s === target){
          s.classList.add("active");
          s.style.zIndex = "1";
          s.style.opacity = "1";
          s.style.clipPath = "inset(0 0 0 0)";
          s.style.webkitClipPath = "inset(0 0 0 0)";
        } else {
          s.style.zIndex = "0";
          s.style.opacity = "0";
          s.style.clipPath = "inset(0 100% 0 0)";
          s.style.webkitClipPath = "inset(0 100% 0 0)";
        }
      });
      return;
    }

    if(role === currentBgRole) return;

    if(bgTransitionTimer){
      clearTimeout(bgTransitionTimer);
      bgTransitionTimer = null;
    }

    const prev = document.querySelector(`.auth-bg-slide[data-bg-role="${currentBgRole}"]`);
    currentBgRole = role;

    // Reset any slides that are neither prev nor target
    slides.forEach(s => {
      if(s !== prev && s !== target){
        s.classList.remove("active", "previous");
        s.style.transition = "none";
        s.style.zIndex = "0";
        s.style.opacity = "0";
        s.style.clipPath = "inset(0 100% 0 0)";
        s.style.webkitClipPath = "inset(0 100% 0 0)";
      }
    });

    // Make previous slide solid base at zIndex 1 (even if interrupted mid-animation)
    if(prev && prev !== target){
      prev.classList.remove("active");
      prev.classList.add("previous");
      prev.style.transition = "none";
      prev.style.zIndex = "1";
      prev.style.opacity = "1";
      prev.style.clipPath = "inset(0 0 0 0)";
      prev.style.webkitClipPath = "inset(0 0 0 0)";
    }

    // Set target slide at zIndex 2, start clipped 100% on right
    target.classList.remove("previous");
    target.style.transition = "none";
    target.style.zIndex = "2";
    target.style.opacity = "1";
    target.style.clipPath = "inset(0 100% 0 0)";
    target.style.webkitClipPath = "inset(0 100% 0 0)";

    // Force reflow before applying animation
    void target.offsetHeight;

    // Animate target to full reveal from left to right
    target.style.transition = "clip-path 0.3s cubic-bezier(0.16, 1, 0.3, 1), -webkit-clip-path 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
    target.style.clipPath = "inset(0 0 0 0)";
    target.style.webkitClipPath = "inset(0 0 0 0)";
    target.classList.add("active");

    // Clean up previous slide when animation completes
    bgTransitionTimer = setTimeout(()=>{
      target.style.zIndex = "1";
      if(prev && prev !== target){
        prev.classList.remove("previous");
        prev.style.opacity = "0";
        prev.style.zIndex = "0";
      }
      bgTransitionTimer = null;
    }, 320);
  }

  function setRole(role){
    if(!roleCopy[role]) role="candidate";
    const copy=roleCopy[role];
    document.querySelectorAll("[data-role]").forEach(btn=>btn.classList.toggle("active",btn.dataset.role===role));
    const roleInput=document.querySelector("#login-role,#register-role"); if(roleInput) roleInput.value=role;
    const label=document.querySelector("[data-auth-role-label]"); if(label) label.textContent=copy.label;
    const icon=document.querySelector("[data-auth-icon]"); if(icon) icon.textContent=copy.icon;
    const formTitle=document.querySelector("[data-auth-title]"); if(formTitle) formTitle.textContent=document.querySelector("#register-form")?`Tạo tài khoản ${copy.name}`:`Đăng nhập ${copy.name}`;
    const storyTitle=document.querySelector("[data-auth-story-title]"); if(storyTitle) storyTitle.textContent=copy.title;
    const storyCopy=document.querySelector("[data-auth-story-copy]"); if(storyCopy) storyCopy.textContent=copy.copy;
    document.querySelectorAll(".employer-only").forEach(el=>el.classList.toggle("hidden",role!=="employer"));
    const registerLink=document.querySelector("[data-register-link]");
    if(registerLink) registerLink.innerHTML=role==="admin"?`Tài khoản Admin do hệ thống cấp. <a href="forgot-password.html">Cần hỗ trợ?</a>`:`Chưa có tài khoản? <a href="register.html?role=${role}">Đăng ký</a>`;
    switchAuthBackground(role);
    history.replaceState(null,"",`${location.pathname}?role=${role}`);
  }
  document.querySelectorAll("[data-role]").forEach(btn=>btn.addEventListener("click",()=>setRole(btn.dataset.role)));
  if(document.querySelector("[data-role]")) setRole(params.get("role") || "candidate");

  document.querySelector("[data-toggle-password]")?.addEventListener("click",e=>{
    const input=document.querySelector("#login-password");
    input.type=input.type==="password"?"text":"password";
    e.currentTarget.textContent=input.type==="password"?"○":"●";
  });

  document.querySelector("#login-form")?.addEventListener("submit",e=>{
    e.preventDefault();
    const email=value("#login-email"), password=value("#login-password"), role=value("#login-role")||"candidate";
    if(!email.includes("@")){window.MatchaJob.toast("Email chưa đúng định dạng.");return;}
    if(password.length<6){window.MatchaJob.toast("Mật khẩu cần ít nhất 6 ký tự.");return;}
    localStorage.setItem("matchajob-demo-user",JSON.stringify({email,role,loggedIn:true}));
    window.MatchaJob.toast("Đăng nhập demo thành công.");
    setTimeout(()=>location.href=roleCopy[role]?.destination||"index.html",650);
  });

  document.querySelector("#register-form")?.addEventListener("submit",e=>{
    e.preventDefault();
    const name=value("#reg-name"),email=value("#reg-email"),password=value("#reg-password"),confirm=value("#reg-confirm"),role=value("#register-role")||"candidate";
    if(name.length<2){window.MatchaJob.toast("Vui lòng nhập họ tên.");return;}
    if(!email.includes("@")){window.MatchaJob.toast("Email chưa đúng định dạng.");return;}
    if(password.length<6){window.MatchaJob.toast("Mật khẩu cần ít nhất 6 ký tự.");return;}
    if(password!==confirm){window.MatchaJob.toast("Mật khẩu nhập lại chưa khớp.");return;}
    if(role==="employer" && !value("#reg-company")){window.MatchaJob.toast("Vui lòng nhập tên doanh nghiệp.");return;}
    if(!document.querySelector("#reg-terms")?.checked){window.MatchaJob.toast("Bạn cần đồng ý với điều khoản sử dụng.");return;}
    localStorage.setItem("matchajob-demo-user",JSON.stringify({name,email,role,loggedIn:true}));
    window.MatchaJob.toast("Tạo tài khoản demo thành công.");
    setTimeout(()=>location.href=roleCopy[role]?.destination||"index.html",650);
  });

  document.querySelector("#forgot-form")?.addEventListener("submit",e=>{
    e.preventDefault();
    const email=value("#forgot-email");
    if(!email.includes("@")){window.MatchaJob.toast("Vui lòng nhập email hợp lệ.");return;}
    const card=e.currentTarget.closest(".auth-card");
    card.innerHTML=`<div class="success-state"><span>✓</span><h1>Kiểm tra email của bạn</h1><p>Mã xác thực 6 chữ số đã được gửi đến <strong>${email}</strong>.</p><div class="otp-row">${Array.from({length:6},()=>'<input maxlength="1" inputmode="numeric">').join("")}</div><button class="btn btn-primary full-width" data-reset-demo>Xác nhận mã</button><a class="auth-role-link" href="forgot-password.html">Gửi lại mã</a></div>`;
    card.querySelector("input")?.focus();
    card.querySelectorAll(".otp-row input").forEach((input,i,list)=>input.addEventListener("input",()=>{if(input.value && list[i+1])list[i+1].focus();}));
    card.querySelector("[data-reset-demo]")?.addEventListener("click",()=>{card.innerHTML=`<div class="success-state"><span>✓</span><h1>Đặt lại mật khẩu thành công</h1><p>Bạn có thể đăng nhập bằng mật khẩu mới.</p><a class="btn btn-primary full-width" href="login.html">Quay lại đăng nhập</a></div>`;});
  });

  const postForm=document.querySelector("#post-job-form");
  postForm?.addEventListener("submit",e=>{
    e.preventDefault();
    const job={id:Date.now(),title:value("#post-title"),company:value("#post-company"),location:value("#post-location"),salary:value("#post-salary"),type:value("#post-type"),createdAt:new Date().toISOString()};
    if(!job.title||!job.company||!job.location||!job.salary){window.MatchaJob.toast("Hãy nhập đủ các trường bắt buộc.");return;}
    const posts=JSON.parse(localStorage.getItem("matchajob-employer-posts")||"[]");posts.unshift(job);localStorage.setItem("matchajob-employer-posts",JSON.stringify(posts));window.MatchaJob.toast("Đã lưu tin tuyển dụng demo.");postForm.reset();renderEmployerPosts();
  });
  function renderEmployerPosts(){const host=document.querySelector("[data-employer-posts]");if(!host)return;const posts=JSON.parse(localStorage.getItem("matchajob-employer-posts")||"[]");host.innerHTML=posts.length?posts.map(p=>`<tr><td>${p.title}</td><td>${p.company}</td><td>${p.location}</td><td>${p.salary}</td><td><span class="status live">Đang hiển thị</span></td></tr>`).join(""):`<tr><td colspan="5" class="muted">Chưa có tin tuyển dụng demo nào được đăng.</td></tr>`;}
  renderEmployerPosts();

  const modal=document.querySelector("#apply-modal");
  document.querySelector("[data-modal-close]")?.addEventListener("click",()=>modal?.classList.remove("show"));
  modal?.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("show");});
  document.querySelector("#apply-form")?.addEventListener("submit",e=>{
    e.preventDefault();const name=value("#apply-name"),email=value("#apply-email");
    if(name.length<2||!email.includes("@")){window.MatchaJob.toast("Vui lòng nhập họ tên và email hợp lệ.");return;}
    const detail=window.MATCHAJOB_DATA?.jobs?.find(j=>j.id===Number(new URLSearchParams(location.search).get("id")||1));
    const apps=JSON.parse(localStorage.getItem("matchajob-applications")||"[]");apps.unshift({name,email,jobTitle:detail?.title,company:detail?.company,at:new Date().toISOString()});localStorage.setItem("matchajob-applications",JSON.stringify(apps));modal?.classList.remove("show");e.target.reset();window.MatchaJob.toast("Đã gửi hồ sơ demo.");
  });
  const appCount=document.querySelector("[data-app-count]");const postCount=document.querySelector("[data-post-count]");if(appCount)appCount.textContent=JSON.parse(localStorage.getItem("matchajob-applications")||"[]").length;if(postCount)postCount.textContent=JSON.parse(localStorage.getItem("matchajob-employer-posts")||"[]").length;
})();
