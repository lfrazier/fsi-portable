(function(){
    function setPdfPage(frame, page){
      if(!frame) return;
      try{
        const url = new URL(frame.src, window.location.href);
        // Preserve existing hash params but update page
        let hash = url.hash || "";
        const params = new URLSearchParams(hash.replace(/^#/, ""));
        params.set("page", String(page));
        if(!params.has("zoom")) params.set("zoom","page-width");
        url.hash = "#" + params.toString();
        frame.src = url.toString();
      }catch{}
    }
  
    function onClick(e){
      const el = e.target.closest("[data-pdf-page]");
      if(!el) return;
      const page = Number(el.getAttribute("data-pdf-page"));
      if(!page) return;
      const frame = document.getElementById("lesson-pdf");
      setPdfPage(frame, page);
      e.preventDefault();
    }
  
    document.addEventListener("click", onClick);
  })();