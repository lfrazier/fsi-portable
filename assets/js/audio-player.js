
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
    
    // Top row for title and minimize button
    const topRow = createEl("div", { class: "fsi-audio-row fsi-audio-row-top" });
    const title = createEl("div", { class: "fsi-title", text: "Audio" });
    const minimizeBtn = createEl("button", { class: "fsi-btn fsi-minimize", title: "Minimize player", "aria-label": "Minimize player" });
    minimizeBtn.innerHTML = "−";
    
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
    playBtn.innerHTML = "▶";

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
    topRow.appendChild(minimizeBtn);
    
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
    audio.preload = "metadata";
    
    // Debug all audio events
    audio.addEventListener("loadstart", () => console.log("Audio loadstart"));
    audio.addEventListener("loadeddata", () => console.log("Audio loadeddata"));
    audio.addEventListener("loadedmetadata", () => console.log("Audio loadedmetadata"));
    audio.addEventListener("canplay", () => console.log("Audio canplay"));
    audio.addEventListener("canplaythrough", () => console.log("Audio canplaythrough"));
    audio.addEventListener("seeking", () => console.log("Audio seeking"));
    audio.addEventListener("seeked", () => console.log("Audio seeked"));
    audio.addEventListener("error", (e) => console.log("Audio error:", e));
    audio.addEventListener("abort", () => console.log("Audio abort"));
    audio.addEventListener("suspend", () => console.log("Audio suspend"));

    let idx = 0;
    let currentSrc = null;
    function load(i) {
      const newIdx = Math.max(0, Math.min(config.playlist.length-1, i));
      const item = config.playlist[newIdx];
      const src = item.src || item.url;
      
      // Prevent loading the same source twice
      if (currentSrc === src) {
        console.log("Already loaded this source, skipping:", src);
        return;
      }
      
      currentSrc = src;
      idx = newIdx;
      console.log("Load function called with index:", i, "current idx:", idx);
      
      const label = item.label || item.title || (src ? src.split("/").pop() : "Audio");
      title.textContent = label;
      console.log("Setting audio.src to:", src);
      audio.src = src;
      audio.playbackRate = Number(speed.value) || 1;
      const resume = loadPos(src);
      if (resume) {
        console.log("Resuming from saved position:", resume);
        audio.currentTime = resume;
      }
      // Don't reset range value here - let it be set by timeupdate when audio loads
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
    let clickTimeout = null;
    playBtn.addEventListener("click", (e) => {
      if (isMinimized) {
        // If minimized, check for double-click
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          clickTimeout = null;
          // Double-click detected - restore player
          toggleMinimize();
          return;
        } else {
          // First click - set timeout for double-click detection
          clickTimeout = setTimeout(() => {
            clickTimeout = null;
            // Single click - just play/pause
            playpause();
          }, 300);
          return;
        }
      }
      playpause();
    });
    prevBtn.addEventListener("click", ()=> load(idx-1));
    nextBtn.addEventListener("click", ()=> load(idx+1));
    
    // Minimize/maximize functionality
    function toggleMinimize() {
      isMinimized = !isMinimized;
      if (isMinimized) {
        // Hide all elements except play button
        topRow.style.display = "none";
        middleRow.style.display = "none";
        bottomRow.style.display = "none";
        // Show only the play button in the center
        playBtn.style.display = "flex";
        playBtn.style.margin = "auto";
        playBtn.title = "Click to play/pause, double-click or click outside to restore";
        wrap.classList.add("fsi-minimized");
        // Hide the minimize button itself
        minimizeBtn.style.display = "none";
      } else {
        // Show all elements
        topRow.style.display = "flex";
        middleRow.style.display = "flex";
        bottomRow.style.display = "flex";
        // Reset play button styling
        playBtn.style.display = "";
        playBtn.style.margin = "";
        playBtn.title = "Play/Pause (Space)";
        wrap.classList.remove("fsi-minimized");
        // Show the minimize button again
        minimizeBtn.style.display = "flex";
      }
    }
    
    minimizeBtn.addEventListener("click", toggleMinimize);
    
    // Add click handler to wrapper when minimized for easier restoration
    wrap.addEventListener("click", (e) => {
      if (isMinimized && e.target === wrap) {
        toggleMinimize();
      }
    });
    
    // Skip button handlers with proper audio state checking
    skipBackBtn.addEventListener("click", ()=> { 
      if (seekingDisabled) {
        console.log("Seeking disabled - skip back not available");
        return;
      }
      if (audio.duration && audio.readyState >= 2) {
        const newTime = Math.max(0, audio.currentTime - 30);
        audio.currentTime = newTime;
        console.log("Skip back 30s, new time:", audio.currentTime);
      } else {
        console.log("Skip back: audio not ready, readyState:", audio.readyState);
      }
    });
    skipForwardBtn.addEventListener("click", ()=> { 
      if (seekingDisabled) {
        console.log("Seeking disabled - skip forward not available");
        return;
      }
      if (audio.duration && audio.readyState >= 2) {
        const newTime = Math.min(audio.duration, audio.currentTime + 30);
        audio.currentTime = newTime;
        console.log("Skip forward 30s, new time:", audio.currentTime);
      } else {
        console.log("Skip forward: audio not ready, readyState:", audio.readyState);
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
        const newRangeValue = Math.floor((cur/dur)*1000);
        console.log("Timeupdate: updating range from", range.value, "to", newRangeValue, "isDragging:", isDragging);
        range.value = newRangeValue;
      } else {
        console.log("Timeupdate: NOT updating range, isDragging:", isDragging, "dur:", dur);
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
      playBtn.innerHTML = "⏸";
      playBtn.setAttribute("aria-label", "Pause");
    });
    audio.addEventListener("pause", ()=> {
      playBtn.innerHTML = "▶";
      playBtn.setAttribute("aria-label", "Play");
    });
    // Simple range slider support
    let isDragging = false;
    let seekTimeout = null;
    let seekingDisabled = false;
    let isMinimized = false;
    
    // Function to test if seeking works
    function testSeeking() {
      if (audio.duration && audio.readyState >= 2) {
        const originalTime = audio.currentTime;
        const testTime = Math.min(5, audio.duration * 0.1); // Try to seek to 5 seconds or 10% of duration
        
        try {
          audio.currentTime = testTime;
          setTimeout(() => {
            if (Math.abs(audio.currentTime - testTime) > 1) {
              // Seeking didn't work - disable seeking functionality
              seekingDisabled = true;
              console.log("Seeking disabled - audio file appears to be non-seekable");
              range.disabled = true;
              range.title = "Seeking not available for this audio file";
              skipBackBtn.disabled = true;
              skipForwardBtn.disabled = true;
              skipBackBtn.title = "Skip not available for this audio file";
              skipForwardBtn.title = "Skip not available for this audio file";
            } else {
              // Seeking works - restore original position
              audio.currentTime = originalTime;
              console.log("Seeking works - audio file is seekable");
            }
          }, 100);
        } catch (error) {
          console.log("Seeking test failed:", error);
          seekingDisabled = true;
        }
      }
    }
    
    // Test seeking when audio is ready
    audio.addEventListener("canplay", () => {
      if (!seekingDisabled) {
        testSeeking();
      }
    });
    
    // Handle range input for scrubbing
    range.addEventListener("input", (e)=> {
      if (seekingDisabled) {
        console.log("Seeking disabled - ignoring range input");
        return;
      }
      
      console.log("Range input event fired, value:", e.target.value, "range.value:", range.value);
      isDragging = true;
      const dur = audio.duration || 0;
      // Use the event target value instead of range.value to avoid race conditions
      const rangeValue = e.target.value;
      const v = Number(rangeValue)/1000;
      console.log("Calculated v:", v, "duration:", dur, "rangeValue:", rangeValue);
      
      // Clear any pending seek
      if (seekTimeout) {
        clearTimeout(seekTimeout);
      }
      
      if (dur && v >= 0 && v <= 1) {
        const newTime = v * dur;
        console.log("Setting audio.currentTime to:", newTime, "from range value:", rangeValue);
        
        // Debounce the seeking to avoid rapid fire seeks
        seekTimeout = setTimeout(() => {
          const wasPlaying = !audio.paused;
          if (wasPlaying) {
            audio.pause();
          }
          
          try {
            console.log("Attempting to seek to:", newTime);
            
            // Check if the audio is ready for seeking
            if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
              audio.currentTime = newTime;
              console.log("Audio currentTime set to:", audio.currentTime);
            } else {
              console.log("Audio not ready for seeking, readyState:", audio.readyState);
              // Wait for the audio to be ready
              const checkReady = () => {
                if (audio.readyState >= 2) {
                  audio.currentTime = newTime;
                  console.log("Audio currentTime set to (delayed):", audio.currentTime);
                } else {
                  setTimeout(checkReady, 100);
                }
              };
              checkReady();
            }
            
            if (wasPlaying) {
              // Resume playback after a delay
              setTimeout(() => {
                audio.play().catch(err => console.log("Error resuming playback:", err));
              }, 200);
            }
          } catch (error) {
            console.log("Error setting currentTime:", error);
          }
        }, 50); // 50ms debounce
      } else {
        console.log("Not setting audio time - v:", v, "dur:", dur, "v valid:", v >= 0 && v <= 1);
      }
    });
    
    // Handle range change for final position
    range.addEventListener("change", (e)=> {
      isDragging = false;
      const dur = audio.duration || 0;
      const rangeValue = e.target.value;
      const v = Number(rangeValue)/1000;
      console.log("Range change event, value:", rangeValue, "calculated v:", v);
      
      // Clear any pending seek
      if (seekTimeout) {
        clearTimeout(seekTimeout);
      }
      
      if (dur && v >= 0 && v <= 1) {
        const newTime = v * dur;
        console.log("Final seek to:", newTime);
        
        // Immediate seek for final position
        try {
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
            audio.currentTime = newTime;
            console.log("Range changed to:", audio.currentTime, "of", dur);
          } else {
            console.log("Audio not ready for final seek, readyState:", audio.readyState);
            // Wait for the audio to be ready
            const checkReady = () => {
              if (audio.readyState >= 2) {
                audio.currentTime = newTime;
                console.log("Range changed to (delayed):", audio.currentTime, "of", dur);
              } else {
                setTimeout(checkReady, 100);
              }
            };
            checkReady();
          }
        } catch (error) {
          console.log("Error in final seek:", error);
        }
      }
    });
    
    // Additional drag state management
    range.addEventListener("mousedown", ()=> {
      isDragging = true;
    });
    range.addEventListener("mouseup", ()=> {
      isDragging = false;
    });
    range.addEventListener("touchstart", ()=> {
      isDragging = true;
    });
    range.addEventListener("touchend", ()=> {
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
        if (seekingDisabled) {
          console.log("Seeking disabled - keyboard skip back not available");
          return;
        }
        if (audio.duration && audio.readyState >= 2) {
          const newTime = Math.max(0, audio.currentTime - 30);
          audio.currentTime = newTime;
          console.log("Keyboard skip back 30s, new time:", audio.currentTime);
        } else {
          console.log("Keyboard skip back: audio not ready, readyState:", audio.readyState);
        }
      }
      else if (e.key === "ArrowRight") { 
        e.preventDefault(); 
        if (seekingDisabled) {
          console.log("Seeking disabled - keyboard skip forward not available");
          return;
        }
        if (audio.duration && audio.readyState >= 2) {
          const newTime = Math.min(audio.duration, audio.currentTime + 30);
          audio.currentTime = newTime;
          console.log("Keyboard skip forward 30s, new time:", audio.currentTime);
        } else {
          console.log("Keyboard skip forward: audio not ready, readyState:", audio.readyState);
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
    // Check if audio player already exists
    if (document.querySelector('.fsi-audio-wrap')) {
      console.log('Audio player already exists, skipping initialization');
      return;
    }
    
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
