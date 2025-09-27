
(function () {
  function parseTimeToSeconds(t) {
    if (typeof t === "number") return t;
    if (!t) return 0;
    const parts = String(t).split(":").map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if (parts.length === 2) return parts[0]*60 + parts[1];
    return Number(t) || 0;
  }

  function formatTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s % 60;
    return (h>0? h+":" : "") + (m<10 && h>0? "0":"") + m + ":" + (sec<10? "0":"") + sec;
  }

  function createEl(tag, opts) {
    const el = document.createElement(tag);
    if (opts) {
      Object.entries(opts).forEach(([k,v]) => {
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "html") el.innerHTML = v;
        else el.setAttribute(k, v);
      });
    }
    return el;
  }

  function loadConfig() {
    const script = document.querySelector("#unit-audio");
    if (!script) return null;
    try {
      const cfg = JSON.parse(script.textContent);
      if (Array.isArray(cfg)) return { playlist: cfg };
      if (cfg.playlist) return cfg;
      if (cfg.src) return { playlist: [cfg] };
      return null;
    } catch (e) {
      console.warn("Invalid unit-audio JSON", e);
      return null;
    }
  }

  function savePos(src, t) {
    try { localStorage.setItem("fsi_audio_pos::" + src, String(Math.floor(t))); } catch {}
  }
  function loadPos(src) {
    try { return Number(localStorage.getItem("fsi_audio_pos::" + src)) || 0; } catch { return 0; }
  }

  function buildUI(config) {
    const wrap = createEl("div", { class: "fsi-audio-wrap" });
    const bar = createEl("div", { class: "fsi-audio-bar" });
    
    // Top row for title
    const topRow = createEl("div", { class: "fsi-audio-row fsi-audio-row-top" });
    const title = createEl("div", { class: "fsi-title", text: "Audio" });
    
    // Middle row for progress bar and time
    const middleRow = createEl("div", { class: "fsi-audio-row fsi-audio-row-middle" });
    const range = createEl("input", { type:"range", min:"0", max:"1000", value:"0", class:"fsi-range", "aria-label":"Seek"});
    const timeContainer = createEl("div", { class: "fsi-time-container" });
    const timeCurrent = createEl("div", { class: "fsi-time-current", text: "0:00" });
    const timeRemaining = createEl("div", { class: "fsi-time-remaining", text: "0:00 left" });
    const timeSegment = createEl("div", { class: "fsi-time-segment", text: "- 0:00" });
    
    // Bottom row for controls
    const bottomRow = createEl("div", { class: "fsi-audio-row fsi-audio-row-bottom" });
    const playBtn = createEl("button", { class: "fsi-btn fsi-play", title: "Play/Pause (Space)", "aria-label":"Play" });
    playBtn.innerHTML = "▶︎";

    const speed = createEl("select", { class:"fsi-speed", title:"Speed ([ / ])", "aria-label":"Speed" });
    [0.75, 0.9, 1, 1.1, 1.25, 1.5].forEach(v => {
      const opt = createEl("option"); opt.value = v; opt.textContent = v+"x"; if (v===1) opt.selected = true; speed.appendChild(opt);
    });
    const prevBtn = createEl("button", { class:"fsi-btn fsi-prev", title:"Previous file", "aria-label":"Previous" });
    prevBtn.innerHTML = "⏮";
    const nextBtn = createEl("button", { class:"fsi-btn fsi-next", title:"Next file", "aria-label":"Next" });
    nextBtn.innerHTML = "⏭";
    const skipBackBtn = createEl("button", { class:"fsi-btn fsi-skip-back", title:"Skip back 30 seconds", "aria-label":"Skip back 30s" });
    skipBackBtn.innerHTML = "⏪";
    const skipForwardBtn = createEl("button", { class:"fsi-btn fsi-skip-forward", title:"Skip forward 30 seconds", "aria-label":"Skip forward 30s" });
    skipForwardBtn.innerHTML = "⏩";

    // Assemble top row
    topRow.appendChild(title);
    
    // Assemble middle row
    middleRow.appendChild(range);
    timeContainer.appendChild(timeCurrent);
    timeContainer.appendChild(timeRemaining);
    timeContainer.appendChild(timeSegment);
    middleRow.appendChild(timeContainer);
    
    // Assemble bottom row
    bottomRow.appendChild(prevBtn);
    bottomRow.appendChild(skipBackBtn);
    bottomRow.appendChild(playBtn);
    bottomRow.appendChild(skipForwardBtn);
    bottomRow.appendChild(nextBtn);
    
    // Assemble main bar
    bar.appendChild(topRow);
    bar.appendChild(middleRow);
    bar.appendChild(bottomRow);
    wrap.appendChild(bar);
    document.body.appendChild(wrap);

    const audio = new Audio();
    audio.preload = "auto";

    let idx = 0;
    function load(i) {
      idx = Math.max(0, Math.min(config.playlist.length-1, i));
      const item = config.playlist[idx];
      const src = item.src || item.url;
      const label = item.label || item.title || (src ? src.split("/").pop() : "Audio");
      title.textContent = label;
      audio.src = src;
      audio.playbackRate = Number(speed.value) || 1;
      const resume = loadPos(src);
      if (resume) audio.currentTime = resume;
      range.value = 0;
      timeCurrent.textContent = "0:00";
      timeRemaining.textContent = "0:00 left";
      timeSegment.textContent = "- 0:00";
      
      // Ensure audio is ready for interaction
      audio.addEventListener("canplay", () => {
        console.log("Audio ready for playback");
      }, { once: true });
    }

    function playpause() {
      if (audio.paused) { audio.play().catch(()=>{}); }
      else { audio.pause(); }
    }

    // Touch-friendly event handlers
    playBtn.addEventListener("click", playpause);
    prevBtn.addEventListener("click", ()=> load(idx-1));
    nextBtn.addEventListener("click", ()=> load(idx+1));
    
    // Skip button handlers with proper audio state checking
    skipBackBtn.addEventListener("click", ()=> { 
      if (audio.duration) {
        audio.currentTime = Math.max(0, audio.currentTime - 30);
        console.log("Skip back 30s, new time:", audio.currentTime);
      }
    });
    skipForwardBtn.addEventListener("click", ()=> { 
      if (audio.duration) {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 30);
        console.log("Skip forward 30s, new time:", audio.currentTime);
      }
    });
    
    speed.addEventListener("change", ()=> { audio.playbackRate = Number(speed.value) || 1; });
    
    // Add touch feedback for buttons
    [playBtn, prevBtn, nextBtn, skipBackBtn, skipForwardBtn].forEach(btn => {
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        btn.style.transform = "scale(0.95)";
      });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        btn.style.transform = "";
        btn.click();
      });
    });

    audio.addEventListener("timeupdate", ()=> {
      const dur = audio.duration || 0;
      const cur = audio.currentTime || 0;
      
      // Update progress bar only if not being dragged
      if (dur && !isDragging) {
        range.value = Math.floor((cur/dur)*1000);
      }
      
      // Update time displays
      timeCurrent.textContent = formatTime(cur);
      if (dur) {
        const remaining = dur - cur;
        timeRemaining.textContent = formatTime(remaining) + " left";
        timeSegment.textContent = "- " + formatTime(remaining);
      } else {
        timeRemaining.textContent = "0:00 left";
        timeSegment.textContent = "- 0:00";
      }
      
      savePos(audio.src, cur);
    });
    audio.addEventListener("loadedmetadata", ()=> {
      const dur = audio.duration || 0;
      const cur = audio.currentTime || 0;
      timeCurrent.textContent = formatTime(cur);
      if (dur) {
        const remaining = dur - cur;
        timeRemaining.textContent = formatTime(remaining) + " left";
        timeSegment.textContent = "- " + formatTime(remaining);
      } else {
        timeRemaining.textContent = "0:00 left";
        timeSegment.textContent = "- 0:00";
      }
    });
    
    // Update play/pause button icon based on audio state
    audio.addEventListener("play", ()=> {
      playBtn.innerHTML = "⏸︎";
      playBtn.setAttribute("aria-label", "Pause");
    });
    audio.addEventListener("pause", ()=> {
      playBtn.innerHTML = "▶︎";
      playBtn.setAttribute("aria-label", "Play");
    });
    range.addEventListener("input", ()=> {
      const dur = audio.duration || 0;
      const v = Number(range.value)/1000;
      if (dur) {
        audio.currentTime = v * dur;
        console.log("Scrubbing to:", audio.currentTime, "of", dur);
      }
    });
    
    // Also handle change event for better compatibility
    range.addEventListener("change", ()=> {
      const dur = audio.duration || 0;
      const v = Number(range.value)/1000;
      if (dur) {
        audio.currentTime = v * dur;
        console.log("Range changed to:", audio.currentTime, "of", dur);
      }
    });
    
    // Enhanced mobile range slider support
    let isDragging = false;
    range.addEventListener("touchstart", ()=> {
      isDragging = true;
    });
    range.addEventListener("touchend", ()=> {
      isDragging = false;
    });
    range.addEventListener("mousedown", ()=> {
      isDragging = true;
    });
    range.addEventListener("mouseup", ()=> {
      isDragging = false;
    });

    // Keyboard shortcuts (mobile-friendly)
    document.addEventListener("keydown", (e)=> {
      const tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      
      if (e.code === "Space") { 
        e.preventDefault(); 
        playpause(); 
      }
      else if (e.key === "ArrowLeft") { 
        e.preventDefault(); 
        if (audio.duration) {
          audio.currentTime = Math.max(0, audio.currentTime - 30);
          console.log("Keyboard skip back 30s");
        }
      }
      else if (e.key === "ArrowRight") { 
        e.preventDefault(); 
        if (audio.duration) {
          audio.currentTime = Math.min(audio.duration, audio.currentTime + 30);
          console.log("Keyboard skip forward 30s");
        }
      }
      else if (e.key === "[") { 
        e.preventDefault(); 
        audio.playbackRate = Math.max(0.5, audio.playbackRate - 0.1); 
        speed.value = audio.playbackRate.toFixed(1); 
      }
      else if (e.key === "]") { 
        e.preventDefault(); 
        audio.playbackRate = Math.min(2.0, audio.playbackRate + 0.1); 
        speed.value = audio.playbackRate.toFixed(1); 
      }
      else if (e.key === "ArrowUp") { 
        e.preventDefault(); 
        load(idx+1); 
      }
      else if (e.key === "ArrowDown") { 
        e.preventDefault(); 
        load(idx-1); 
      }
    });
    
    // Touch gestures for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    
    wrap.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    });
    
    wrap.addEventListener("touchend", (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const deltaTime = touchEndTime - touchStartTime;
      
      // Swipe detection (minimum distance and maximum time)
      if (deltaTime < 300 && Math.abs(deltaX) > 50) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) {
            // Swipe right - previous track
            load(idx-1);
          } else {
            // Swipe left - next track
            load(idx+1);
          }
        }
      }
    });

    // Clickable timestamps in content: <a data-audio-seek="mm:ss">…</a>
    document.addEventListener("click", (e)=> {
      const target = e.target.closest("[data-audio-seek]");
      if (!target) return;
      const t = parseTimeToSeconds(target.getAttribute("data-audio-seek"));
      audio.currentTime = t;
      e.preventDefault();
    });

    // If chapters are provided, build quick-jump list (compact)
    if (config.playlist[0] && Array.isArray(config.playlist[0].chapters) && config.playlist.length === 1) {
      const chap = createEl("div", { class:"fsi-chapters" });
      config.playlist[0].chapters.forEach(c => {
        const a = createEl("a", { 
          href:"#", 
          "data-audio-seek": String(c.t), 
          class:"fsi-chip", 
          text: (c.label||"@")+ " " + (typeof c.t==="string"? c.t: formatTime(c.t)),
          "aria-label": "Jump to " + (c.label||"chapter") + " at " + (typeof c.t==="string"? c.t: formatTime(c.t))
        });
        
        // Add touch feedback for chips
        a.addEventListener("touchstart", (e) => {
          e.preventDefault();
          a.style.transform = "scale(0.95)";
        });
        a.addEventListener("touchend", (e) => {
          e.preventDefault();
          a.style.transform = "";
        });
        
        chap.appendChild(a);
      });
      wrap.appendChild(chap);
    }

    // Initialize
    if (!config.playlist || !config.playlist.length) return;
    load(0);
    
    // Debug: Log when audio is ready
    audio.addEventListener("loadedmetadata", () => {
      console.log("Audio metadata loaded, duration:", audio.duration);
    });
    
    audio.addEventListener("error", (e) => {
      console.error("Audio error:", e);
    });

    // Expose for console debugging
    window.__fsiAudio = { audio, next: ()=>load(idx+1), prev: ()=>load(idx-1), load };
  }

  function init() {
    const cfg = loadConfig();
    if (!cfg) return;
    buildUI(cfg);
  }

  // Re-init after MkDocs Material AJAX page load
  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("readystatechange", ()=> {
    if (document.readyState === "complete") init();
  });
  document.addEventListener("md-content-rendered", init);
})();
