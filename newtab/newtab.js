// FocusFlow v6.15 — Custom New Tab page.
// This page is OPT-IN. The manifest does NOT override the browser's native
// new tab anymore; instead, the service worker watches for newly-created
// tabs and redirects them here only when settings.customNewTab === true.
// When the setting is OFF, this file is never loaded — users see their
// browser's true native new tab page (Google search box, top sites, etc.).

// Bug 5 fix: gSync and todayKey now come from storage.js (loaded via script tag)



// todayKey() now comes from storage.js (loaded via script tag)

function tickClock() {
  const d = new Date();
  $("clock").textContent =
    String(d.getHours()).padStart(2, "0") + ":" +
    String(d.getMinutes()).padStart(2, "0");
  $("date").textContent = d.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  const h = d.getHours();
  let greetTxt = "Late night focus";
  if (h < 5) greetTxt = "Burning the midnight oil";
  else if (h < 12) greetTxt = "Good morning";
  else if (h < 17) greetTxt = "Good afternoon";
  else if (h < 21) greetTxt = "Good evening";
  $("greet").textContent = greetTxt;
}

async function loadStats() {
  try {
    const res = await msg("STATS_GET_DAY", { day: todayKey() });
    const data = (res && res.data) || {};
    const prod = (data.productivity || 0) + (data.learning || 0);
    const dist = data.distraction || 0;
    $("stat-prod").textContent = fmt(prod);
    $("stat-dist").textContent = fmt(dist);
  } catch (_) {}
  try {
    const r = await msg("GET_FOCUS_HISTORY");
    const hist = (r && r.focusHistory) || [];
    const today = todayKey();
    const cycles = hist
      .filter((h) => h.date === today && !h.isSchedule)
      .reduce((s, h) => s + (h.cyclesCompleted || 0), 0);
    $("stat-cycles").textContent = String(cycles);
  } catch (_) {}
}

let lastState = null;
let liveTimer = null;

function paintFocusButton(fs) {
  const btn = $("btn-focus");
  const live = $("live-timer");
  if (fs && fs.active) {
    btn.textContent = "Stop Focus";
    btn.className = "bs-danger";
    btn.dataset.action = "stop";

    const isWork = fs.phase === "work";
    let remaining = fs.remaining;
    if (!fs.paused && fs.phaseEndsAt) {
      remaining = Math.max(0, Math.round((fs.phaseEndsAt - Date.now()) / 1000));
    }
    const phase = isWork ? "Work" : (fs.phase === "long_break" ? "Long Break" : "Break");
    live.textContent = `⏱ ${phase} · ${fmtTimer(remaining)} remaining`;
    live.className = "live-timer show" + (isWork ? "" : " brk");
  } else {
    btn.textContent = "Start Focus";
    btn.className = "bp";
    btn.dataset.action = "start";
    live.className = "live-timer";
  }
}

async function refreshFocus() {
  const res = await msg("FOCUS_GET_STATE");
  lastState = (res && res.focusState) || null;
  paintFocusButton(lastState);
  if (lastState && lastState.active && !lastState.paused) startLiveTimer();
  else stopLiveTimer();
}

function startLiveTimer() {
  stopLiveTimer();
  liveTimer = setInterval(() => {
    if (lastState && lastState.active && !lastState.paused) paintFocusButton(lastState);
  }, 1000);
}
function stopLiveTimer() { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } }

function wireButtons() {
  $("btn-focus").addEventListener("click", async () => {
    const action = $("btn-focus").dataset.action || "start";
    if (action === "stop") {
      const s = await gSync(["settings"]);
      const e = s.settings || {};
      if (e.passcodeHash && e.lockStop !== false) {
        const pin = prompt("Enter your 6-digit PIN to stop focus:");
        if (!pin) return;
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
        const hashedPin = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
        if (hashedPin !== e.passcodeHash) {
          alert("Incorrect PIN.");
          return;
        }
      }
      await msg("FOCUS_STOP");
    }
    else await msg("FOCUS_START");
    setTimeout(() => { refreshFocus(); loadStats(); }, 200);
  });
  $("btn-dash").addEventListener("click", () => {
    try { chrome.runtime.openOptionsPage(); }
    catch (_) { chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") }); }
  });
}

chrome.runtime.onMessage.addListener((m) => {
  if (m && m.type === "FOCUS_TICK" && m.focusState) {
    lastState = m.focusState;
    paintFocusButton(lastState);
    if (lastState.active && !lastState.paused) startLiveTimer();
    else stopLiveTimer();
  }
});
chrome.runtime.connect({ name: "flow-tracker" });

(async function init() {
  // FF v6.18: No need to check customNewTab here — the service worker only
  // redirects to this page when the setting is ON. The page always activates.
  try {
    document.body.classList.add("ff-newtab-active");
    $("quote").textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    tickClock();
    setInterval(tickClock, 30 * 1000);
    wireButtons();
    await Promise.all([loadStats(), refreshFocus()]);
    setInterval(loadStats, 60 * 1000);
  } catch (_) {
    document.body.classList.add("ff-newtab-active");
    tickClock();
    setInterval(tickClock, 30 * 1000);
  }
})();
