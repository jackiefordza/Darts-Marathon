(function(){
  "use strict";

  const RESET_PASSWORD = "JakeFordham";

  const DEFAULT_STATE = () => ({
    eventName: "Burnaby Arms Darts Marathon",
    teams: {
      green: { name: "Green Team", remaining: 100001, history: [], totalVisits: 0, totalPoints: 0 },
      red:   { name: "Red Team",   remaining: 100001, history: [], totalVisits: 0, totalPoints: 0 }
    },
    startedAt: null,
    updatedAt: new Date().toISOString()
  });

  let state = null;
  let view = "landing"; // landing | entry-green | entry-red | display | setup
  let unsubscribed = false;

  function fmt(n){ return n.toLocaleString("en-GB"); }

  function validThrow(remaining, score){
    if(isNaN(score) || score < 0 || score > 180) return { ok:false, reason:"Score must be 0–180." };
    const next = remaining - score;
    if(next < 0) return { ok:false, reason:"That busts — score can't exceed remaining points." };
    if(next === 1) return { ok:false, reason:"Can't leave 1 — no checkout possible. Bust." };
    return { ok:true, next };
  }

  async function saveState(s){
    s.updatedAt = new Date().toISOString();
    try{
      await docRef.set(s);
    }catch(e){
      console.error("Firestore save failed", e);
      showBanner(true);
    }
  }

  function showBanner(show){
    const b = document.getElementById("conn-banner");
    if(b) b.classList.toggle("show", !!show);
  }

  function render(){
    const root = document.getElementById("app");
    if(!state) { root.innerHTML = `<div class="landing"><div class="eyebrow">Connecting…</div></div>`; return; }
    if(view === "landing") root.innerHTML = renderLanding();
    else if(view === "entry-green") root.innerHTML = renderEntry("green");
    else if(view === "entry-red") root.innerHTML = renderEntry("red");
    else if(view === "display") root.innerHTML = renderDisplay();
    else if(view === "setup") root.innerHTML = renderSetup();
    attachHandlers();
    if(view === "display") setTimeout(()=>initQr("qrcode-header", 150), 30);
    if(view === "landing") setTimeout(()=>initQr("qrcode-landing"), 30);
  }

  function renderLanding(){
    return `
      <div class="landing">
        <img src="assets/burnaby-logo.png?v=18" alt="Burnaby Arms crest" class="crest" />
        <div class="eyebrow">Live · 100,001 → 0</div>
        <h1>${state.eventName}</h1>
        <div class="sub">Two boards, two teams, one countdown. Pick your role below.</div>
        <div class="menu">
          <button class="menu-btn green" data-nav="entry-green"><span>${state.teams.green.name} — Enter Scores</span><span class="arrow">›</span></button>
          <button class="menu-btn red" data-nav="entry-red"><span>${state.teams.red.name} — Enter Scores</span><span class="arrow">›</span></button>
          <button class="menu-btn display" data-nav="display"><span>Viewing Screen</span><span class="arrow">›</span></button>
          <button class="menu-btn setup" data-nav="setup">Event setup / reset</button>
        </div>
        <div class="qr-box landing-qr">
          <div id="qrcode-landing"></div>
          <div class="txt">Scan this to open the scorer on your phone</div>
        </div>
      </div>`;
  }

  function renderEntry(team){
    const t = state.teams[team];
    const last = t.history[t.history.length-1];
    return `
      <div class="topbar">
        <button class="back" data-nav="landing">← Back</button>
        <span class="team-tag">${t.name}</span>
        <span class="topbar-timer" id="entry-timer">${formatElapsed(state.startedAt)}</span>
      </div>
      <div class="entry-wrap team-${team}">
        <div class="remaining-card">
          <div class="label">Remaining</div>
          <div class="num" id="remain-num">${fmt(t.remaining)}</div>
          <div class="last">${last ? `Last visit: <b>${last.score}</b>${last.thrower ? " · "+escapeHtml(last.thrower) : ""}` : "No visits logged yet"}</div>
          <div class="bust-flag" id="bust-flag">Bust — try again</div>
          <div class="finished-flag ${t.remaining===0?'show':''}">🏆 Finished!</div>
        </div>

        <button class="undo-btn undo-top" id="undo-visit" ${t.history.length===0?"disabled":""}>↩ Undo last entry</button>

        <div class="quickpicks">
          ${[180,140,100,85,81,60,45,41,26].map(v=>`<button class="qp" data-score="${v}">${v}</button>`).join("")}
          <button class="qp bust-btn" data-score="0">0 / miss</button>
        </div>

        <div class="manual-row">
          <input type="number" id="manual-score" placeholder="Enter visit score" min="0" max="180" inputmode="numeric" />
        </div>
        <div class="thrower-row">
          <input type="text" id="thrower-name" placeholder="Thrower's name (optional)" />
        </div>
        <button class="submit-btn" id="submit-visit">Log this visit</button>

        <div class="visit-log">
          <h3>Recent visits</h3>
          ${t.history.slice(-8).reverse().map(h=>`
            <div class="log-row">
              <span class="sc ${h.bust?'bust':''}">${h.bust?"BUST":h.score}</span>
              <span class="who">${h.thrower ? escapeHtml(h.thrower)+" · " : ""}${timeAgo(h.time)}</span>
            </div>`).join("") || `<div class="log-row"><span class="who">Nothing logged yet — first throw of the day!</span></div>`}
        </div>
      </div>`;
  }

  function renderDisplay(){
    const g = state.teams.green, r = state.teams.red;
    const combined = [...g.history.map(h=>({...h, team:"green"})), ...r.history.map(h=>({...h, team:"red"}))]
      .sort((a,b)=> new Date(a.time) - new Date(b.time)).slice(-14);
    const tickerItems = combined.length ? combined : [{team:null, score:"", thrower:"Waiting for first throw…", bust:false}];
    const tickerHtml = tickerItems.map(h=>`<span>${h.team ? `<i class="dot ${h.team}"></i>` : ""} ${h.bust?"bust":h.score}${h.thrower?" · "+escapeHtml(h.thrower):""}</span>`).join("");

    return `
      <div class="topbar" style="border:none;">
        <button class="back" data-nav="landing">← Back</button>
      </div>
      <div class="display-wrap">
        <div class="display-head">
          <div class="head-flank head-flank-left">
            <div id="qrcode-header"></div>
            <div class="flank-txt">Scan to log scores</div>
          </div>
          <div class="head-center">
            <h1>${state.eventName}</h1>
            <div class="sub">Live countdown · 100,001 to zero, doubles out</div>
            <div class="timer-badge" id="event-timer"><span class="tl">Time elapsed</span>${formatElapsed(state.startedAt)}</div>
          </div>
          <div class="head-flank head-flank-right">
            <img src="assets/burnaby-logo.png?v=18" alt="Burnaby Arms crest" class="crest-large" />
          </div>
        </div>
        <div class="boards">
          ${boardPanel("green", g)}
          ${boardPanel("red", r)}
        </div>
        <div class="ticker-wrap">
          <div class="ticker-track">${tickerHtml}${tickerHtml}</div>
        </div>
        <div class="footer-row">
          <div class="charity-line" style="margin-left:auto;">Raising money for the <b>Community Defibrillator Fund</b> — every visit logged here helps the pot grow.</div>
        </div>
      </div>`;
  }

  function boardPanel(key, t){
    const digits = String(t.remaining).split("");
    const tiles = [];
    for(let i=0;i<digits.length;i++){
      tiles.push(`<span class="digit-tile">${digits[i]}</span>`);
      const remainingDigits = digits.length - i - 1;
      if(remainingDigits>0 && remainingDigits % 3 === 0) tiles.push(`<span class="digit-sep">,</span>`);
    }
    const avg = t.totalVisits ? Math.round(t.totalPoints / t.totalVisits) : 0;
    const last = t.history[t.history.length-1];
    const eta = computeEta(t);
    return `
      <div class="board-panel ${key}">
        <div class="team-name">${t.name}</div>
        <div class="odometer">${tiles.join("")}</div>
        <div class="finished-banner ${t.remaining===0?'show':''}">🏆 Finished!</div>
        <div class="stat-row">
          <div class="stat"><div class="v">${t.totalVisits}</div><div class="l">Visits</div></div>
          <div class="stat"><div class="v">${avg}</div><div class="l">Avg / visit</div></div>
        </div>
        <div class="last-visit-strip">
          <div class="lv-label">Last visit</div>
          <div class="lv-val">${last ? (last.bust ? "BUST" : last.score) : "—"}</div>
        </div>
        <div class="eta-strip" id="eta-${key}">${etaHtml(eta, t.remaining)}</div>
      </div>`;
  }

  function computeEta(t){
    if(!state.startedAt || t.remaining === 0) return null;
    if(t.totalVisits < 3 || t.totalPoints <= 0) return null;
    const elapsedMs = Date.now() - new Date(state.startedAt).getTime();
    if(elapsedMs < 60000) return null; // need at least a minute of real pace data
    const pointsPerMs = t.totalPoints / elapsedMs;
    if(pointsPerMs <= 0) return null;
    const msRemaining = t.remaining / pointsPerMs;
    if(!isFinite(msRemaining) || msRemaining > 1000*60*60*30) return null; // ignore wild early estimates (>30h)
    return { finishAt: new Date(Date.now() + msRemaining), msRemaining };
  }

  function etaHtml(eta, remaining){
    if(remaining === 0) return `<div class="eta-label">Finished</div>`;
    if(!eta) return `<div class="eta-label">Estimated finish</div><div class="eta-val">Calculating pace…</div>`;
    const clock = eta.finishAt.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
    const h = Math.floor(eta.msRemaining/3600000);
    const m = Math.floor((eta.msRemaining%3600000)/60000);
    const left = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    return `<div class="eta-label">Estimated finish</div><div class="eta-val">${clock}<span class="eta-sub">${left}</span></div>`;
  }

  function renderSetup(){
    return `
      <div class="topbar">
        <button class="back" data-nav="landing">← Back</button>
        <span class="team-tag">Event setup</span>
      </div>
      <div class="setup-wrap">
        <label>Event name</label>
        <input type="text" id="setup-event" value="${escapeHtml(state.eventName)}" />
        <label>Team 1 name</label>
        <input type="text" id="setup-green" value="${escapeHtml(state.teams.green.name)}" />
        <label>Team 2 name</label>
        <input type="text" id="setup-red" value="${escapeHtml(state.teams.red.name)}" />
        <div class="setup-actions">
          <button class="btn-primary" id="save-setup">Save names</button>
          <button class="btn-danger" id="reset-event">Reset countdown to 100,001 for both teams</button>
        </div>
        <div class="setup-note">Resetting clears both teams' remaining score and visit history back to 100,001, and clears the timer — use this once, right before the marathon starts. Changes sync to everyone's screen instantly. Reset is password-protected so it can't be triggered by accident.</div>
      </div>`;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function timeAgo(iso){
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime())/1000));
    if(s<60) return "just now";
    if(s<3600) return Math.floor(s/60)+"m ago";
    return Math.floor(s/3600)+"h ago";
  }
  function formatElapsed(startedAt){
    if(!startedAt) return "Not started";
    const ms = Math.max(0, Date.now() - new Date(startedAt).getTime());
    const h = Math.floor(ms/3600000);
    const m = Math.floor((ms%3600000)/60000);
    const s = Math.floor((ms%60000)/1000);
    const pad = n => String(n).padStart(2,"0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  function tickTimer(){
    if(!state) return;
    const disp = document.getElementById("event-timer");
    if(disp) disp.innerHTML = `<span class="tl">Time elapsed</span>${formatElapsed(state.startedAt)}`;
    const entryT = document.getElementById("entry-timer");
    if(entryT) entryT.textContent = formatElapsed(state.startedAt);

    if(view === "display" && state.teams){
      const etaG = document.getElementById("eta-green");
      if(etaG) etaG.innerHTML = etaHtml(computeEta(state.teams.green), state.teams.green.remaining);
      const etaR = document.getElementById("eta-red");
      if(etaR) etaR.innerHTML = etaHtml(computeEta(state.teams.red), state.teams.red.remaining);
    }
  }

  function initQr(elementId, size){
    const el = document.getElementById(elementId);
    if(!el || typeof QRCode === "undefined") return;
    el.innerHTML = "";
    const s = size || 74;
    try{
      new QRCode(el, { text: window.location.href, width: s, height: s, colorDark:"#16130F", colorLight:"#FAF6EC" });
    }catch(e){}
  }

  function attachHandlers(){
    document.querySelectorAll("[data-nav]").forEach(btn=>{
      btn.addEventListener("click", ()=>{ view = btn.getAttribute("data-nav"); render(); });
    });

    if(view === "entry-green" || view === "entry-red"){
      const team = view === "entry-green" ? "green" : "red";
      document.querySelectorAll(".qp").forEach(btn=>{
        btn.addEventListener("click", ()=> submitVisit(team, Number(btn.getAttribute("data-score"))));
      });
      const manualInput = document.getElementById("manual-score");
      if(manualInput){
        manualInput.addEventListener("input", ()=>{
          if(manualInput.value === ""){ manualInput.classList.remove("invalid"); return; }
          const n = parseInt(manualInput.value, 10);
          const bad = isNaN(n) || n > 180 || n < 0;
          manualInput.classList.toggle("invalid", bad);
        });
      }
      document.getElementById("submit-visit").addEventListener("click", ()=>{
        const valStr = document.getElementById("manual-score").value;
        if(valStr === "") { flashBust("Enter a score first."); return; }
        const n = Number(valStr);
        if(isNaN(n) || n > 180 || n < 0){
          flashBust("Max score is 180 — check that number before logging it.");
          return;
        }
        submitVisit(team, n);
      });
      const undoBtn = document.getElementById("undo-visit");
      if(undoBtn) undoBtn.addEventListener("click", ()=> undoVisit(team));
    }

    if(view === "setup"){
      document.getElementById("save-setup").addEventListener("click", async ()=>{
        state.eventName = document.getElementById("setup-event").value.trim() || state.eventName;
        state.teams.green.name = document.getElementById("setup-green").value.trim() || state.teams.green.name;
        state.teams.red.name = document.getElementById("setup-red").value.trim() || state.teams.red.name;
        await saveState(state);
        view = "landing"; render();
      });
      document.getElementById("reset-event").addEventListener("click", async ()=>{
        const pw = prompt("Enter the reset password:");
        if(pw === null) return; // cancelled
        if(pw !== RESET_PASSWORD){ alert("Incorrect password — reset cancelled."); return; }
        if(!confirm("Reset both teams to 100,001, clear all history, and reset the timer?")) return;
        state.teams.green.remaining = 100001; state.teams.green.history = []; state.teams.green.totalVisits = 0; state.teams.green.totalPoints = 0;
        state.teams.red.remaining = 100001; state.teams.red.history = []; state.teams.red.totalVisits = 0; state.teams.red.totalPoints = 0;
        state.startedAt = null;
        await saveState(state);
        view = "landing"; render();
      });
    }
  }

  async function submitVisit(team, score){
    const thrower = document.getElementById("thrower-name") ? document.getElementById("thrower-name").value.trim() : "";
    const submitBtn = document.getElementById("submit-visit");
    if(submitBtn) submitBtn.disabled = true;
    let bustReason = null;

    try{
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const data = snap.exists ? snap.data() : DEFAULT_STATE();
        const t = data.teams[team];
        if(!data.startedAt) data.startedAt = new Date().toISOString();

        const check = validThrow(t.remaining, score);
        const entry = { score, thrower, time: new Date().toISOString(), bust: !check.ok };
        t.history = [...(t.history || []), entry];

        if(check.ok){
          t.remaining = check.next;
          t.totalVisits = (t.totalVisits || 0) + 1;
          t.totalPoints = (t.totalPoints || 0) + score;
        } else {
          bustReason = check.reason;
        }

        data.updatedAt = new Date().toISOString();
        tx.set(docRef, data);
      });
    }catch(e){
      console.error("Submit visit failed", e);
      showBanner(true);
    }

    if(submitBtn) submitBtn.disabled = false;
    if(bustReason) flashBust(bustReason);
    const manual = document.getElementById("manual-score");
    if(manual) manual.value = "";
  }

  async function undoVisit(team){
    const undoBtn = document.getElementById("undo-visit");
    if(undoBtn) undoBtn.disabled = true;
    try{
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if(!snap.exists) return;
        const data = snap.data();
        const t = data.teams[team];
        const last = (t.history || []).pop();
        if(!last) return;
        if(!last.bust){
          t.remaining += last.score;
          t.totalVisits = Math.max(0, (t.totalVisits || 0) - 1);
          t.totalPoints = Math.max(0, (t.totalPoints || 0) - last.score);
        }
        data.updatedAt = new Date().toISOString();
        tx.set(docRef, data);
      });
    }catch(e){
      console.error("Undo failed", e);
      showBanner(true);
    }
    if(undoBtn) undoBtn.disabled = false;
  }

  function flashBust(msg){
    const el = document.getElementById("bust-flag");
    if(!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(()=> el.classList.remove("show"), 2200);
  }

  // ---------- Firestore realtime listener ----------
  async function boot(){
    // If opened with ?view=display, land straight on the viewing screen —
    // this means a forced reload (e.g. Safari's energy-saver reload) recovers
    // automatically instead of dropping back to the landing menu.
    const params = new URLSearchParams(window.location.search);
    if(params.get("view") === "display") view = "display";

    try{
      const snap = await docRef.get();
      if(!snap.exists){
        await docRef.set(DEFAULT_STATE());
      }
    }catch(e){
      console.error("Initial Firestore fetch failed", e);
      showBanner(true);
    }

    docRef.onSnapshot(
      (snap) => {
        showBanner(false);
        if(!snap.exists) return;
        const fresh = snap.data();
        const manualInput = document.getElementById("manual-score");
        const typing = manualInput && document.activeElement === manualInput && manualInput.value !== "";
        state = fresh;
        if(!typing){
          render();
        }else if(view === "entry-green" || view === "entry-red"){
          const team = view === "entry-green" ? "green" : "red";
          const numEl = document.getElementById("remain-num");
          if(numEl) numEl.textContent = fmt(state.teams[team].remaining);
        }
      },
      (err) => {
        console.error("Firestore listener error", err);
        showBanner(true);
      }
    );

    render();
    setInterval(tickTimer, 1000);
  }

  boot();
})();
