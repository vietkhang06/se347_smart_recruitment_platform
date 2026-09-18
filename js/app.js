(function(){
  const body = document.body;
  const themeBtn = document.querySelector("[data-theme-toggle]");
  const mobileBtn = document.querySelector("[data-mobile-menu]");
  const nav = document.querySelector(".nav");
  const savedTheme = localStorage.getItem("jobly-theme");

  if(savedTheme === "dark"){
    body.classList.add("dark");
  }

  function syncThemeIcon(){
    if(themeBtn) themeBtn.textContent = body.classList.contains("dark") ? "☀" : "☾";
  }
  syncThemeIcon();

  themeBtn?.addEventListener("click", () => {
    body.classList.toggle("dark");
    localStorage.setItem("jobly-theme", body.classList.contains("dark") ? "dark" : "light");
    syncThemeIcon();
  });

  mobileBtn?.addEventListener("click", () => {
    nav?.classList.toggle("open");
  });

  document.querySelectorAll("[data-global-search]").forEach(input => {
    input.addEventListener("keydown", e => {
      if(e.key === "Enter" && input.value.trim()){
        location.href = `jobs.html?q=${encodeURIComponent(input.value.trim())}`;
      }
    });
  });

  document.querySelectorAll("[data-home-search]").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const q = form.querySelector('[name="q"]')?.value.trim() || "";
      const locationValue = form.querySelector('[name="location"]')?.value.trim() || "";
      const params = new URLSearchParams();
      if(q) params.set("q", q);
      if(locationValue) params.set("location", locationValue);
      location.href = `jobs.html?${params.toString()}`;
    });
  });

  window.Jobly = {
    toast(message){
      let toast = document.querySelector(".toast");
      if(!toast){
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__joblyToastTimer);
      window.__joblyToastTimer = setTimeout(()=>toast.classList.remove("show"),2200);
    },
    getFavorites(){
      try{return JSON.parse(localStorage.getItem("jobly-favorites") || "[]")}catch{return []}
    },
    toggleFavorite(id){
      const favs = this.getFavorites();
      const index = favs.indexOf(id);
      if(index >= 0) favs.splice(index,1);
      else favs.push(id);
      localStorage.setItem("jobly-favorites", JSON.stringify(favs));
      return favs.includes(id);
    }
  };
})();