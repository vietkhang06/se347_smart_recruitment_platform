(function(){
  function value(id){return document.querySelector(id)?.value.trim() || ""}

  const loginForm = document.querySelector("#login-form");
  loginForm?.addEventListener("submit",e=>{
    e.preventDefault();
    const email=value("#login-email"), password=value("#login-password");
    if(!email.includes("@")){
      window.Jobly.toast("Email chưa đúng định dạng.");
      return;
    }
    if(password.length<6){
      window.Jobly.toast("Mật khẩu cần ít nhất 6 ký tự.");
      return;
    }
    localStorage.setItem("jobly-demo-user", JSON.stringify({email,loggedIn:true}));
    window.Jobly.toast("Đăng nhập demo thành công.");
    setTimeout(()=>location.href="index.html",700);
  });

  const registerForm = document.querySelector("#register-form");
  registerForm?.addEventListener("submit",e=>{
    e.preventDefault();
    const name=value("#reg-name"), email=value("#reg-email"), password=value("#reg-password"), confirm=value("#reg-confirm");
    if(name.length<2){window.Jobly.toast("Vui lòng nhập họ tên.");return}
    if(!email.includes("@")){window.Jobly.toast("Email chưa đúng định dạng.");return}
    if(password.length<6){window.Jobly.toast("Mật khẩu cần ít nhất 6 ký tự.");return}
    if(password!==confirm){window.Jobly.toast("Mật khẩu nhập lại chưa khớp.");return}
    localStorage.setItem("jobly-demo-user", JSON.stringify({name,email,loggedIn:true}));
    window.Jobly.toast("Tạo tài khoản demo thành công.");
    setTimeout(()=>location.href="index.html",700);
  });

  const postForm = document.querySelector("#post-job-form");
  postForm?.addEventListener("submit",e=>{
    e.preventDefault();
    const job={
      id:Date.now(),
      title:value("#post-title"),
      company:value("#post-company"),
      location:value("#post-location"),
      salary:value("#post-salary"),
      type:value("#post-type"),
      createdAt:new Date().toISOString()
    };
    if(!job.title || !job.company || !job.location || !job.salary){
      window.Jobly.toast("Hãy nhập đủ các trường bắt buộc.");
      return;
    }
    const posts=JSON.parse(localStorage.getItem("jobly-employer-posts")||"[]");
    posts.unshift(job);
    localStorage.setItem("jobly-employer-posts",JSON.stringify(posts));
    window.Jobly.toast("Đã đăng tin demo trên trình duyệt này.");
    postForm.reset();
    renderEmployerPosts();
  });

  function renderEmployerPosts(){
    const host=document.querySelector("[data-employer-posts]");
    if(!host) return;
    const posts=JSON.parse(localStorage.getItem("jobly-employer-posts")||"[]");
    host.innerHTML = posts.length ? posts.map(p=>`
      <tr>
        <td>${p.title}</td>
        <td>${p.company}</td>
        <td>${p.location}</td>
        <td>${p.salary}</td>
        <td><span class="status live">Đang hiển thị</span></td>
      </tr>`).join("") : `
      <tr><td colspan="5" class="muted">Chưa có tin tuyển dụng demo nào được đăng.</td></tr>`;
  }
  renderEmployerPosts();

  const modal=document.querySelector("#apply-modal");
  document.querySelector("[data-modal-close]")?.addEventListener("click",()=>modal?.classList.remove("show"));
  modal?.addEventListener("click",e=>{if(e.target===modal) modal.classList.remove("show")});

  document.querySelector("#apply-form")?.addEventListener("submit",e=>{
    e.preventDefault();
    const name=value("#apply-name"), email=value("#apply-email");
    if(name.length<2 || !email.includes("@")){
      window.Jobly.toast("Vui lòng nhập họ tên và email hợp lệ.");
      return;
    }
    const apps=JSON.parse(localStorage.getItem("jobly-applications")||"[]");
    apps.unshift({name,email,at:new Date().toISOString()});
    localStorage.setItem("jobly-applications",JSON.stringify(apps));
    modal?.classList.remove("show");
    e.target.reset();
    window.Jobly.toast("Đã gửi hồ sơ demo.");
  });

  const appCount=document.querySelector("[data-app-count]");
  const postCount=document.querySelector("[data-post-count]");
  if(appCount) appCount.textContent=JSON.parse(localStorage.getItem("jobly-applications")||"[]").length;
  if(postCount) postCount.textContent=JSON.parse(localStorage.getItem("jobly-employer-posts")||"[]").length;
})();