var $ = function (e) {
    return document.getElementById(e)
},
    _barChartInstance = null,
    _trendChartInstance = null,
    // Bug #5 fix: single reusable off-screen canvas for favicon painting
    _favCanvas = (() => { const c = document.createElement("canvas"); c.width = 32; c.height = 32; return c; })(),
    // Bug #8 fix: undo toast stack counter
    _toastStackCount = 0,
    rules = [],
    allowList = [],
    neverTrackDomains = [],
    siteCategories = {},
    visitedSites = [],
    AUTO_CATEGORIES = {},
    hiddenDefaultSites = [],
    FCIRC = 2 * Math.PI * 106,
    selectedCat = "all",
    currentView = "today",
    analyticsRange = 7,
    siteRange = 7,
    trendRange = 7,
    dailyRange = 7,           // FF v4.2: was implicit 45, now defaults to 7d for instant load
    dailyCustomFrom = null,   // FF v4.2: ISO date string (YYYY-MM-DD)
    dailyCustomTo = null,
    overviewCustomFrom = null,  // FF v4.4
    overviewCustomTo = null,    // FF v4.4
    trendCustomFrom = null,     // FF v4.4
    trendCustomTo = null,       // FF v4.4
    currentATab = "overview",
    isBulkMode = !1,
    bulkSelected = new Set,
    DEFAULT_CATS = ["productivity", "learning", "distraction", "communication", "uncategorized"],
    // FF v6.16: CAT_META + GRANULAR_SITES used to be redefined here. They now
    // live in src/lib/constants.js so popup.js + dashboard.js stay in sync.
    CAT_META = self.CAT_META || {};
const GRANULAR_SITES_DASHBOARD = self.GRANULAR_SITES || {};
// Auto-generate Smart Presets from AUTO_CATEGORIES (single source of truth in constants.js).
// If you add a site to AUTO_CATEGORIES, it automatically shows up here too.
var PRESETS = (function () {
    var packNames = { distraction: "Distraction Pack", communication: "Communication Pack", productivity: "Productivity Pack", learning: "Study Pack" };
    var packs = {};
    Object.entries(AUTO_CATEGORIES).forEach(function (entry) {
        var domain = entry[0], cat = entry[1];
        var name = packNames[cat];
        if (!name) return;
        if (!packs[name]) packs[name] = [];
        packs[name].push({ d: domain, c: cat });
    });
    return packs;
})();

// FF v6.18: msg() now lives in utils.js (shared with popup.js).
// Removed the duplicate that used to live here. See utils.js for the
// improved version with transient-error-only retries.


function easeOutQuart(e) {
    return 1 - Math.pow(1 - e, 4)
}

function hideAnalyticsHeader() {
    const _desc = $("analytics-page-header-desc");
    if (_desc) {
        _desc.style.display = "none";
        const _parent = _desc.parentElement;
        if (_parent) {
            Array.from(_parent.children).forEach(e => {
                if ("Analytics" === e.textContent.trim()) e.style.display = "none";
            });
        }
    }
    document.querySelectorAll('[data-atab="trend"]').forEach(e => e.textContent = "Comparison");
}
async function applyTheme() {
    const e = await gLocal(["theme"]),
        t = "light" === e.theme,
        a = "cinematic" === e.theme,
        r = "rain" === e.theme;
    document.documentElement.classList.toggle("light", t);
    document.documentElement.classList.toggle("cinematic", a);
    document.documentElement.classList.toggle("rain", r);
    document.documentElement.setAttribute("data-os-theme", "nothing");
    if (typeof syncCinematicParticles === "function") {
        syncCinematicParticles();
    }
}
function catColor(e) {
    return (CAT_META[e] || {
        color: "#555555"
    }).color
}

function catEmoji(e) {
    return (CAT_META[e] || {
        emoji: "🏷️"
    }).emoji
}

function catLabel(e, t) {
    var a = (CAT_META[e] || {
        label: e
    }).label;
    return t ? a + " ✨" : a
}

function allCats() {
    return DEFAULT_CATS;
}

function uid() {
    return (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36));
}
// Bug #3 fix: sanitize domain strings before injecting into innerHTML
function sanitizeDomain(d) {
    return String(d).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}
function formatTime12(time24) {
    if (!time24) return "—";
    const parts = time24.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}
applyTheme();
chrome.storage.onChanged.addListener((e, t) => {
    if ("local" === t) {
        if (e.theme) {
            applyTheme();
            loadAnalytics();
        }
        if (e.siteCategories || e.hiddenDefaultSites) {
            if (e.siteCategories) {
                siteCategories = e.siteCategories.newValue || {};
            }
            if (e.hiddenDefaultSites) {
                hiddenDefaultSites = e.hiddenDefaultSites.newValue || [];
            }
            const activeNav = document.querySelector(".ni.act");
            if (activeNav && activeNav.getAttribute("data-tab") === "sitemanager") {
                renderCategories();
            }
            loadAnalytics();
        }
        if (e.privacyModeActive || e.privacyModeUntil) {
            if (typeof window.updateDashboardPrivacyUI === "function") {
                window.updateDashboardPrivacyUI();
            }
        }

    }
    if ("sync" === t && e.settings) {
        applyTheme();
    }
}); $("btn-dark-mode") && $("btn-dark-mode").addEventListener("click", () => sLocal({
    theme: "dark"
})), $("btn-light-mode") && $("btn-light-mode").addEventListener("click", () => sLocal({
    theme: "light"
})), $("btn-cinematic-mode") && $("btn-cinematic-mode").addEventListener("click", () => sLocal({
    theme: "cinematic"
})), $("btn-rain-mode") && $("btn-rain-mode").addEventListener("click", () => sLocal({
    theme: "rain"
}));
var fmtT = fmtTimer;

function toast(e, t) {
    // Bug #7 fix: dfferentiate toast duration by severity
    const TOAST_DURATION = { ok: 3500, er: 5000, err: 5000 };
    var a = $("toast");
    if (!a) return;
    const isError = t === "er" || t === "err";
    const prefix = isError ? "✗ " : ("ok" === t ? "✓ " : "");
    a.textContent = prefix + e;
    a.className = "toast " + (isError ? "er" : (t || ""));
    clearTimeout(a._tid);
    a._tid = setTimeout(() => a.className = "toast hide", TOAST_DURATION[t] ?? 3500);
}
var pcRes = null,
    pcBuf = "";

function showPass(e = !1, t = "Settings Locked", a = "Enter your 6-digit PIN to continue") {
    return new Promise(n => {
        pcRes = n, pcBuf = "", updDots(), $("pc-title") && ($("pc-title").textContent = t), $("pc-desc") && ($("pc-desc").textContent = a), $("pcerr").classList.add("hide"), e ? $("pccancel").classList.remove("hide") : $("pccancel").classList.add("hide"), $("pcOverlay").classList.remove("hide")
    })
}

function updDots() {
    $("pdots").querySelectorAll("span").forEach((e, t) => e.classList.toggle("on", t < pcBuf.length))
}
async function checkGate() {
    var e = (await gSync(["settings"])).settings || {};
    if (!e.passcodeHash || !1 === e.lockSettings) return !0;
    for (;;) {
        if (await showPass(!1, "Settings Locked", "Enter your 6-digit PIN to access settings.")) return !0;
    }
}
async function promptPinIfEnabled(e) {
    var t = (await gSync(["settings"])).settings || {};
    return !t.passcodeHash || !1 === t[e] || await showPass(!0, "Verification Required", "Enter your PIN to perform this action.")
}
document.addEventListener("keydown", e => {
    const t = $("pcOverlay");
    if (t && !t.classList.contains("hide")) {
        if (e.key >= "0" && e.key <= "9") {
            e.preventDefault();
            e.stopPropagation();
            if (pcBuf.length < 6) {
                pcBuf += e.key;
                updDots();
            }
        } else if ("Backspace" === e.key) {
            e.preventDefault();
            e.stopPropagation();
            pcBuf = pcBuf.slice(0, -1);
            updDots();
        } else if ("Enter" === e.key) {
            e.preventDefault();
            e.stopPropagation();
            if (pcBuf.length >= 4) {
                $("pcok").click();
            }
        } else if ("Escape" === e.key && $("pccancel") && !$("pccancel").classList.contains("hide")) {
            e.preventDefault();
            e.stopPropagation();
            $("pccancel").click();
        }
    } else {
        const confModal = $("confirm-modal");
        if (confModal && !confModal.classList.contains("hide")) {
            if ("Enter" === e.key) {
                e.preventDefault();
                e.stopPropagation();
                $("confirm-modal-yes").click();
            } else if ("Escape" === e.key) {
                e.preventDefault();
                e.stopPropagation();
                $("confirm-modal-no").click();
            }
        } else if ("Escape" === e.key) {
            let closedAny = false;
            const ftModal = $("free-time-modal");
            if (ftModal && !ftModal.classList.contains("hide")) {
                ftModal.classList.add("hide");
                closedAny = true;
            }
            const arModal = $("add-rule-modal");
            if (arModal && !arModal.classList.contains("hide")) {
                arModal.classList.add("hide");
                closedAny = true;
            }
            const sModal = $("scrubModal");
            if (sModal && !sModal.classList.contains("hide")) {
                sModal.classList.add("hide");
                closedAny = true;
            }
            if (closedAny) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
}, !0), $("pccancel").addEventListener("click", () => {
    $("pcOverlay").classList.add("hide"), pcRes && pcRes(!1)
}), document.querySelectorAll(".pk[data-n]").forEach(e => e.addEventListener("click", () => {
    pcBuf.length >= 6 || (pcBuf += e.getAttribute("data-n"), updDots())
})), $("pclr").addEventListener("click", () => {
    pcBuf = pcBuf.slice(0, -1), updDots()
}), $("pcok").addEventListener("click", async () => {
    if (pcBuf.length >= 4) {
        var e = await gSync(["settings"]);
        const settings = e.settings || {};
        const res = await verifyAndMigratePin(pcBuf, settings.passcodeHash);
        if (res.success) {
            if (res.migratedHash) {
                settings.passcodeHash = res.migratedHash;
                await sSync({ settings });
            }
            $("pcOverlay").classList.add("hide");
            pcRes && pcRes(!0);
        } else {
            $("pcerr").classList.remove("hide");
            pcBuf = "";
            updDots();
        }
    }
});

let confirmResolver = null;
function showConfirm(title, message, options = {}) {
    const modal = document.getElementById("confirm-modal");
    if (!modal) return Promise.resolve(confirm(message));
    document.getElementById("confirm-modal-title").textContent = title || "Are you sure?";
    const escapedMessage = String(message)
        .replace(/[&<>'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c))
        .replace(/\n/g, "<br>");
    setSafeHTML(document.getElementById("confirm-modal-message"), escapedMessage);
    const iconSpan = document.getElementById("confirm-modal-icon");
    if (options.icon) {
        iconSpan.textContent = options.icon;
    } else {
        iconSpan.textContent = "⚠️";
    }
    const yesBtn = document.getElementById("confirm-modal-yes");
    const noBtn = document.getElementById("confirm-modal-no");
    yesBtn.textContent = options.confirmText || "Confirm";
    noBtn.textContent = options.cancelText || "Cancel";
    if (options.isDestructive) {
        yesBtn.style.background = "var(--red)";
        yesBtn.style.borderColor = "var(--red)";
        yesBtn.style.color = "#ffffff";
    } else {
        yesBtn.style.background = "var(--green)";
        yesBtn.style.borderColor = "rgba(255,255,255,.08)";
        yesBtn.style.color = "#0a0a0a";
    }
    modal.classList.remove("hide");
    return new Promise((resolve) => {
        confirmResolver = resolve;
    });
}
function initConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    if (!modal) return;
    const yesBtn = document.getElementById("confirm-modal-yes");
    const noBtn = document.getElementById("confirm-modal-no");
    const closeBtn = document.getElementById("confirm-modal-close");
    const closeWithResult = (res) => {
        modal.classList.add("hide");
        if (confirmResolver) {
            const resolve = confirmResolver;
            confirmResolver = null;
            resolve(res);
        }
    };
    yesBtn.onclick = () => closeWithResult(true);
    noBtn.onclick = () => closeWithResult(false);
    closeBtn.onclick = () => closeWithResult(false);
}
initConfirmModal();
let activeScrubDay = null,
    activeScrubDom = null,
    activeScrubSecs = 0;

function injectScrubModal() {
    if (!$("scrubModal")) {
        var e = document.createElement("div");
        e.id = "scrubModal";
        e.className = "overlay hide";
        e.innerHTML = `
        <div class="card" style="width: 100%; max-width: 400px; padding: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--bg2); border: 1px solid var(--bd);">
          <div style="padding: 24px 32px 16px; border-bottom: 1px solid var(--bd); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
            <div style="font-size: 20px; font-weight: 800; color: var(--tx); display: flex; align-items: center; gap: 10px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--purple);"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>Reduce Time</span>
            </div>
            <button id="scrub-close" style="background:none; border:none; color:var(--tx3); cursor:pointer; padding:4px; display:inline-flex; align-items:center; justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div style="padding: 24px 32px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; flex: 1;">
            <div style="font-size: 13px; color: var(--tx2); line-height: 1.5;">How many minutes do you want to remove for <span id="scrub-dom" style="color: var(--tx); font-weight: 700;"></span>?</div>
            <input type="number" id="scrub-mins" class="inp" style="width: 100%; font-size: 24px; text-align: center; font-weight: 800;" placeholder="Minutes">
          </div>
          <div style="padding: 16px 32px 24px; border-top: 1px solid var(--bd); display: flex; gap: 12px; justify-content: flex-end; flex-shrink: 0;">
            <button class="bs" id="scrub-cancel" style="padding: 10px 20px;">Cancel</button>
            <button class="bp" id="scrub-save" style="padding: 10px 20px; background: var(--red); color: #fff; border-color: var(--red); font-size: 13px; font-weight: 700;">Remove</button>
          </div>
        </div>
        `;
        document.body.appendChild(e);
        $("scrub-cancel").onclick = () => $("scrubModal").classList.add("hide");
        $("scrub-close").onclick = () => $("scrubModal").classList.add("hide");
        $("scrub-save").onclick = async () => {
            let e = parseInt($("scrub-mins").value) || 0;
            if (e <= 0) return;
            let t = 60 * e;
            t > activeScrubSecs && (t = activeScrubSecs);
            // FF v4.4: Dexie-aware scrub. Writes to IndexedDB via SW message instead of legacy chrome.storage.local.daily.
            const res = await msg("STATS_SCRUB_DAY", { day: activeScrubDay, domain: activeScrubDom, secs: t });
            if (res && res.ok) { toast("Time adjusted", "ok"); loadAnalytics(); }
            else { toast("Adjust failed", "er"); }
            $("scrubModal").classList.add("hide");
        };
    }
}

function openScrubModal(e, t, a) {
    $("scrubModal") || injectScrubModal(), activeScrubDay = e, activeScrubDom = t, activeScrubSecs = a, $("scrub-dom").textContent = t, $("scrub-mins").value = "", $("scrub-mins").max = Math.ceil(a / 60), $("scrubModal").classList.remove("hide"), setTimeout(() => $("scrub-mins").focus(), 50)
}
async function renderGranularBlocksUI() {
    let e = document.getElementById("tab-sitemanager");
    if (!e) return;
    let t = document.getElementById("granular-ui-wrapper");
    t || (t = document.createElement("div"), t.id = "granular-ui-wrapper", t.innerHTML = '\n           <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--blue);margin:24px 0 12px;display:flex;align-items:center;gap:8px">\n               <span style="width:8px;height:8px;border-radius:50%;background:var(--blue)"></span>Advanced Site Tweaks\n           </div>\n           <div id="granular-blocks-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:32px;"></div>\n        ', e.insertBefore(t, e.firstChild));
    let a = document.getElementById("granular-blocks-grid");

    a.innerHTML = "";
    var n = (await gLocal(["granularRules"])).granularRules || {};
    Object.keys(GRANULAR_SITES_DASHBOARD).forEach(e => {
        var t = document.createElement("div");
        t.className = "card";
        var i = `<div style="padding:16px; border-bottom:1px solid var(--bd); font-weight:800; display:flex; align-items:center; gap:8px;">${getFav(e)} ${e}</div>`,
            s = '<div style="padding:16px; display:flex; flex-direction:column; gap:12px;">';
        GRANULAR_SITES_DASHBOARD[e].forEach(t => {
            var a = n[e] && n[e][t.id] ? "checked" : "";
            s += `\n              <div style="display:flex; justify-content:space-between; align-items:center;">\n                 <span style="font-size:13px; font-weight:600; color:var(--tx2)">${t.label}</span>\n                 <label class="tog"><input type="checkbox" class="g-db-cb" data-d="${e}" data-r="${t.id}" ${a}><span class="ttrack"></span></label>\n              </div>`
        }), s += "</div>", setSafeHTML(t, i + s), a.appendChild(t)
    }), document.querySelectorAll(".g-db-cb").forEach(e => {
        e.addEventListener("change", async e => {
            // FF v4.8 — PIN only when DISABLING (un-hiding) a tweak.
            const turningOff = !e.target.checked;
            const okPin = turningOff ? await promptPinIfEnabled("lockTweaks") : true;
            if (okPin) {
                var t = e.target.getAttribute("data-d"),
                    a = e.target.getAttribute("data-r"),
                    n = e.target.checked,
                    i = (await gLocal(["granularRules"])).granularRules || {};
                i[t] || (i[t] = {}), i[t][a] = n, await sLocal({
                    granularRules: i
                })
            } else e.target.checked = !e.target.checked
        })
    })
}
async function saveRulesAndSync(newRules) {
    rules = newRules;
    await sLocal({ blockRules: newRules });

    // Sync to cooldownDomains and cooldownSettings for the backend content script
    const cds = [];
    const css = {};
    newRules.forEach(r => {
        if (r.cooldownEnabled) {
            cds.push(r.domain);
            css[r.domain] = {
                timer: parseInt(r.cooldownTimer, 10) || 10,
                frequency: r.cooldownFrequency || "always"
            };
        }
    });

    await msg("SET_COOLDOWNS", { cooldowns: cds });
    await msg("SET_COOLDOWN_SETTINGS", { settings: css });
}

async function loadRules() {
    var e = await gLocal(["blockRules", "allowList", "neverTrackDomains"]);
    const cdResp = await msg("GET_COOLDOWNS");
    const legacyCooldowns = cdResp?.cooldowns || [];
    const legacySettings = cdResp?.settings || {};

    let blRules = e.blockRules || [];
    let migrated = false;

    blRules = blRules.map(r => {
        if (void 0 !== r.mode) {
            r.focusOnly = "focus_only" === r.mode;
            r.timeLimitEnabled = "time_limit" === r.mode;
            r.scheduleEnabled = "schedule" === r.mode || Array.isArray(r.schedules) && r.schedules.length > 0;
            delete r.mode;
        }
        return r;
    });

    // Migrating any separate old cool-downs to unified block rules
    legacyCooldowns.forEach(domain => {
        if (!blRules.some(r => r.domain === domain)) {
            const cfg = legacySettings[domain] || { timer: 10, frequency: "always" };
            blRules.push({
                id: uid(),
                domain: domain,
                category: "distraction",
                instantBlock: false,
                focusOnly: false,
                timeLimitEnabled: false,
                dailyLimitSecs: 0,
                scheduleEnabled: false,
                schedules: [],
                activeDays: null,
                cooldownEnabled: true,
                cooldownTimer: cfg.timer || 10,
                cooldownFrequency: cfg.frequency || "always"
            });
            migrated = true;
        }
    });

    if (migrated) {
        await sLocal({ blockRules: blRules });
    }

    rules = blRules;
    allowList = e.allowList || [];
    neverTrackDomains = e.neverTrackDomains || [];
    renderCombined();
}

function ruleMode(e) {
    var t = [];
    if (e.instantBlock) t.push("Always");
    if (e.focusOnly) t.push("Focus");
    if (e.timeLimitEnabled) t.push("Limit");
    if (e.scheduleEnabled) t.push("Schedule");
    if (e.cooldownEnabled) t.push("Cool-down");
    return t.length ? t.join(", ") : "Always";
}

function ruleSchedLabel(e) {
    return e.scheduleEnabled && Array.isArray(e.schedules) && e.schedules.length ? e.schedules.map(e => e.start + "–" + e.end).join(", ") : "—"
}

async function renderCombined() {
    var e = $("combined-list");
    e.className = isBulkMode ? "bulk-mode" : "", e.querySelectorAll(".brow").forEach(e => e.remove());

    const activeRules = window.activeRuleTab === "block" ? rules : (window.activeRuleTab === "allow" ? allowList : neverTrackDomains);
    const hasItems = activeRules.length > 0;

    const empty = $("combined-empty");
    if (empty) {
        if (hasItems) {
            empty.style.display = "none";
        } else {
            empty.style.display = "flex";
            if (window.activeRuleTab === "block") {
                empty.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px 24px;width:100%;"><svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.2;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><p style="font-size:16px;font-weight:800;color:var(--tx2);margin:0;">No rules yet</p><p style="font-size:13px;color:var(--tx3);margin:0;text-align:center;">Block distracting sites to get started.</p></div>';
            } else if (window.activeRuleTab === "allow") {
                empty.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px 24px;width:100%;"><svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.2;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><p style="font-size:16px;font-weight:800;color:var(--tx2);margin:0;">No exceptions yet</p><p style="font-size:13px;color:var(--tx3);margin:0;text-align:center;">Allow sites that bypass all blocking rules.</p></div>';
            } else {
                empty.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px 24px;width:100%;"><svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.2;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg><p style="font-size:16px;font-weight:800;color:var(--tx2);margin:0;">No domains ignored</p><p style="font-size:13px;color:var(--tx3);margin:0;text-align:center;">Domains on this list will never be tracked for analytics.</p></div>';
            }
        }
    }

    if (window.activeRuleTab === "block") {
        rules.forEach(function (t) {
            var a = document.createElement("div");
            const _sd = sanitizeDomain(t.domain);

            let limitText = "—";
            if (t.timeLimitEnabled && t.dailyLimitSecs >= 0) {
                limitText = Math.round(t.dailyLimitSecs / 60) + " min/day";
            }
            if (t.cooldownEnabled) {
                limitText = (limitText !== "—" ? limitText + " / " : "") + `⏳ ${t.cooldownTimer || 10}s wait`;
            }

            let schedText = ruleSchedLabel(t);
            if (t.cooldownEnabled) {
                const freqLabel = t.cooldownFrequency === "everyVisit" || t.cooldownFrequency === "always" ? "Every visit" : (t.cooldownFrequency === "oncePerDay" || t.cooldownFrequency === "daily" ? "Once a day" : "Every 10 min");
                schedText = (schedText !== "—" ? schedText + " / " : "") + freqLabel;
            }

            a.className = "brow brow-rules", setSafeHTML(a, `\n      <input type="checkbox" class="bulk-cb" data-id="${t.id}">\n      <span class="dom" style="display:flex;align-items:center;gap:8px;">${getFav(t.domain)} ${_sd}</span>\n      <span><span class="cbadge" style="background:var(--red-bg);color:var(--red);border:1px solid var(--red-bd)">Blocked</span></span>\n      <span class="mtxt">${ruleMode(t)}</span>\n      <span class="ltxt">${limitText}</span>\n      <span class="stxt">${schedText}</span>\n      <span class="ract"><button class="bic edit-r" data-id="${t.id}" title="Edit Rule"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button><button class="bic del del-r" data-id="${t.id}" title="Delete Rule"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></span>`), document.getElementById("combined-list-rows").appendChild(a)
        });
    } else if (window.activeRuleTab === "allow") {
        allowList.forEach(function (t) {
            var a = document.createElement("div");
            const _sa = sanitizeDomain(t);
            a.className = "brow brow-rules allow-row", setSafeHTML(a, `\n      <input type="checkbox" class="bulk-cb" data-d="${_sa}">\n      <span class="dom" style="display:flex;align-items:center;gap:8px;">${getFav(t)} ${_sa}</span>\n      <span><span class="cbadge" style="background:var(--green-bg);color:var(--green);border:1px solid var(--green-bd)">Allowed</span></span>\n      <span class="mtxt" style="color:var(--tx3)">Always accessible</span><span class="ltxt">—</span><span class="stxt">—</span>\n      <span class="ract"><button class="bic del del-a" data-d="${_sa}" title="Delete Rule"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></span>`), document.getElementById("combined-list-rows").appendChild(a)
        });
    } else if (window.activeRuleTab === "never") {
        neverTrackDomains.forEach(function (t) {
            var a = document.createElement("div");
            const _sn = sanitizeDomain(t);
            a.className = "brow brow-rules never-row", setSafeHTML(a, `\n      <input type="checkbox" class="bulk-cb" data-n="${_sn}">\n      <span class="dom" style="display:flex;align-items:center;gap:8px;">${getFav(t)} ${_sn}</span>\n      <span><span class="cbadge" style="background:rgba(168,85,247,0.15);color:#A855F7;border:1px solid rgba(168,85,247,0.3)">Never Track</span></span>\n      <span class="mtxt" style="color:var(--tx3)">Privacy: Never tracked</span><span class="ltxt">—</span><span class="stxt">—</span>\n      <span class="ract"><button class="bic del del-n" data-n="${_sn}" title="Delete Rule"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></span>`), document.getElementById("combined-list-rows").appendChild(a)
        });
    }

    e.querySelectorAll(".edit-r").forEach(e => e.addEventListener("click", async () => {
        await promptPinIfEnabled("lockRules") && openModal(e.getAttribute("data-id"))
    }));
    e.querySelectorAll(".del-r").forEach(e => e.addEventListener("click", () => delRule(e.getAttribute("data-id"))));
    e.querySelectorAll(".del-a").forEach(e => e.addEventListener("click", () => delAllow(e.getAttribute("data-d"))));
    e.querySelectorAll(".del-n").forEach(e => e.addEventListener("click", () => delNever(e.getAttribute("data-n"))));
    e.querySelectorAll(".bulk-cb").forEach(e => {
        e.addEventListener("change", () => {
            let t = e.getAttribute("data-id") || e.getAttribute("data-d") || e.getAttribute("data-n");
            e.checked ? bulkSelected.add(t) : bulkSelected.delete(t)
        })
    });
}

async function delNever(e) {
    if (!await promptPinIfEnabled("lockRules")) return;
    let t = await gLocal(["neverTrackDomains"]);
    const _deletedNever = e;
    neverTrackDomains = (neverTrackDomains = t.neverTrackDomains || []).filter(t => t !== e);
    await sLocal({ neverTrackDomains: neverTrackDomains });
    renderCombined();
    let _undoneNever = false;
    const _undoBtnN = document.createElement("button");
    _undoBtnN.textContent = "Undo (10s)"; _undoBtnN.style.cssText = "margin-left:12px;background:var(--bg4);border:1px solid var(--bd2);color:var(--tx);border-radius:8px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;";
    _undoBtnN.onclick = async () => {
        if (_undoneNever) return; _undoneNever = true;
        const _r2 = await gLocal(["neverTrackDomains"]); const _arr = _r2.neverTrackDomains || [];
        if (!_arr.includes(_deletedNever)) _arr.push(_deletedNever);
        neverTrackDomains = _arr; await sLocal({ neverTrackDomains: neverTrackDomains });
        renderCombined(); toast("Undo: never-track restored", "ok");
    };
    const _stackIdxN = _toastStackCount++;
    const _bottomPxN = 80 + _stackIdxN * 62;
    const _tdN = document.createElement("div");
    _tdN.style.cssText = `display:flex;align-items:center;gap:4px;position:fixed;bottom:${_bottomPxN}px;left:50%;transform:translateX(-50%);background:var(--bg3);border:1px solid var(--bd2);color:var(--tx);padding:10px 18px;border-radius:12px;font-size:14px;font-weight:700;z-index:9999;box-shadow:var(--shadow-md);`;
    _tdN.innerHTML = "<span>Never-track removed</span>"; _tdN.appendChild(_undoBtnN);
    document.body.appendChild(_tdN);
    let _secs = 10;
    const _cdown = setInterval(() => { _secs--; if (!_undoneNever && _undoBtnN.parentNode) _undoBtnN.textContent = `Undo (${_secs}s)`; if (_secs <= 0) clearInterval(_cdown); }, 1000);
    setTimeout(() => { clearInterval(_cdown); _tdN.remove(); _toastStackCount = Math.max(0, _toastStackCount - 1); }, 10000);
}

// addBlockedSite removed (dead code)
async function delRule(e) {
    if (!await promptPinIfEnabled("lockRules")) return;
    const _deleted = rules.find(r => r.id === e);
    rules = rules.filter(t => t.id !== e);
    await saveRulesAndSync(rules);
    await msg("TRIGGER_DNR_UPDATE"); renderCombined();
    // FF v6.18: Undo toast — 10-second window with live countdown (was 5s)
    if (_deleted) {
        let _undone = false;
        const _undoBtn = document.createElement("button");
        _undoBtn.textContent = "Undo (10s)"; _undoBtn.style.cssText = "margin-left:12px;background:var(--bg4);border:1px solid var(--bd2);color:var(--tx);border-radius:8px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;";
        _undoBtn.onclick = async () => {
            if (_undone) return; _undone = true;
            rules.push(_deleted);
            await saveRulesAndSync(rules);
            await msg("TRIGGER_DNR_UPDATE"); renderCombined(); toast("Undo: rule restored", "ok");
        };
        const _stackIdx = _toastStackCount++;
        const _bottomPx = 80 + _stackIdx * 62;
        const _td = document.createElement("div");
        _td.style.cssText = `display:flex;align-items:center;gap:4px;position:fixed;bottom:${_bottomPx}px;left:50%;transform:translateX(-50%);background:var(--bg3);border:1px solid var(--bd2);color:var(--tx);padding:10px 18px;border-radius:12px;font-size:14px;font-weight:700;z-index:9999;box-shadow:var(--shadow-md);animation:fadeIn .2s;`;
        _td.innerHTML = "<span>Rule deleted</span>"; _td.appendChild(_undoBtn);
        document.body.appendChild(_td);
        let _secs = 10;
        const _cdown = setInterval(() => { _secs--; if (!_undone && _undoBtn.parentNode) _undoBtn.textContent = `Undo (${_secs}s)`; if (_secs <= 0) clearInterval(_cdown); }, 1000);
        setTimeout(() => { clearInterval(_cdown); _td.remove(); _toastStackCount = Math.max(0, _toastStackCount - 1); }, 10000);
    }
}
async function delAllow(e) {
    if (!await promptPinIfEnabled("lockRules")) return;
    let t = await gLocal(["allowList"]);
    const _deletedAllow = e;
    allowList = (allowList = t.allowList || []).filter(t => t !== e);
    await sLocal({ allowList: allowList });
    await msg("TRIGGER_DNR_UPDATE"); renderCombined();
    // FF v6.18: undo allow-rule — 10 seconds with live countdown
    let _undoneAllow = false;
    const _undoBtnA = document.createElement("button");
    _undoBtnA.textContent = "Undo (10s)"; _undoBtnA.style.cssText = "margin-left:12px;background:var(--bg4);border:1px solid var(--bd2);color:var(--tx);border-radius:8px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;";
    _undoBtnA.onclick = async () => {
        if (_undoneAllow) return; _undoneAllow = true;
        const _r2 = await gLocal(["allowList"]); const _arr = _r2.allowList || [];
        if (!_arr.includes(_deletedAllow)) _arr.push(_deletedAllow);
        allowList = _arr; await sLocal({ allowList: _arr });
        await msg("TRIGGER_DNR_UPDATE"); renderCombined(); toast("Undo: allow-rule restored", "ok");
    };
    const _stackIdxA = _toastStackCount++;
    const _bottomPxA = 80 + _stackIdxA * 62;
    const _tdA = document.createElement("div");
    _tdA.style.cssText = `display:flex;align-items:center;gap:4px;position:fixed;bottom:${_bottomPxA}px;left:50%;transform:translateX(-50%);background:var(--bg3);border:1px solid var(--bd2);color:var(--tx);padding:10px 18px;border-radius:12px;font-size:14px;font-weight:700;z-index:9999;box-shadow:var(--shadow-md);`;
    _tdA.innerHTML = "<span>Allow-rule removed</span>"; _tdA.appendChild(_undoBtnA);
    document.body.appendChild(_tdA);
    let _secsA = 10;
    const _cdownA = setInterval(() => { _secsA--; if (!_undoneAllow && _undoBtnA.parentNode) _undoBtnA.textContent = `Undo (${_secsA}s)`; if (_secsA <= 0) clearInterval(_cdownA); }, 1000);
    setTimeout(() => { clearInterval(_cdownA); if (!_undoneAllow) toast("Removed", "ok"); _tdA.remove(); _toastStackCount = Math.max(0, _toastStackCount - 1); }, 10000);
}

function renderScheduleSlots(e) {
    var t = $("schedule-slots");
    t.innerHTML = "", (e || []).forEach((e, a) => {
        var n = document.createElement("div");
        n.className = "sched-slot", n.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:12px;background:var(--bg3);padding:12px 16px;border-radius:12px;border:1px solid var(--bd)", setSafeHTML(n, `<span style="font-size:13px;color:var(--tx2);font-weight:700">From</span><input type="time" class="inp sched-start" value="${e.start || "09:00"}" style="flex:1"/>\n      <span style="font-size:13px;color:var(--tx2);font-weight:700">to</span><input type="time" class="inp sched-end" value="${e.end || "21:00"}" style="flex:1"/>\n      <button class="bic del rm-slot" data-idx="${a}">✕</button>`), t.appendChild(n)
    }), t.querySelectorAll(".rm-slot").forEach(e => e.addEventListener("click", () => {
        var t = getSlots();
        t.splice(parseInt(e.getAttribute("data-idx"), 10), 1), renderScheduleSlots(t)
    }))
}

function getSlots() {
    var e = [];
    return $("schedule-slots").querySelectorAll(".sched-slot").forEach(t => {
        var a = t.querySelector(".sched-start").value,
            n = t.querySelector(".sched-end").value;
        a && n && e.push({
            start: a,
            end: n
        })
    }), e
}

function openModal(e) {
    var t = rules.find(t => t.id === e);
    if (!t) return;
    $("m-id").value = e;
    $("cat-inp").value = t.domain;
    $("cat-redir").value = t.redirectUrl || "";
    let isInstant = !!t.instantBlock;
    let isTimeLimit = !!t.timeLimitEnabled;

    // Cool-down Settings
    $("m-cd-wait").value = t.cooldownTimer || 10;
    $("m-cd-freq").value = t.cooldownFrequency || "always";

    if (isInstant) {
        isTimeLimit = true;
        $("m-lim").value = 0;
    } else {
        $("m-lim").value = (t.dailyLimitSecs !== undefined && t.dailyLimitSecs !== null) ? Math.round(t.dailyLimitSecs / 60) : 30;
    }

    $("m-mode-focus").checked = !!t.focusOnly;
    $("m-mode-limit").checked = isTimeLimit;
    $("m-mode-schedule").checked = !!t.scheduleEnabled;
    $("m-mode-cooldown").checked = !!t.cooldownEnabled;
    $("m-mode-session").checked = !!t.sessionLimitEnabled;

    $("mf-tl").style.display = isTimeLimit ? "block" : "none";
    $("mf-sc").style.display = t.scheduleEnabled ? "block" : "none";
    $("mf-cd").style.display = t.cooldownEnabled ? "block" : "none";
    $("mf-session").style.display = t.sessionLimitEnabled ? "block" : "none";

    $("m-session-limit").value = t.sessionLimitSecs ? Math.round(t.sessionLimitSecs / 60) : 5;
    $("m-session-cooldown").value = t.sessionCooldownSecs ? Math.round(t.sessionCooldownSecs / 60) : 10;

    renderScheduleSlots(Array.isArray(t.schedules) && t.schedules.length ? t.schedules : t.scheduleEnabled && t.scheduleStart ? [{
        start: t.scheduleStart,
        end: t.scheduleEnd || "21:00"
    }] : [{
        start: "09:00",
        end: "21:00"
    }]);
    const _allDays = [0, 1, 2, 3, 4, 5, 6];
    const _activeDays = Array.isArray(t.activeDays) ? t.activeDays : _allDays;
    document.querySelectorAll('.m-day-cb').forEach(cb => {
        const fresh = cb.cloneNode(true);
        cb.parentNode.replaceChild(fresh, cb);
    });
    document.querySelectorAll('.m-day-cb').forEach(cb => {
        cb.checked = _activeDays.includes(parseInt(cb.value));
        const _lbl = cb.closest('label') || cb.parentElement;
        if (_lbl) {
            _lbl.style.background = cb.checked ? 'var(--green-bg)' : '';
            _lbl.style.borderColor = cb.checked ? 'var(--green-bd)' : '';
            _lbl.style.color = cb.checked ? 'var(--green)' : '';
        }
        cb.addEventListener('change', function () {
            const _l = this.closest('label') || this.parentElement;
            if (_l) {
                _l.style.background = this.checked ? 'var(--green-bg)' : '';
                _l.style.borderColor = this.checked ? 'var(--green-bd)' : '';
                _l.style.color = this.checked ? 'var(--green)' : '';
            }
        });
    });
    if ($("btn-add-block")) $("btn-add-block").textContent = "Save Changes";
    if ($("add-rule-modal-title")) $("add-rule-modal-title").textContent = "Edit Block Rule";
    if (typeof switchRuleModalTab === "function") switchRuleModalTab("block");
    if ($("add-rule-modal")) $("add-rule-modal").classList.remove("hide");
}


async function loadCategories() {
    var e = await gLocal(["siteCategories", "hiddenDefaultSites"]);
    siteCategories = e.siteCategories || {};
    hiddenDefaultSites = e.hiddenDefaultSites || [];
}

function isDefaultSiteHidden(d) {
    if (typeof hiddenDefaultSites === "undefined" || !hiddenDefaultSites) return false;
    if (hiddenDefaultSites.includes(d)) return true;
    const parts = d.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
        if (hiddenDefaultSites.includes(parts.slice(i).join("."))) return true;
    }
    return false;
}

function recalculateRangeStats(data) {
    if (!data) return;
    Object.values(data).forEach(entry => {
        if (entry && entry.sites) {
            entry.productivity = 0;
            entry.learning = 0;
            entry.communication = 0;
            entry.distraction = 0;
            entry.uncategorized = 0;
            Object.entries(entry.sites).forEach(([dom, secs]) => {
                const catInfo = getEffectiveCat(dom);
                const cat = catInfo ? catInfo.cat : "uncategorized";
                entry[cat] = (entry[cat] || 0) + secs;
            });
        }
    });
}
async function loadVisitedSites() {
    var e = await msg("GET_VISITED_SITES");
    visitedSites = e?.visitedSites || []
}

function renderCatSquares() {
    var e = $("cat-squares");
    if (!e) return;
    e.innerHTML = "";
    const t = Array.from(new Set([...visitedSites, ...Object.keys(siteCategories)]))
        .filter(d => !isDefaultSiteHidden(d));
    // Feature: include "uncategorized" in Filter by Category and Smart Presets
    ["all"].concat(allCats()).forEach(a => {
        var n = "all" === a,
            i = n ? {
                label: "All Sites",
                emoji: "🌍",
                color: "var(--tx)"
            } : CAT_META[a] || {
                label: a,
                emoji: "🏷️",
                color: "#555"
            },
            s = 0;
        n ? s = t.length : t.forEach(e => {
            getEffectiveCat(e).cat === a && s++
        });
        var o = document.createElement("div");
        o.className = "cat-sq" + (selectedCat === a ? " selected" : ""), o.style.borderColor = selectedCat === a ? i.color : void 0, setSafeHTML(o, `<div class="cat-sq-icon">${i.emoji}</div><div class="cat-sq-name" style="color:${selectedCat === a ? i.color : "var(--tx)"}">${i.label}</div><div class="cat-sq-count">${s} sites</div>`), o.addEventListener("click", () => {
            selectedCat = a, renderCategories()
        }), e.appendChild(o)
    })
}
async function tagSite(e, t) {
    siteCategories[e] = t;
    if (hiddenDefaultSites.includes(e)) {
        hiddenDefaultSites = hiddenDefaultSites.filter(d => d !== e);
    }
    await sLocal({ hiddenDefaultSites: hiddenDefaultSites });
    await msg("CATEGORIZE_SITE", {
        domain: e,
        category: t
    });
    renderCategories();
}

function renderCategories() {
    renderCatSquares();
    var e = $("cat-groups");
    if (!e) return;
    e.innerHTML = "";
    const searchInput = $("cat-sites-search");
    const q = searchInput ? searchInput.value.toLowerCase().trim() : "";
    var t = {};
    const filtered = Array.from(new Set([...visitedSites, ...Object.keys(siteCategories)]))
        .filter(d => !isDefaultSiteHidden(d))
        .filter(d => !q || d.toLowerCase().includes(q));
    filtered.forEach(e => {
        var a = getEffectiveCat(e);
        t[a.cat] || (t[a.cat] = []), t[a.cat].push({
            domain: e,
            auto: a.auto
        })
    }), Object.keys(t).length ? allCats().forEach(a => {
        if (t[a] && t[a].length && ("all" === selectedCat || selectedCat === a)) {
            var n = document.createElement("div");
            n.className = "card", setSafeHTML(n, `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px 16px;background:var(--bg3);border-radius:12px;border:1px solid var(--bd2)"><span style="width:12px;height:12px;border-radius:50%;background:${catColor(a)}"></span><span style="font-size:16px;font-weight:800;flex:1;color:var(--tx)">${catEmoji(a)} ${catLabel(a, !1)}</span><span style="font-size:12px;color:var(--tx3);background:var(--bg4);padding:6px 12px;border-radius:999px;font-weight:700">${t[a].length} sites</span></div>`);
            var i = document.createElement("div");
            t[a].forEach(e => {
                var t = document.createElement("div");
                t.style.cssText = "display:flex;align-items:center;gap:16px;padding:12px 16px;background:var(--bg2);border:1px solid var(--bd);border-radius:12px;margin-bottom:8px";
                const cleanDom = sanitizeDomain(e.domain);
                var n = `<select class="sel" data-domain="${cleanDom}" style="padding:8px 12px;font-size:13px;width:auto">`;
                allCats().forEach(e => n += `<option value="${e}"${e === a ? " selected" : ""}>${catEmoji(e)} ${catLabel(e, !1)}</option>`), n += "</select>", setSafeHTML(t, `<span style="font-family:monospace;font-size:15px;font-weight:700;flex:1;word-break:break-all;display:flex;align-items:center;gap:8px;">${getFav(e.domain)} ${cleanDom} ${e.auto ? '<span style="font-size:11px;color:var(--tx3);" title="Auto-categorized">✨</span>' : ""}</span>${n}<button class="bic cat-rule-btn" data-domain="${cleanDom}" title="Add or Edit Rule"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></button><button class="bic del rm-cat" data-domain="${cleanDom}">✕</button>`), i.appendChild(t)
            }), i.querySelectorAll(".sel").forEach(e => e.addEventListener("change", async t => {
                await tagSite(e.getAttribute("data-domain"), e.value)
            })), i.querySelectorAll(".rm-cat").forEach(el => el.addEventListener("click", async () => {
                const dom = el.getAttribute("data-domain");
                delete siteCategories[dom];
                const isDefault = (d) => {
                    if (AUTO_CATEGORIES[d]) return true;
                    const parts = d.split(".");
                    for (let i = 1; i < parts.length - 1; i++) {
                        if (AUTO_CATEGORIES[parts.slice(i).join(".")]) return true;
                    }
                    return false;
                };
                if (isDefault(dom)) {
                    if (!hiddenDefaultSites.includes(dom)) {
                        hiddenDefaultSites.push(dom);
                    }
                }
                await sLocal({
                    siteCategories: siteCategories,
                    hiddenDefaultSites: hiddenDefaultSites
                });
                renderCategories();
            })), i.querySelectorAll(".cat-rule-btn").forEach(e => e.addEventListener("click", () => {
                if (window.openAddOrEditModal) {
                    window.openAddOrEditModal(e.getAttribute("data-domain"));
                }
            })), n.appendChild(i), e.appendChild(n)
        }
    }) : e.innerHTML = '<div class="card"><div class="empty">\n      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>\n      <p>No sites visited yet.</p>\n    </div></div>'
}

function renderFocus(e, t = 25) {
    if (!e || !e.active) {
        $("frf") && $("frf").setAttribute("stroke-dashoffset", FCIRC), $("ftb") && ($("ftb").textContent = t + ":00"), $("fcyc") && ($("fcyc").textContent = "0 cycles"), $("fpb") && ($("fpb").textContent = "Work", $("fpb").style.color = "var(--green)"), $("frf") && ($("frf").style.stroke = "var(--green)"), $("logo-img") && ($("logo-img").className = ""), $("btn-fs") && ($("btn-fs").style.display = ""), $("btn-fst") && ($("btn-fst").style.display = "none"), $("btn-fp") && ($("btn-fp").style.display = "none"), $("btn-skip") && ($("btn-skip").style.display = "none"), $("frf") && ($("frf").style.opacity = "1");
        let e = document.getElementById("dynamic-favicon");
        return void (e && (e.href = "../icons/icon128.png"))
    }
    $("logo-img") && ($("logo-img").className = "on");
    var a = "work" === e.phase,
        n = e.fullDuration || (a ? 1500 : "long_break" === e.phase ? 900 : 300),
        i = Math.max(0, 1 - Math.min(1, (e.remaining || 0) / n));
    $("frf") && ($("frf").style.stroke = a ? "var(--green)" : "var(--amber)", $("frf").setAttribute("stroke-dashoffset", (FCIRC * i).toFixed(1))), $("fpb") && ($("fpb").style.color = a ? "var(--green)" : "var(--amber)", $("fpb").textContent = a ? "Work" : "long_break" === e.phase ? "Long Break" : "Short Break"), $("ftb") && ($("ftb").textContent = fmtT(e.remaining || 0)), $("fcyc") && ($("fcyc").textContent = e.isSchedule ? "Scheduled Focus" : ((e.cyclesCompleted || 0) + " " + ((e.cyclesCompleted === 1) ? "cycle" : "cycles"))), $("btn-fs") && ($("btn-fs").style.display = "none"), $("btn-fst") && ($("btn-fst").style.display = ""), $("btn-fp") && ($("btn-fp").style.display = "", e.paused ? (e.remaining === n ? $("btn-fp").textContent = "work" === e.phase ? "▶ Start Work" : "▶ Start Break" : $("btn-fp").textContent = "▶ Resume", $("frf") && ($("frf").style.opacity = "0.5")) : ($("btn-fp").textContent = "⏸ Pause", $("frf") && ($("frf").style.opacity = "1"))), $("btn-skip") && ($("btn-skip").style.display = a ? "none" : "");
    // Bug #5 fix: reuse the single off-screen canvas instead of allocating each tick
    const s = _favCanvas;
    s.width = 32; s.height = 32; // resetting width clears the canvas
    const o = s.getContext("2d"),
        r = document.documentElement.classList.contains("light");
    o.fillStyle = r ? "#f1f5f9" : "#121212", o.beginPath(), o.arc(16, 16, 16, 0, 2 * Math.PI), o.fill(), o.strokeStyle = "#2E2E2E", o.lineWidth = 4, o.beginPath(), o.arc(16, 16, 12, 0, 2 * Math.PI), o.stroke(), o.strokeStyle = a ? "#05D581" : "#F6B846", o.lineCap = "round", o.beginPath(), o.arc(16, 16, 12, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - i)), o.stroke();
    let l = document.getElementById("dynamic-favicon");
    l && (l.href = s.toDataURL())
}
async function getActiveWorkMins() {
    try {
        const localRes = await gSync(["focusPresets"]);
        const syncRes = await gSync(["settings"]);
        const presetsList = localRes.focusPresets;
        const settings = syncRes.settings || {};
        const activeId = settings.activePresetId || "pomodoro";
        if (Array.isArray(presetsList) && presetsList.length) {
            const ap = presetsList.find(p => p.id === activeId) || presetsList[0];
            if (ap && ap.work) return ap.work;
        }
        return settings.focusWork || 25;
    } catch (_) {
        return 25;
    }
}

async function loadFocusUI() {
    var e = await msg("FOCUS_GET_STATE"),
        a = await getActiveWorkMins();
    renderFocus(e?.focusState, a)
}
// Bug #5 fix: accept pre-loaded settings to avoid double gSync when called alongside loadExtendedSettings
async function loadSettings(preloadedSettings) {
    var e = preloadedSettings || (await gSync(["settings"])).settings || {};
    if ($("focus-sched-start")) {
        const fscheds = e.focusSchedules || [];
        if (fscheds.length > 0) {
            const s = fscheds[0];
            $("focus-sched-start").value = s.startTime || "09:00";
            $("focus-sched-end").value = s.endTime || "17:00";
            const d = s.days || [1,2,3,4,5];
            document.querySelectorAll(".focus-sched-day-cb").forEach(cb => {
                cb.checked = d.includes(parseInt(cb.value));
            });
        }
    }
    if ($("thresh-focus")) $("thresh-focus").value = e.threshFocus || 75;
    if ($("thresh-balanced")) $("thresh-balanced").value = e.threshBalanced || 40;
    if ($("thresh-distract")) $("thresh-distract").value = e.threshDistract || 60;
    if ($("tog-badge")) $("tog-badge").checked = !1 !== e.showBadge;
    if ($("idle-timeout-sel")) $("idle-timeout-sel").value = e.idleTimeout || 30;
    if ($("welcome-back-thresh-sel")) $("welcome-back-thresh-sel").value = e.welcomeBackThresh || 10;
}
async function loadAnalytics() {
    await loadCategories();
    const tabEl = $("atab-" + currentATab);
    if (tabEl) {
        if (tabEl.style.opacity !== "0") {
            tabEl.style.opacity = "0.5";
        }
    }

    try {
        if ("overview" === currentATab) await renderOverview();
        else if ("daily" === currentATab) await renderDailyBreakdown();
        else if ("topsites" === currentATab) await renderTopSites();
        else if ("trend" === currentATab) await renderTrend();
        else if ("insights" === currentATab) await renderInsights();
    } finally {
        if (tabEl) {
            tabEl.style.transition = "opacity 0.25s ease";
            tabEl.style.opacity = "1";
        }
    }
}

// FF v4.2: Insights — 365-day GitHub-style consistency heatmap.
async function renderInsights() {
    const canvas = $("heatmap-canvas");
    if (!canvas) return;
    const loader = $("heatmap-loading");
    if (loader) loader.style.display = "block";
    canvas.style.display = "none";
    // Build 365 day keys (oldest → newest)
    const keys = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 364; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    const [rangeRes, settingsRes] = await Promise.all([
        msg("STATS_GET_RANGE", { days: keys }),
        gSync(["settings"])
    ]);
    const data = rangeRes?.data || {};
    recalculateRangeStats(data);
    const settings = settingsRes?.settings || {};
    const goalCats = settings.goalCats || ["productivity", "learning"];
    const goalSecs = 60 * (settings.streakMinMinutes || 30);
    const distractThresh = ((settings.threshDistract || 60) / 100);

    // FF v6.18: Start heatmap from first day of data
    let firstDataIdx = keys.findIndex(k => {
        const d = data[k] || {};
        return Object.keys(d).length > 0 && Object.values(d).some(v => v > 0);
    });
    if (firstDataIdx === -1) firstDataIdx = keys.length - 1; // At least today
    keys.splice(0, firstDataIdx);

    // Compute per-day status: 'empty' | 'ok' | 'good' | 'great' | 'best' | 'wasted'
    const cellStatus = {}, dailyTotals = {};
    let active = 0, wasted = 0;
    let maxFocus = 1;
    keys.forEach(k => {
        const d = data[k] || {};
        const focus = goalCats.reduce((s, c) => s + (d[c] || 0), 0);
        const prod = d.productivity || 0;
        const learn = d.learning || 0;
        const distract = d.distraction || 0;
        // Fix Issue 7: Calculate total by summing raw categories exactly once to prevent double-counting
        const total = prod + learn + distract + (d.communication || 0) + (d.uncategorized || 0);
        dailyTotals[k] = { focus, prod, learn, distract, total };
        if (focus > maxFocus) maxFocus = focus;
    });
    keys.forEach(k => {
        const { focus, prod, learn, distract, total } = dailyTotals[k];
        if (total < 60) { cellStatus[k] = "empty"; return; }
        // Wasted: high distraction ratio AND below focus goal
        if (focus < goalSecs && total > 0 && distract / total >= distractThresh) {
            cellStatus[k] = "wasted"; wasted++; return;
        }
        if (focus >= goalSecs) {
            active++;
            const r = focus / maxFocus;
            if (r >= 0.85) cellStatus[k] = "best";
            else if (r >= 0.6) cellStatus[k] = "great";
            else if (r >= 0.3) cellStatus[k] = "good";
            else cellStatus[k] = "ok";
        } else {
            cellStatus[k] = "empty";
        }
    });

    // Layout: 53 columns × 7 rows, 28px cells with 6px gap, top-left = oldest week
    const cell = 28, gap = 6, rowH = cell + gap;
    // Safe split-based date construction to prevent RangeErrors/Invalid Dates on some systems
    const parts0 = keys[0].split("-");
    const firstDate = new Date(parseInt(parts0[0], 10), parseInt(parts0[1], 10) - 1, parseInt(parts0[2], 10));
    // Fix Issue 6: Pad based on chosen weekStartsOn setting (Monday vs Sunday start)
    const weekStartsOn = settings.weekStartsOn || "mon";
    const padStart = weekStartsOn === "sun" ? firstDate.getDay() : (firstDate.getDay() + 6) % 7;
    const totalCells = padStart + keys.length;
    const cols = Math.ceil(totalCells / 7);
    const W = cols * rowH + 60; // +60 for month labels area
    const H = 7 * rowH + 44;    // +44 for weekday + month labels
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const isLight = document.documentElement.classList.contains("light");
    const COLORS = isLight ? {
        empty: "rgba(0,0,0,0.05)",
        ok: "rgba(2,133,78,0.15)",
        good: "rgba(2,133,78,0.35)",
        great: "rgba(2,133,78,0.65)",
        best: "#02854e",
        wasted: "#d94152"
    } : {
        empty: "rgba(255,255,255,0.05)",
        ok: "rgba(5,213,129,0.30)",
        good: "rgba(5,213,129,0.55)",
        great: "rgba(5,213,129,0.80)",
        best: "#05D581",
        wasted: "#F46B7A"
    };
    const textStyle = isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)";
    const monthTextStyle = isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";


    // Month labels along top
    ctx.font = "10px Inter, system-ui, sans-serif";
    ctx.fillStyle = textStyle;
    let lastMonth = -1;
    let lastMonthX = -Infinity;
    const MIN_LABEL_GAP = 30; // px — FF v4.9: skip month label if too close to previous
    const cellRects = []; // for tooltip hit-testing
    for (let i = 0; i < totalCells; i++) {
        const col = Math.floor(i / 7), row = i % 7;
        const x = 56 + col * rowH;
        const y = 28 + row * rowH;
        if (i < padStart) continue;
        const k = keys[i - padStart];
        const status = cellStatus[k] || "empty";
        ctx.fillStyle = COLORS[status];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, cell, cell, 6); else ctx.rect(x, y, cell, cell);
        ctx.fill();
        cellRects.push({ x, y, k, status, focus: dailyTotals[k].focus, prod: dailyTotals[k].prod, learn: dailyTotals[k].learn, distract: dailyTotals[k].distract });
        if (row === 0) {
            const m = new Date(k + "T00:00:00").getMonth();
            if (m !== lastMonth && (x - lastMonthX) >= MIN_LABEL_GAP) {
                ctx.fillStyle = monthTextStyle;
                ctx.fillText(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m], x, 20);
                lastMonth = m;
                lastMonthX = x;
            } else if (m !== lastMonth) {
                // Track the month change even if label was skipped, so the next month
                // gets a chance to render once it's far enough away.
                lastMonth = m;
            }
        }
    }
    // Weekday labels
    ctx.fillStyle = textStyle;
    const weekdayLabels = (settings.weekStartsOn || "mon") === "sun"
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    weekdayLabels.forEach((lbl, idx) => {
        ctx.fillText(lbl, 0, 28 + idx * rowH + 20);
    });

    // KPI cards (FF v4.4: streak cards replaced by Good Days + Wasted)
    $("ins-good-days") && ($("ins-good-days").textContent = active);
    $("ins-wasted-days") && ($("ins-wasted-days").textContent = wasted);
    // Back-compat in case any orphan IDs still exist in the DOM:
    $("ins-active-days") && ($("ins-active-days").textContent = active);
    $("ins-broken-days") && ($("ins-broken-days").textContent = wasted);

    // Weekday vs weekend split + best DOW
    const dowFocus = [0, 0, 0, 0, 0, 0, 0], dowCount = [0, 0, 0, 0, 0, 0, 0];
    keys.forEach(k => {
        const partsK = k.split("-");
        const dow = new Date(parseInt(partsK[0], 10), parseInt(partsK[1], 10) - 1, parseInt(partsK[2], 10)).getDay();
        dowFocus[dow] += dailyTotals[k].focus;
        if (dailyTotals[k].total > 60) dowCount[dow]++;
    });
    const wkdSecs = dowFocus.slice(1, 6).reduce((a, b) => a + b, 0);
    const wknSecs = dowFocus[0] + dowFocus[6];
    const wkdAvg = wkdSecs / Math.max(1, dowCount.slice(1, 6).reduce((a, b) => a + b, 0));
    const wknAvg = wknSecs / Math.max(1, dowCount[0] + dowCount[6]);
    $("ins-wkd-split") && setSafeHTML($("ins-wkd-split"),
        `Weekdays avg: <strong style="color:var(--green)">${fmt(wkdAvg)}</strong>/day<br>Weekends avg: <strong style="color:var(--green)">${fmt(wknAvg)}</strong>/day`);
    const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let bestDow = 0, bestAvg = 0;
    for (let i = 0; i < 7; i++) {
        const a = dowFocus[i] / Math.max(1, dowCount[i]);
        if (a > bestAvg) { bestAvg = a; bestDow = i; }
    }
    $("ins-best-dow") && setSafeHTML($("ins-best-dow"),
        bestAvg > 0 ? `<strong style="color:var(--green)">${dowNames[bestDow]}</strong> — avg ${fmt(bestAvg)} of focus` : "Not enough data yet");

    // Hide loading state and display canvas (FF v6.18)
    if (loader) loader.style.display = "none";
    canvas.style.display = "block";

    // Tooltip: use real invisible DOM cells over the canvas. This avoids fragile
    // canvas coordinate hit-testing and bypasses the browser's native title popup.
    const wrap = $("heatmap-wrap") || canvas.parentElement;
    let tip = $("heatmap-tooltip-live");
    if (!tip) {
        tip = document.createElement("div");
        tip.id = "heatmap-tooltip-live";
        tip.className = "chart-tooltip";
        document.body.appendChild(tip);
    }
    const oldTip = $("heatmap-tooltip");
    if (oldTip) oldTip.style.display = "none";
    canvas.onmousemove = null;
    canvas.onmouseleave = null;

    let hoverLayer = $("heatmap-hover-layer");
    if (!hoverLayer) {
        hoverLayer = document.createElement("div");
        hoverLayer.id = "heatmap-hover-layer";
    }
    if (wrap && hoverLayer.parentElement !== wrap) wrap.appendChild(hoverLayer);
    hoverLayer.innerHTML = "";
    hoverLayer.style.cssText = [
        "position:absolute",
        "left:0",
        "top:0",
        "width:" + W + "px",
        "height:" + H + "px",
        "z-index:5",
        "pointer-events:auto"
    ].join(";") + ";";
    canvas.style.position = "relative";
    canvas.style.zIndex = "1";

    const hideHeatmapTip = () => {
        tip.style.display = "none";
        tip.style.opacity = "0";
    };
    const showHeatmapTip = (ev, hit) => {
        let dateLabel = hit.k;
        try {
            const parts = hit.k.split("-");
            const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            dateLabel = dObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        } catch (e) {}
        setSafeHTML(tip, `<div style="font-weight:800;margin-bottom:8px;border-bottom:1px solid var(--bd2);padding-bottom:6px">${dateLabel}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:4px;color:#05D581"><span>Productivity:</span> <span class="num">${fmt(hit.prod)}</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:4px;color:#A855F7"><span>Learning:</span> <span class="num">${fmt(hit.learn)}</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center;color:#F46B7A"><span>Distraction:</span> <span class="num">${fmt(hit.distract)}</span></div>`);
        tip.style.display = "flex";
        tip.style.opacity = "1";
        const tipRect = tip.getBoundingClientRect();
        let tx = ev.clientX + 12;
        let ty = ev.clientY + 12;
        if (tx + tipRect.width > window.innerWidth - 8) tx = ev.clientX - tipRect.width - 12;
        if (ty + tipRect.height > window.innerHeight - 8) ty = ev.clientY - tipRect.height - 12;
        tip.style.left = Math.max(8, tx) + "px";
        tip.style.top = Math.max(8, ty) + "px";
    };

    cellRects.forEach(hit => {
        const cellTarget = document.createElement("div");
        cellTarget._heatmapHit = hit;
        cellTarget.style.cssText = [
            "position:absolute",
            "left:" + hit.x + "px",
            "top:" + hit.y + "px",
            "width:" + cell + "px",
            "height:" + cell + "px",
            "border-radius:6px",
            "background:rgba(255,255,255,0)",
            "cursor:crosshair"
        ].join(";") + ";";
        cellTarget.addEventListener("mouseenter", ev => showHeatmapTip(ev, hit));
        cellTarget.addEventListener("mousemove", ev => showHeatmapTip(ev, hit));
        cellTarget.addEventListener("mouseleave", hideHeatmapTip);
        hoverLayer.appendChild(cellTarget);
    });
    hoverLayer.addEventListener("mouseleave", hideHeatmapTip);
    const legend = $("heatmap-legend");
    if (legend && !legend.dataset.wired) {
        legend.dataset.wired = "1";
        legend.addEventListener("click", () => {
            const overlay = document.createElement("div");
            overlay.className = "overlay";
            overlay.style.zIndex = "9999";
            setSafeHTML(overlay, `
              <div class="card" style="width:100%;max-width:400px;padding:0;display:flex;flex-direction:column;overflow:hidden;background:var(--bg2);border:1px solid var(--bd);">
                <div style="padding:24px 32px 16px;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                  <div style="font-size:20px;font-weight:800;color:var(--tx);display:flex;align-items:center;gap:10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;flex-shrink:0;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83 2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    <span>Heatmap Thresholds</span>
                  </div>
                  <button id="hm-close" style="background:none;border:none;color:var(--tx3);cursor:pointer;padding:4px;display:inline-flex;align-items:center;justify-content:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
                <div style="padding:24px 32px;display:flex;flex-direction:column;gap:20px;overflow-y:auto;flex:1;">
                  <div>
                    <label class="slbl" style="display:block;margin-bottom:6px;">Minimum Focus Time (minutes)</label>
                    <input type="number" id="hm-min-focus" class="inp" value="${settings.streakMinMinutes || 30}" style="width:100%"/>
                    <div style="font-size:12px;color:var(--tx3);margin-top:4px;">Minimum time to count as an active day.</div>
                  </div>
                  <div>
                    <label class="slbl" style="display:block;margin-bottom:6px;">Wasted Day Distraction (%)</label>
                    <input type="number" id="hm-dist-thresh" class="inp" value="${settings.threshDistract || 60}" style="width:100%"/>
                    <div style="font-size:12px;color:var(--tx3);margin-top:4px;">If distraction is above this % and focus is low, the day is Wasted.</div>
                  </div>
                </div>
                <div style="padding:16px 32px 24px;border-top:1px solid var(--bd);display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;">
                  <button class="bs" id="hm-cancel">Cancel</button>
                  <button class="bp" id="hm-save" style="font-size:13px;font-weight:700;">Save Settings</button>
                </div>
              </div>
            `);
document.body.appendChild(overlay);
            document.getElementById("hm-cancel").onclick = () => overlay.remove();
            document.getElementById("hm-close").onclick = () => overlay.remove();
            document.getElementById("hm-save").onclick = async () => {
                const sv = (await gSync(["settings"])).settings || {};
                sv.streakMinMinutes = parseInt(document.getElementById("hm-min-focus").value) || 30;
                sv.threshDistract = parseInt(document.getElementById("hm-dist-thresh").value) || 60;
                await sSync({ settings: sv });
                if ($("thresh-distract")) $("thresh-distract").value = sv.threshDistract;
                if ($("streak-min-input")) $("streak-min-input").value = sv.streakMinMinutes;
                overlay.remove();
                renderInsights();
                if (typeof toast === "function") toast("Thresholds updated", "ok");
            };
        });
    }
}

function getDays(e) {
    // Bug #1 fix: use const/let throughout to prevent var-hoisting shadowing between branches.
    // FF v4.4: supports number-of-days OR { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }.
    if (e && typeof e === "object" && e.from && e.to) {
        const t = [], a = [];
        const start = new Date(e.from + "T00:00:00");
        const end = new Date(e.to + "T00:00:00");
        if (isNaN(start) || isNaN(end) || end < start) return { days: [], labels: [] };
        const maxDays = 365;
        let cursor = new Date(start);
        while (cursor <= end && t.length < maxDays) {
            const s = cursor.getFullYear(),
                o = String(cursor.getMonth() + 1).padStart(2, "0"),
                r = String(cursor.getDate()).padStart(2, "0");
            t.push(`${s}-${o}-${r}`);
            a.push(cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
            cursor.setDate(cursor.getDate() + 1);
        }
        return { days: t, labels: a };
    }
    const t = [], a = [];
    for (let n = (parseInt(e) || 7) - 1; n >= 0; n--) {
        const i = new Date;
        i.setDate(i.getDate() - n);
        const s = i.getFullYear(),
            o = String(i.getMonth() + 1).padStart(2, "0"),
            r = String(i.getDate()).padStart(2, "0");
        t.push(`${s}-${o}-${r}`);
        a.push(i.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    }
    return { days: t, labels: a };
}
document.querySelectorAll(".ni").forEach(e => {
    e.addEventListener("click", async () => {
        var t = e.getAttribute("data-tab");
        document.querySelectorAll(".ni").forEach(button => {
            button.classList.remove("act");
            button.setAttribute("aria-selected", "false");
            button.removeAttribute("aria-current");
        });
        document.querySelectorAll(".tab").forEach(e => e.classList.remove("act"));
        e.classList.add("act");
        e.setAttribute("aria-selected", "true");
        e.setAttribute("aria-current", "page");
        $("tab-" + t).classList.add("act");
        "analytics" === t && loadAnalytics();
        "settings" === t && loadExtendedSettings();
        "focus" === t && (loadFocusUI(), loadWeeklyGoalSettings(), loadFocusHistory());
        "sitemanager" === t && (async () => { await Promise.all([loadRules(), loadCategories(), loadVisitedSites(), loadExtendedSettings()]); renderCategories(); renderGranularBlocksUI(); })();

    })
}),
    // FF v6.8: Settings sub-tab switching
    document.querySelectorAll("[data-settab]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-settab]").forEach(b => b.classList.remove("act"));
            btn.classList.add("act");
            const tab = btn.getAttribute("data-settab");
            const trackingPane = $("settab-tracking");
            const securityPane = $("settab-security");
            if (trackingPane) trackingPane.style.display = tab === "tracking" ? "" : "none";
            if (securityPane) securityPane.style.display = tab === "security" ? "" : "none";
        });
    }), $("btn-bulk-edit") && $("btn-bulk-edit").addEventListener("click", async () => {
        await promptPinIfEnabled("lockRules") && (isBulkMode = !0, bulkSelected.clear(), $("btn-bulk-edit").style.display = "none", $("bulk-actions").style.display = "flex", renderCombined())
    }), $("btn-bulk-cancel") && $("btn-bulk-cancel").addEventListener("click", () => {
        isBulkMode = !1, bulkSelected.clear(), $("btn-bulk-edit").style.display = "", $("bulk-actions").style.display = "none", renderCombined()
    }), $("btn-bulk-delete") && $("btn-bulk-delete").addEventListener("click", async () => {
        if (0 === bulkSelected.size) return void toast("No items selected", "er");
        if (!(await showConfirm("Delete Rules", `Delete ${bulkSelected.size} rules?`, { isDestructive: true, confirmText: "Delete" }))) return;
        rules = rules.filter(e => !bulkSelected.has(e.id));
        allowList = allowList.filter(e => !bulkSelected.has(e));
        neverTrackDomains = neverTrackDomains.filter(e => !bulkSelected.has(e));
        await saveRulesAndSync(rules);
        await sLocal({
            allowList: allowList,
            neverTrackDomains: neverTrackDomains
        });
        await msg("TRIGGER_DNR_UPDATE");
        isBulkMode = !1;
        bulkSelected.clear();
        document.querySelectorAll("#btn-bulk-edit, .btn-bulk-edit-shared").forEach(btn => btn.style.display = "");
        $("bulk-actions").style.display = "none";
        renderCombined();
        toast("Items deleted", "ok");
    }), $("btn-add-block") && $("btn-add-block").addEventListener("click", async function () {
        var e = $("cat-inp").value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
        if (!e) return toast("Enter a domain", "er");

        var t = "distraction";
        var a = $("cat-redir").value.trim();



        var mId = $("m-id").value;
        var aIdx = rules.findIndex(r => r.id === mId || r.domain === e);

        var ruleObj;
        if (aIdx !== -1) {
            ruleObj = rules[aIdx];
            ruleObj.domain = e;
            ruleObj.category = t;
        } else {
            ruleObj = {
                id: uid(),
                domain: e,
                category: t
            };
            rules.push(ruleObj);
        }

        ruleObj.timeLimitEnabled = $("m-mode-limit").checked;
        ruleObj.dailyLimitSecs = ruleObj.timeLimitEnabled ? 60 * parseInt($("m-lim").value, 10) : 0;

        ruleObj.instantBlock = ruleObj.timeLimitEnabled && ruleObj.dailyLimitSecs === 0;
        if (ruleObj.instantBlock) {
            ruleObj.timeLimitEnabled = false; // Background script uses instantBlock
        }

        ruleObj.focusOnly = $("m-mode-focus").checked;
        ruleObj.scheduleEnabled = $("m-mode-schedule").checked;
        ruleObj.cooldownEnabled = $("m-mode-cooldown").checked;
        ruleObj.sessionLimitEnabled = $("m-mode-session").checked;
        ruleObj.redirectUrl = a || null;
        ruleObj.scheduleEnabled ? ruleObj.schedules = getSlots() : ruleObj.schedules = [];
        ruleObj.cooldownTimer = ruleObj.cooldownEnabled ? parseInt($("m-cd-wait").value, 10) : 10;
        ruleObj.cooldownFrequency = ruleObj.cooldownEnabled ? $("m-cd-freq").value : "always";
        ruleObj.sessionLimitSecs = ruleObj.sessionLimitEnabled ? 60 * parseInt($("m-session-limit").value, 10) : 300;
        ruleObj.sessionCooldownSecs = ruleObj.sessionLimitEnabled ? 60 * parseInt($("m-session-cooldown").value, 10) : 600;

        const _checkedDays = Array.from(document.querySelectorAll('.m-day-cb')).filter(cb => cb.checked).map(cb => parseInt(cb.value));
        ruleObj.activeDays = _checkedDays.length === 7 ? null : _checkedDays;

        await saveRulesAndSync(rules);

        await msg("TRIGGER_DNR_UPDATE");
        $("cat-inp").value = ""; $("cat-redir").value = ""; $("m-id").value = "";
        if ($("add-rule-modal")) $("add-rule-modal").classList.add("hide");
        renderCombined();
    }), $("btn-add-tag-inline") && $("btn-add-tag-inline").addEventListener("click", async function () {
        var e = $("mon-inp-domain").value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
        if (e) {
            var t = $("mon-cat").value;
            await tagSite(e, t);
            $("mon-inp-domain").value = "";
            $("mon-inp-domain").blur();
            $("add-rule-modal") && $("add-rule-modal").classList.add("hide");
            toast(e + " tagged successfully", "ok");
            if (typeof renderTopSites === "function") renderTopSites();
            if (typeof loadAnalytics === "function") loadAnalytics();
        } else toast("Enter a domain", "er")
    }), $("cat-inp") && $("cat-inp").addEventListener("keydown", e => {
        // FF v4.9 — "Just Tag" removed from Rule Manager. Enter now triggers Block.
        if ("Enter" === e.key) {
            const target = $("btn-add-block") || $("btn-add-cat");
            if (target) target.click();
        }
    }), $("add-sched-slot") && $("add-sched-slot").addEventListener("click", () => {
        var e = getSlots();
        e.push({
            start: "09:00",
            end: "17:00"
        }), renderScheduleSlots(e)
    }), ["m-mode-focus", "m-mode-limit", "m-mode-schedule", "m-mode-cooldown", "m-mode-session"].forEach(e => {
        $(e)?.addEventListener("change", () => {
            $("mf-tl").style.display = $("m-mode-limit").checked ? "block" : "none";
            $("mf-sc").style.display = $("m-mode-schedule").checked ? "block" : "none";
            $("mf-cd").style.display = $("m-mode-cooldown").checked ? "block" : "none";
            $("mf-session").style.display = $("m-mode-session").checked ? "block" : "none";
        })
    }), $("btn-add-cat") && $("btn-add-cat").addEventListener("click", async () => {
        var e = $("cat-inp").value.trim().toLowerCase().split("/")[0];
        if (e) {
            var t = $("block-cat").value;
            await tagSite(e, t), $("cat-inp").value = "", $("cat-inp").blur(), toast(e + " tagged as " + CAT_META[t].label, "ok")
        }
    }), $("btn-fs") && $("btn-fs").addEventListener("click", async () => {
        if ($("btn-fs").disabled) return; $("btn-fs").disabled = true;
        try { renderFocus((await msg("FOCUS_START"))?.focusState, await getActiveWorkMins()); }
        finally { $("btn-fs").disabled = false; }
    }),
    // FF v6.7: + Add Schedule shortcut below the timer
    $("btn-save-focus-sched") && $("btn-save-focus-sched").addEventListener("click", async () => {
        if (!(await promptPinIfEnabled("lockFocusScheds"))) return;
        const sv = (await gSync(["settings"])).settings || {};
        const start = $("focus-sched-start").value;
        const end = $("focus-sched-end").value;
        const days = [];
        document.querySelectorAll(".focus-sched-day-cb").forEach(cb => {
            if (cb.checked) days.push(parseInt(cb.value));
        });
        if (!days.length) return toast("Select at least one day", "er");

        sv.focusSchedules = [{
            id: Date.now().toString(),
            label: "Daily Focus",
            startTime: start,
            endTime: end,
            days: days,
            enabled: true,
            strict: true,
            blockCats: ["distraction", "communication", "uncategorized"]
        }];
        await sSync({ settings: sv });
        toast("Focus schedule saved", "ok");
    }), $("btn-fst") && $("btn-fst").addEventListener("click", async () => {
        if ($("btn-fst").disabled) return; $("btn-fst").disabled = true;
        try {
            if (await promptPinIfEnabled("lockStop")) {
                renderFocus((await msg("FOCUS_STOP"))?.focusState, await getActiveWorkMins()), loadFocusHistory()
            }
        } finally { $("btn-fst").disabled = false; }
    }), $("btn-fp") && $("btn-fp").addEventListener("click", async () => {
        if ($("btn-fp").disabled) return; $("btn-fp").disabled = true;
        try {
            var e = $("btn-fp").textContent.includes("Resume") || $("btn-fp").textContent.includes("Start");
            renderFocus((await msg(e ? "FOCUS_RESUME" : "FOCUS_PAUSE"))?.focusState, await getActiveWorkMins())
        } finally { $("btn-fp").disabled = false; }
    }), $("btn-skip") && $("btn-skip").addEventListener("click", async () => {
        if ($("btn-skip").disabled) return; $("btn-skip").disabled = true;
        try { renderFocus((await msg("FOCUS_SKIP"))?.focusState, await getActiveWorkMins()); }
        finally { $("btn-skip").disabled = false; }
    }), $("btn-save-goals") && $("btn-save-goals").addEventListener("click", async () => {
        var e = (await gSync(["settings"])).settings || {};
        e.weeklyGoalHours = parseInt($("weekly-goal-input").value) || 0;
        e.streakMinMinutes = parseInt($("streak-min-input").value) || 30;
        e.weekStartsOn = $("week-start-select").value || "mon";
        let t = [];
        document.querySelectorAll(".goal-cb-cat:checked").forEach(e => t.push(e.value)), e.goalCats = t.length ? t : ["productivity", "learning"], await sSync({
            settings: e
        }), toast("Study goals saved", "ok"), loadWeeklyGoalSettings(), loadAnalytics()
    }), document.querySelectorAll("[data-atab]").forEach(e => {
        e.addEventListener("click", () => {
            document.querySelectorAll("[data-atab]").forEach(e => e.classList.remove("act")), e.classList.add("act"), currentATab = e.getAttribute("data-atab"), ["overview", "daily", "topsites", "trend", "insights"].forEach(e => {
                const tab = $("atab-" + e);
                if (tab) {
                    if (e === currentATab) {
                        tab.style.display = "";
                        tab.style.opacity = "0";
                        tab.style.transition = "none";
                    } else {
                        tab.style.display = "none";
                    }
                }
            }), setTimeout(() => loadAnalytics(), 100)
        })
    }), document.querySelectorAll("[data-range]").forEach(e => {
        e.addEventListener("click", () => {
            document.querySelectorAll("[data-range]").forEach(b => b.classList.remove("act"));
            e.classList.add("act");
            var v = e.getAttribute("data-range");
            var panel = $("ov-custom-panel");
            if (v === "custom") {
                if (panel) panel.style.display = "flex";
                if ($("ov-from") && !$("ov-from").value) {
                    var f = new Date(); f.setDate(f.getDate() - 30);
                    var t2 = new Date();
                    $("ov-from").value = f.toISOString().slice(0, 10);
                    $("ov-to").value = t2.toISOString().slice(0, 10);
                }
                return;
            }
            if (panel) panel.style.display = "none";
            analyticsRange = parseInt(v) || 7;
            overviewCustomFrom = null; overviewCustomTo = null;
            $("ov-range-lbl") && ($("ov-range-lbl").textContent = "Last " + analyticsRange + " days");
            renderOverview();
        })
    }), document.querySelectorAll("[data-siterange]").forEach(e => {
        e.addEventListener("click", () => {
            document.querySelectorAll("[data-siterange]").forEach(e => e.classList.remove("act")), e.classList.add("act"), siteRange = e.getAttribute("data-siterange"), renderTopSites()
        })
    }), document.querySelectorAll("[data-trendrange]").forEach(e => {
        e.addEventListener("click", () => {
            document.querySelectorAll("[data-trendrange]").forEach(b => b.classList.remove("act"));
            e.classList.add("act");
            var v = e.getAttribute("data-trendrange");
            var panel = $("trend-custom-panel");
            if (v === "custom") {
                if (panel) panel.style.display = "flex";
                if ($("trend-from") && !$("trend-from").value) {
                    var f = new Date(); f.setDate(f.getDate() - 30);
                    var t2 = new Date();
                    $("trend-from").value = f.toISOString().slice(0, 10);
                    $("trend-to").value = t2.toISOString().slice(0, 10);
                }
                return;
            }
            if (panel) panel.style.display = "none";
            trendRange = parseInt(v) || 7;
            trendCustomFrom = null; trendCustomTo = null;
            renderTrend();
        })
    });
// FF v4.2: Daily Breakdown range selector
document.querySelectorAll("[data-dailyrange]").forEach(e => {
    e.addEventListener("click", () => {
        document.querySelectorAll("[data-dailyrange]").forEach(b => b.classList.remove("act"));
        e.classList.add("act");
        const v = e.getAttribute("data-dailyrange");
        const panel = $("db-custom-panel");
        if (v === "custom") {
            if (panel) panel.style.display = "flex";
            // Pre-fill with last 30 days if empty
            if ($("db-from") && !$("db-from").value) {
                const f = new Date(); f.setDate(f.getDate() - 30);
                const t2 = new Date();
                $("db-from").value = f.toISOString().slice(0, 10);
                $("db-to").value = t2.toISOString().slice(0, 10);
            }
            return; // wait for Apply
        }
        if (panel) panel.style.display = "none";
        dailyRange = parseInt(v) || 7;
        renderDailyBreakdown();
    });
});
const dbApplyBtn = $("db-apply");
if (dbApplyBtn) {
    dbApplyBtn.addEventListener("click", () => {
        const f = $("db-from")?.value, tt = $("db-to")?.value;
        if (!f || !tt) { toast && toast("Pick both dates", "err"); return; }
        dailyRange = "custom"; dailyCustomFrom = f; dailyCustomTo = tt;
        renderDailyBreakdown();
    });
}
// FF v4.4: Custom range Apply for Overview + Comparison
const ovApplyBtn = $("ov-apply");
if (ovApplyBtn) {
    ovApplyBtn.addEventListener("click", () => {
        const f = $("ov-from")?.value, tt = $("ov-to")?.value;
        if (!f || !tt) { toast && toast("Pick both dates", "err"); return; }
        if (new Date(tt) < new Date(f)) { toast && toast("End date is before start", "err"); return; }
        overviewCustomFrom = f; overviewCustomTo = tt;
        $("ov-range-lbl") && ($("ov-range-lbl").textContent = f + " → " + tt);
        renderOverview();
    });
}
const trendApplyBtn = $("trend-apply");
if (trendApplyBtn) {
    trendApplyBtn.addEventListener("click", () => {
        const f = $("trend-from")?.value, tt = $("trend-to")?.value;
        if (!f || !tt) { toast && toast("Pick both dates", "err"); return; }
        if (new Date(tt) < new Date(f)) { toast && toast("End date is before start", "err"); return; }
        trendCustomFrom = f; trendCustomTo = tt;
        renderTrend();
    });
}
let tooltipEl = null;
let mouseX = 0, mouseY = 0;

document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (tooltipEl && tooltipEl.style.display === "block") {
        tooltipEl.style.left = (mouseX + 15) + "px";
        tooltipEl.style.top = (mouseY - 15) + "px";
        const _ttR = tooltipEl.getBoundingClientRect();
        if (_ttR.right > window.innerWidth - 8) tooltipEl.style.left = (mouseX - _ttR.width - 15) + "px";
        if (_ttR.bottom > window.innerHeight - 8) tooltipEl.style.top = (mouseY - _ttR.height) + "px";
    }
});

function hideTooltip() {
    if (tooltipEl) {
        tooltipEl.style.display = "none";
        tooltipEl.style.opacity = "0";
    }
}

function showTooltip(e, t, a) {
    if (!tooltipEl) {
        tooltipEl = document.createElement("div");
        tooltipEl.className = "chart-tooltip";
        document.body.appendChild(tooltipEl);
    }
    setSafeHTML(tooltipEl, a);
    tooltipEl.style.display = "block";
    tooltipEl.style.opacity = "1";
    tooltipEl.style.left = (mouseX + 15) + "px";
    tooltipEl.style.top = (mouseY - 15) + "px";
    const _ttR = tooltipEl.getBoundingClientRect();
    if (_ttR.right > window.innerWidth - 8) tooltipEl.style.left = (mouseX - _ttR.width - 15) + "px";
    if (_ttR.bottom > window.innerHeight - 8) tooltipEl.style.top = (mouseY - _ttR.height) + "px";
}

function drawBarChart(canvasId, yAxisId, scrollId, labels, dayKeys, dayStats, selectedCats, daySiteLogs) {
    const scrollEl = document.getElementById(scrollId);
    if (scrollEl) {
        scrollEl.style.paddingLeft = '50px';
        scrollEl.style.paddingRight = '50px';
    }

    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl || !scrollEl) return;

    const existingChart = Chart.getChart(canvasEl);
    if (existingChart) {
        existingChart.destroy();
    }
    _barChartInstance = null;

    const containerWidth = scrollEl.parentElement.clientWidth || 800;
    const chartWidth = Math.max(containerWidth - 100, 80 * labels.length);
    
    // Dynamic wrapper to ensure the parent container scrolls horizontally instead of squeezing the canvas
    let wrapper = canvasEl.parentElement;
    if (wrapper.id !== canvasId + '-wrapper') {
        wrapper = document.createElement('div');
        wrapper.id = canvasId + '-wrapper';
        canvasEl.parentNode.insertBefore(wrapper, canvasEl);
        wrapper.appendChild(canvasEl);
    }
    wrapper.style.width = chartWidth + "px";
    wrapper.style.height = "450px";
    wrapper.style.position = "relative";

    const isLight = document.documentElement.classList.contains("light");
    const textColor = isLight ? "#0f172a" : "#ffffff";
    const docStyle = getComputedStyle(document.documentElement);
    const gridColor = isLight ? "rgba(15, 23, 42, 0.04)" : "rgba(255, 255, 255, 0.04)";

    const datasets = [];
    const activeCats = selectedCats.length ? selectedCats : ["uncategorized"];
    
    const catGradients = {
        productivity: { solid: '#05D581', fade: 'rgba(5, 213, 129, 0.15)' },
        learning: { solid: '#A855F7', fade: 'rgba(168, 85, 247, 0.15)' },
        communication: { solid: '#5C9CFC', fade: 'rgba(92, 156, 252, 0.15)' },
        distraction: { solid: '#F46B7A', fade: 'rgba(244, 107, 122, 0.15)' },
        uncategorized: { solid: '#71717A', fade: 'rgba(113, 113, 122, 0.15)' }
    };
    
    let maxVal = 0;
    activeCats.forEach(cat => {
        const data = dayKeys.map(dayKey => {
            return Math.max(0, Math.round((dayStats[dayKey] && dayStats[dayKey][cat] || 0) / 60));
        });
        
        const colors = catGradients[cat] || catGradients.uncategorized;
        
        datasets.push({
            label: CAT_LABELS[cat] || "Uncategorized",
            data: data,
            backgroundColor: function(context) {
                const chart = context.chart;
                const {ctx, scales} = chart;
                const index = context.dataIndex;
                if (index === undefined || !scales.y) return colors.solid;
                
                const val = context.dataset.data[index] || 0;
                const yVal = scales.y.getPixelForValue(val);
                const yZero = scales.y.getPixelForValue(0);
                
                if (!isFinite(yVal) || !isFinite(yZero)) return colors.solid;
                
                const gradient = ctx.createLinearGradient(0, yVal, 0, yZero);
                gradient.addColorStop(0, colors.solid);
                gradient.addColorStop(1, colors.fade);
                return gradient;
            },
            borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: 'bottom',
            barPercentage: 0.8,
            categoryPercentage: 0.8,
            maxBarThickness: 16
        });

        data.forEach(val => {
            if (val > maxVal) maxVal = val;
        });
    });
    maxVal = Math.max(60, maxVal);

    // Dynamic Y-axis alignment plugin (populates both left and right stationary axes)
    const alignYAxisPlugin = {
        id: 'alignYAxis',
        afterLayout: (chart) => {
            const yAxisEl = document.getElementById(yAxisId);
            if (yAxisEl) {
                yAxisEl.innerHTML = "";
                yAxisEl.style.display = 'flex';
                yAxisEl.style.position = "absolute";
                yAxisEl.style.left = "0px";
                yAxisEl.style.top = "0px";
                yAxisEl.style.bottom = "35px";
                yAxisEl.style.width = "50px";
                yAxisEl.style.zIndex = "10";
            }
            
            const rightYAxisId = yAxisId + "-right";
            const yAxisElRight = document.getElementById(rightYAxisId);
            if (yAxisElRight) {
                yAxisElRight.innerHTML = "";
                yAxisElRight.style.display = 'flex';
                yAxisElRight.style.position = "absolute";
                yAxisElRight.style.right = "0px";
                yAxisElRight.style.top = "0px";
                yAxisElRight.style.bottom = "35px";
                yAxisElRight.style.width = "50px";
                yAxisElRight.style.zIndex = "10";
            }
            
            const yScale = chart.scales.y;
            if (!yScale) return;
            const ticks = yScale.ticks;
            
            ticks.forEach(tick => {
                const val = tick.value;
                const yPos = yScale.getPixelForValue(val);
                if (!isFinite(yPos)) return;
                const labelText = maxVal > 90 ? (val / 60).toFixed(1) + "h" : Math.round(val) + "m";
                
                if (yAxisEl) {
                    const lbl = document.createElement("div");
                    lbl.textContent = labelText;
                    lbl.style.cssText = `
                        position: absolute;
                        right: 8px;
                        top: ${yPos - 6}px;
                        color: ${textColor};
                        font-weight: 700;
                        font-size: 12px;
                        font-family: 'Manrope', system-ui, sans-serif;
                        line-height: 1;
                        background: transparent;
                        padding: 0;
                        border: none;
                        box-shadow: none;
                    `;
                    yAxisEl.appendChild(lbl);
                }

                if (yAxisElRight) {
                    const lbl = document.createElement("div");
                    lbl.textContent = labelText;
                    lbl.style.cssText = `
                        position: absolute;
                        left: 8px;
                        top: ${yPos - 6}px;
                        color: ${textColor};
                        font-weight: 700;
                        font-size: 12px;
                        font-family: 'Manrope', system-ui, sans-serif;
                        line-height: 1;
                        background: transparent;
                        padding: 0;
                        border: none;
                        box-shadow: none;
                    `;
                    yAxisElRight.appendChild(lbl);
                }
            });
        }
    };

    canvasEl.onmouseleave = () => {
        hideTooltip();
    };

    _barChartInstance = new Chart(canvasEl, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        plugins: [alignYAxisPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    bottom: 25
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false,
                    external: function(context) {
                        const { chart, tooltip } = context;
                        if (tooltip.opacity === 0) {
                            hideTooltip();
                            return;
                        }
                        const dataPoint = tooltip.dataPoints[0];
                        if (!dataPoint) {
                            hideTooltip();
                            return;
                        }
                        
                        const dataIndex = dataPoint.dataIndex;
                        const datasetIndex = dataPoint.datasetIndex;
                        const dayKey = dayKeys[dataIndex];
                        const cat = activeCats[datasetIndex];
                        const val = dataPoint.raw;
                        
                        let sites = daySiteLogs[dayKey] || {};
                        let items = [];
                        Object.entries(sites).forEach(([domain, secs]) => {
                            if (getEffectiveCat(domain).cat === cat && secs > 0) {
                                items.push({
                                    domain: domain,
                                    mins: Math.round(secs / 60)
                                });
                            }
                        });
                        items.sort((e, t) => t.mins - e.mins);
                        let top5 = items.slice(0, 5);
                        let cColor = catColor(cat);
                        let html = `<div style="font-weight:800;margin-bottom:6px;border-bottom:1px solid var(--bd2);padding-bottom:6px;color:${cColor}">${CAT_META[cat].label} · ${fmt(60 * val)}</div>`;
                        if (top5.length === 0) {
                            html += '<div style="font-size:12px;color:var(--tx2)">No specific sites tracked.</div>';
                        } else {
                            top5.forEach(e => {
                                html += `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;margin-bottom:4px"><span>${e.domain}</span><span class="num" style="color:var(--tx2);font-weight:700">${fmt(60 * e.mins)}</span></div>`;
                            });
                        }
                        
                        showTooltip(mouseX, mouseY, html);
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Manrope', system-ui, sans-serif",
                            weight: '700',
                            size: 12
                        }
                    }
                },
                y: {
                    position: 'left',
                    min: 0,
                    max: maxVal,
                    grid: {
                        color: gridColor,
                        drawBorder: false,
                        borderDash: [5, 5]
                    },
                    ticks: {
                        display: false,
                        stepSize: maxVal / 4
                    }
                },
                yRight: {
                    position: 'right',
                    min: 0,
                    max: maxVal,
                    grid: {
                        drawOnChartArea: false,
                        drawBorder: false
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        }
    });

    setTimeout(() => {
        scrollEl.scrollLeft = scrollEl.scrollWidth;
    }, 50);
}

function drawTrendChart(canvasId, yAxisId, scrollId, labels, prod, learn, comm, dist, unc) {
    const scrollEl = document.getElementById(scrollId);
    if (scrollEl) {
        scrollEl.style.paddingLeft = '50px';
        scrollEl.style.paddingRight = '50px';
    }

    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl || !scrollEl) return;

    const existingChart = Chart.getChart(canvasEl);
    if (existingChart) {
        existingChart.destroy();
    }
    _trendChartInstance = null;

    const containerWidth = scrollEl.parentElement.clientWidth || 800;
    const chartWidth = Math.max(containerWidth - 100, 80 * labels.length);
    
    // Dynamic wrapper to ensure the parent container scrolls horizontally instead of squeezing the canvas
    let wrapper = canvasEl.parentElement;
    if (wrapper.id !== canvasId + '-wrapper') {
        wrapper = document.createElement('div');
        wrapper.id = canvasId + '-wrapper';
        canvasEl.parentNode.insertBefore(wrapper, canvasEl);
        wrapper.appendChild(canvasEl);
    }
    wrapper.style.width = chartWidth + "px";
    wrapper.style.height = "450px";
    wrapper.style.position = "relative";

    const isLight = document.documentElement.classList.contains("light");
    const textColor = isLight ? "#0f172a" : "#ffffff";
    const docStyle = getComputedStyle(document.documentElement);
    const gridColor = isLight ? "rgba(15, 23, 42, 0.04)" : "rgba(255, 255, 255, 0.04)";

    const catGradients = {
        productivity: { solid: '#05D581', fade: 'rgba(5, 213, 129, 0.15)' },
        learning: { solid: '#A855F7', fade: 'rgba(168, 85, 247, 0.15)' },
        communication: { solid: '#5C9CFC', fade: 'rgba(92, 156, 252, 0.15)' },
        distraction: { solid: '#F46B7A', fade: 'rgba(244, 107, 122, 0.15)' },
        uncategorized: { solid: '#71717A', fade: 'rgba(113, 113, 122, 0.15)' }
    };

    const datasets = [];
    const categories = [
        { key: 'productivity', label: 'Productivity', data: prod },
        { key: 'learning', label: 'Learning', data: learn },
        { key: 'communication', label: 'Communication', data: comm },
        { key: 'distraction', label: 'Distraction', data: dist },
        { key: 'uncategorized', label: 'Uncategorized', data: unc }
    ];

    categories.forEach(cat => {
        if (cat.data && cat.data.length) {
            const colors = catGradients[cat.key] || catGradients.uncategorized;
            datasets.push({
                label: cat.label,
                data: cat.data,
                borderColor: colors.solid,
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea || !isFinite(chartArea.top) || !isFinite(chartArea.bottom)) return colors.fade;
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, colors.fade);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    return gradient;
                },
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: colors.solid,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1.5
            });
        }
    });

    let maxVal = 0;
    datasets.forEach(ds => {
        ds.data.forEach(val => {
            if (val > maxVal) maxVal = val;
        });
    });
    maxVal = Math.max(60, Math.ceil(maxVal * 1.05));

    // Dynamic Y-axis alignment plugin (populates both left and right stationary axes)
    const alignYAxisPlugin = {
        id: 'alignYAxis',
        afterLayout: (chart) => {
            const yAxisEl = document.getElementById(yAxisId);
            if (yAxisEl) {
                yAxisEl.innerHTML = "";
                yAxisEl.style.display = 'flex';
                yAxisEl.style.position = "absolute";
                yAxisEl.style.left = "0px";
                yAxisEl.style.top = "0px";
                yAxisEl.style.bottom = "35px";
                yAxisEl.style.width = "50px";
                yAxisEl.style.zIndex = "10";
            }
            
            const rightYAxisId = yAxisId + "-right";
            const yAxisElRight = document.getElementById(rightYAxisId);
            if (yAxisElRight) {
                yAxisElRight.innerHTML = "";
                yAxisElRight.style.display = 'flex';
                yAxisElRight.style.position = "absolute";
                yAxisElRight.style.right = "0px";
                yAxisElRight.style.top = "0px";
                yAxisElRight.style.bottom = "35px";
                yAxisElRight.style.width = "50px";
                yAxisElRight.style.zIndex = "10";
            }
            
            const yScale = chart.scales.y;
            if (!yScale) return;
            const ticks = yScale.ticks;
            
            ticks.forEach(tick => {
                const val = tick.value;
                const yPos = yScale.getPixelForValue(val);
                if (!isFinite(yPos)) return;
                const labelText = maxVal > 90 ? (val / 60).toFixed(1) + "h" : Math.round(val) + "m";
                
                if (yAxisEl) {
                    const lbl = document.createElement("div");
                    lbl.textContent = labelText;
                    lbl.style.cssText = `
                        position: absolute;
                        right: 8px;
                        top: ${yPos - 6}px;
                        color: ${textColor};
                        font-weight: 700;
                        font-size: 12px;
                        font-family: 'Manrope', system-ui, sans-serif;
                        line-height: 1;
                        background: transparent;
                        padding: 0;
                        border: none;
                        box-shadow: none;
                    `;
                    yAxisEl.appendChild(lbl);
                }

                if (yAxisElRight) {
                    const lbl = document.createElement("div");
                    lbl.textContent = labelText;
                    lbl.style.cssText = `
                        position: absolute;
                        left: 8px;
                        top: ${yPos - 6}px;
                        color: ${textColor};
                        font-weight: 700;
                        font-size: 12px;
                        font-family: 'Manrope', system-ui, sans-serif;
                        line-height: 1;
                        background: transparent;
                        padding: 0;
                        border: none;
                        box-shadow: none;
                    `;
                    yAxisElRight.appendChild(lbl);
                }
            });
        }
    };

    canvasEl.onmouseleave = () => {
        hideTooltip();
    };

    _trendChartInstance = new Chart(canvasEl, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        plugins: [
            alignYAxisPlugin,
            {
                id: 'verticalLine',
                afterDraw: (chart) => {
                    if (chart.tooltip?._active?.length) {
                        const activePoint = chart.tooltip._active[0];
                        const ctx = chart.ctx;
                        const x = activePoint.element.x;
                        const topY = chart.chartArea.top;
                        const bottomY = chart.chartArea.bottom;
                        
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(x, topY);
                        ctx.lineTo(x, bottomY);
                        ctx.lineWidth = 1.5;
                        ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.15)';
                        ctx.setLineDash([4, 4]);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }
        ],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    bottom: 25
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false,
                    external: function(context) {
                        const { chart, tooltip } = context;
                        if (tooltip.opacity === 0) {
                            hideTooltip();
                            return;
                        }
                        const dataPoint = tooltip.dataPoints[0];
                        if (!dataPoint) {
                            hideTooltip();
                            return;
                        }
                        
                        const dataIndex = dataPoint.dataIndex;
                        let html = `<div style="font-weight:800;margin-bottom:6px;border-bottom:1px solid var(--bd2);padding-bottom:6px">${labels[dataIndex]}</div>`;
                        let hasData = false;
                        
                        chart.data.datasets.forEach(ds => {
                            const val = ds.data[dataIndex];
                            if (val > 0) {
                                html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:4px">
                                    <div style="display:flex;align-items:center;gap:6px">
                                        <span style="color:${ds.borderColor}">●</span> ${ds.label}:
                                    </div> 
                                    <span class="num" style="color:var(--tx);font-weight:700">${fmt(60 * val)}</span>
                                </div>`;
                                hasData = true;
                            }
                        });
                        
                        if (!hasData) {
                            hideTooltip();
                            return;
                        }
                        
                        showTooltip(mouseX, mouseY, html);
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Manrope', system-ui, sans-serif",
                            weight: '700',
                            size: 12
                        }
                    }
                },
                y: {
                    position: 'left',
                    min: 0,
                    max: maxVal,
                    grid: {
                        color: gridColor,
                        drawBorder: false,
                        borderDash: [5, 5]
                    },
                    ticks: {
                        display: false,
                        stepSize: maxVal / 4
                    }
                },
                yRight: {
                    position: 'right',
                    min: 0,
                    max: maxVal,
                    grid: {
                        drawOnChartArea: false,
                        drawBorder: false
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        }
    });

    setTimeout(() => {
        scrollEl.scrollLeft = scrollEl.scrollWidth;
    }, 50);
}
async function renderOverview() {
    var {
        days: e,
        labels: t
    } = getDays(overviewCustomFrom && overviewCustomTo ? { from: overviewCustomFrom, to: overviewCustomTo } : analyticsRange), a = await msg("STATS_GET_RANGE", {
        days: e
    }), n = a?.data || {};
    recalculateRangeStats(n);
    var i = {
        sites: {}
    }, s = {};
    e.forEach(e => {
        var t = n[e] || {};
        s[e] = t.sites || {}, Object.keys(t).forEach(e => {
            "sites" === e ? Object.entries(t.sites || {}).forEach(([e, t]) => i.sites[e] = (i.sites[e] || 0) + t) : "number" == typeof t[e] && (i[e] = (i[e] || 0) + t[e])
        })
    }), $("an-total") && ($("an-total").textContent = fmt(allCats().reduce((e, t) => e + (i[t] || 0), 0))), $("an-prod") && ($("an-prod").textContent = fmt(i.productivity || 0)), $("an-lrn") && ($("an-lrn").textContent = fmt(i.learning || 0)), $("an-comms") && ($("an-comms").textContent = fmt(i.communication || 0)), $("an-dist") && ($("an-dist").textContent = fmt(i.distraction || 0));
    const totalsResp = await msg("STATS_GET_ALLTIME_TOTALS");
    const totalDaysResp = await msg("STATS_GET_TOTAL_DAYS");
    const totals = totalsResp?.allTimeTotals || {};
    const r = Object.values(totals).reduce((sum, secs) => sum + secs, 0);
    const l = totalDaysResp?.totalDays || 1;
    $("at-total") && ($("at-total").textContent = fmt(r));
    $("at-daily-avg") && ($("at-daily-avg").textContent = fmt(l > 0 ? Math.round(r / l) : 0));
    $("at-days") && ($("at-days").textContent = l);
    var c = await msg("STATS_GET_STREAK"),
        d = c && c.streak || {};
    $("an-bs") && ($("an-bs").textContent = (d.bestStreak || 0) + "d"), $("an-bd") && ($("an-bd").textContent = d.bestDay ? new Date(d.bestDay + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    }) : "—");
    let u = [];
    $("tog-ov-prod")?.checked && u.push("productivity"), $("tog-ov-lrn")?.checked && u.push("learning"), $("tog-ov-dist")?.checked && u.push("distraction"), $("tog-ov-comm")?.checked && u.push("communication"), $("tog-ov-unc")?.checked && u.push("uncategorized"), $("ov-chart") && drawBarChart("ov-chart", "ov-y-axis", "ov-scroll", t, e, n, u, s)
}
async function renderDailyBreakdown() {
    // FF v4.2: was loading the entire history (STATS_GET_ALL) and slicing 45 days — laggy.
    // Now request only the days we need via STATS_GET_RANGE.
    var t = $("daily-breakdown-list");
    if (!t) return;
    var rangeKeys = [];
    if (dailyRange === "custom" && dailyCustomFrom && dailyCustomTo) {
        const from = new Date(dailyCustomFrom + "T00:00:00");
        const to = new Date(dailyCustomTo + "T00:00:00");
        if (to >= from) {
            const cap = 366; // hard upper bound
            for (let d = new Date(to), i = 0; d >= from && i < cap; d.setDate(d.getDate() - 1), i++) {
                rangeKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
            }
        }
    } else {
        const days = parseInt(dailyRange) || 7;
        for (let i = 0; i < days; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            rangeKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
        }
    }
    var e = (await msg("STATS_GET_RANGE", { days: rangeKeys }))?.data || {};
    recalculateRangeStats(e);
    if (t) {
        t.innerHTML = "";
        var a = (await gSync(["settings"])).settings || {},
            n = rangeKeys.filter(k => e[k]); // newest-first already
        n.length ? (n.forEach(n => {
            var i = e[n] || {},
                s = i.productivity || 0,
                o = i.learning || 0,
                r = i.communication || 0,
                l = i.distraction || 0,
                c = i.uncategorized || 0,
                d = s + o + r + l + c;
            if (d < 60) return;
            var v = document.createElement("div");
            v.className = "db-card";
            var h = "";
            [{
                c: "productivity",
                l: "Productivity",
                col: "var(--green)",
                v: s
            }, {
                c: "learning",
                l: "Learning",
                col: "var(--purple)",
                v: o
            }, {
                c: "communication",
                l: "Communication",
                col: "var(--blue)",
                v: r
            }, {
                c: "distraction",
                l: "Distraction",
                col: "var(--red)",
                v: l
            }, {
                c: "uncategorized",
                l: "Uncategorized",
                col: "var(--tx4)",
                v: c
            }].forEach(e => {
                e.v > 0 && d && (h += `<div class="db-bar-segment" style="width:${e.v / d * 100}%; background:${e.col};"></div>`)
            });
            var f = "";
            let hasTimeline = i.timeline && i.timeline.length > 0;
            if (hasTimeline) {
                f = `<div class="db-timeline-container" style="width: 100% !important; margin: 0; position: relative;">`;
                for (let e = 1; e < 4; e++) f += `<div class="db-timeline-gridline" style="left:${25 * e}%;"></div>`;
                let e = new Date(n + "T00:00:00").getTime(),
                    t = e + 864e5;
                i.timeline.forEach(a => {
                    let n = Math.max(e, a.start),
                        i = Math.min(t, a.end);
                    i <= n || (f += `<div class="db-timeline-block" style="left:${(n - e) / 864e5 * 100}%;width:${(i - n) / 864e5 * 100}%;background:${catColor(a.cat)};" title="${new Date(n).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(i).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}"></div>`)
                }), f += `</div>
                        <div class="db-timeline-labels">
                           <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11:59 PM</span>
                        </div>`;
            }
            var y = '<div class="db-sites-grid">',
                b = 0;
            Object.entries(i.sites || {}).sort((e, t) => t[1] - e[1]).forEach(([e, t]) => {
                if (!(t < 120)) {
                    b++;
                    var a = catColor(getEffectiveCat(e).cat);
                    y += `<div class="db-site-pill" style="--border-color:${a}; align-items:center;">\n        <div class="db-site-left" style="color:var(--tx); font-size:15px; font-weight:800;">${getFav(e)}<span class="db-site-dom">${e}</span></div>\n        <span class="db-site-time" style="color:var(--tx); font-size:15px; font-weight:800; display:flex; align-items:center;">${fmt(t)} <button class="scrub-btn" data-day="${n}" data-dom="${e}" data-secs="${t}" title="Adjust time" style="background:none;border:none;cursor:pointer;opacity:0.6;transition:all 0.2s;margin-left:6px;display:inline-flex;align-items:center;padding:0;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button><button class="daily-site-rule-btn" data-domain="${e}" title="Add or Edit Rule" style="background:none;border:none;cursor:pointer;opacity:0.6;transition:all 0.2s;margin-left:4px;display:inline-flex;align-items:center;padding:0;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></button></span>\n      </div>`
                }
            }), 0 === b && (y += '<span style="font-size:13px;color:var(--tx3);font-weight:600;grid-column:1/-1;">No major site activity tracked.</span>'), y += "</div>";
            var $ = `
              <div class="db-stats-grid">
                <!-- Total Tracked -->
                <div class="db-stat-box" style="--glow-color: rgba(92, 156, 252, 0.15); --glow-border: rgba(92, 156, 252, 0.2); --glow-shadow: rgba(92, 156, 252, 0.1);">
                  <div class="db-stat-info">
                    <span class="db-stat-title">Total Tracked</span>
                    <span class="db-stat-value num" style="color: var(--tx);">${fmt(d)}</span>
                  </div>
                </div>
                <!-- Productivity -->
                <div class="db-stat-box" style="--glow-color: rgba(5, 213, 129, 0.15); --glow-border: rgba(5, 213, 129, 0.2); --glow-shadow: rgba(5, 213, 129, 0.1); opacity: ${s > 0 ? "1" : "0.35"};">
                  <div class="db-stat-info">
                    <span class="db-stat-title">Productivity</span>
                    <span class="db-stat-value num" style="color: var(--green);">${fmt(s)}</span>
                  </div>
                </div>
                <!-- Learning -->
                <div class="db-stat-box" style="--glow-color: rgba(168, 85, 247, 0.15); --glow-border: rgba(168, 85, 247, 0.2); --glow-shadow: rgba(168, 85, 247, 0.1); opacity: ${o > 0 ? "1" : "0.35"};">
                  <div class="db-stat-info">
                    <span class="db-stat-title">Learning</span>
                    <span class="db-stat-value num" style="color: var(--purple);">${fmt(o)}</span>
                  </div>
                </div>
                <!-- Communication -->
                <div class="db-stat-box" style="--glow-color: rgba(92, 156, 252, 0.15); --glow-border: rgba(92, 156, 252, 0.2); --glow-shadow: rgba(92, 156, 252, 0.1); opacity: ${r > 0 ? "1" : "0.35"};">
                  <div class="db-stat-info">
                    <span class="db-stat-title">Communication</span>
                    <span class="db-stat-value num" style="color: var(--blue);">${fmt(r)}</span>
                  </div>
                </div>
                <!-- Distraction -->
                <div class="db-stat-box" style="--glow-color: rgba(244, 107, 122, 0.15); --glow-border: rgba(244, 107, 122, 0.2); --glow-shadow: rgba(244, 107, 122, 0.1); opacity: ${l > 0 ? "1" : "0.35"};">
                  <div class="db-stat-info">
                    <span class="db-stat-title">Distraction</span>
                    <span class="db-stat-value num" style="color: var(--red);">${fmt(l)}</span>
                  </div>
                </div>
              </div>
            `;
            setSafeHTML(v, `
              <div class="db-hero" style="margin-bottom: 24px;">
                <div class="db-header-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 6px;">
                  <div class="db-card-header-txt">
                    ${new Date(n + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>
                  ${hasTimeline ? `
                    <div class="db-card-header-txt">
                      24-Hour Active Timeline
                    </div>
                  ` : ''}
                </div>
                ${hasTimeline ? `
                  <div class="db-timeline-full-wrap" style="width: 100%; margin-bottom: 20px;">
                    ${f}
                  </div>
                ` : ''}
                ${$}
              </div>
              <div class="db-bar-container">
                <div class="db-bar-wrap">${h}</div>
                <div class="db-bar-legend">
                  <div class="db-bar-legend-item"><span class="db-bar-legend-dot" style="background:var(--green)"></span> Productivity</div>
                  <div class="db-bar-legend-item"><span class="db-bar-legend-dot" style="background:var(--purple)"></span> Learning</div>
                  <div class="db-bar-legend-item"><span class="db-bar-legend-dot" style="background:var(--blue)"></span> Communication</div>
                  <div class="db-bar-legend-item"><span class="db-bar-legend-dot" style="background:var(--red)"></span> Distraction</div>
                  <div class="db-bar-legend-item"><span class="db-bar-legend-dot" style="background:var(--tx4)"></span> Uncategorized</div>
                </div>
              </div>
              ${y}
            `), t.appendChild(v)
        }), t.querySelectorAll(".scrub-btn").forEach(e => {
            e.addEventListener("click", async () => {
                await promptPinIfEnabled("lockAdjustTime") && openScrubModal(e.getAttribute("data-day"), e.getAttribute("data-dom"), parseInt(e.getAttribute("data-secs")))
            })
        }), t.querySelectorAll(".daily-site-rule-btn").forEach(e => {
            e.addEventListener("click", () => {
                if (window.openAddOrEditModal) {
                    window.openAddOrEditModal(e.getAttribute("data-domain"));
                }
            })
        })) : t.innerHTML = '<div class="empty">\n      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3; margin-bottom:16px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>\n      <p>No activity data available yet.</p>\n    </div>'
    }
}
async function renderTopSites() {
    var s = {}, _activeDayCount = 0;
    // FF v6.8: fetch pinned sites from chrome.storage.local
    const storageRes = await new Promise(resolve => {
        chrome.storage.local.get(["pinnedSites"], resolve);
    }) || {};
    const pinnedSites = storageRes.pinnedSites || [];

    if ("all" === siteRange) {
        // FF v6.7: use fast allTimeTotals index instead of loading all daily data
        const _att = (await msg("STATS_GET_ALLTIME_TOTALS"))?.allTimeTotals || {};
        Object.entries(_att).forEach(([dom, secs]) => { s[dom] = secs; });
        _activeDayCount = (await msg("STATS_GET_TOTAL_DAYS"))?.totalDays || 1;
    } else {
        var _rangeDays = [];
        for (var n = parseInt(siteRange) - 1; n >= 0; n--) {
            var i = new Date; i.setDate(i.getDate() - n);
            _rangeDays.push(i.toISOString().split("T")[0]);
        }
        const _rangeData = (await msg("STATS_GET_RANGE", { days: _rangeDays }))?.data || {};
        // Bug #10 fix: compute _activeDayCount in the same loop instead of a separate O(n*m) reduce
        _rangeDays.forEach(d => {
            const entries = Object.entries(_rangeData[d]?.sites || {});
            if (!entries.length) return;
            let dayHasActivity = false;
            entries.forEach(([dom, secs]) => {
                s[dom] = (s[dom] || 0) + secs;
                if (secs > 0) dayHasActivity = true;
            });
            if (dayHasActivity) _activeDayCount++;
        });
        _activeDayCount = Math.max(1, _activeDayCount);
    }
    var t = Object.keys(s);
    // FF v6.8: Sort prioritized pinned sites first, then descending by duration
    var o = Object.entries(s).sort((e, t) => {
        const pinA = pinnedSites.includes(e[0]);
        const pinB = pinnedSites.includes(t[0]);
        if (pinA && !pinB) return -1;
        if (!pinA && pinB) return 1;
        return t[1] - e[1];
    }).slice(0, 50),
        r = $("top-sites");
    if (r)
        if (setSafeHTML(r, ""), o.length) {
            var l = _activeDayCount; // FF v6.7: already computed in range/alltime branch above
            o.forEach(e => {
                var t = getEffectiveCat(e[0]),
                    a = document.createElement("div");
                a.className = "siterow";
                a.style.gridTemplateColumns = "minmax(180px, 1.3fr) 90px 150px 75px 75px";
                const isPinned = pinnedSites.includes(e[0]);
                var n = `<select class="sel" data-domain="${e[0]}" style="padding:4px 8px;font-size:12px;width:100% !important;box-sizing:border-box;">`;
                allCats().forEach(e => n += `<option value="${e}"${e === t.cat ? " selected" : ""}>${catEmoji(e)} ${catLabel(e, !1)}</option>`), n += "</select>";

                setSafeHTML(a, `\n      <span class="dom" style="display:flex; align-items:center; gap:8px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">\n        ${getFav(e[0])}\n        <span style="color:var(--tx); font-weight:800; font-size:15px; margin-left:4px;">${e[0]}</span>\n        ${t.auto ? '<span style="font-size:11px;color:var(--tx3);" title="Auto-categorized">✨</span>' : ""}\n      </span>\n      <div style="display:flex; align-items:center; gap:10px; justify-content:flex-start; margin-left: -12px;">\n        <button class="top-site-pin-btn pinned-${isPinned}" data-domain="${e[0]}" title="${isPinned ? 'Unpin site' : 'Pin site to top'}" style="background:none; border:none; cursor:pointer; padding:4px; display:inline-flex; align-items:center; justify-content:center; transition: color 0.2s;">\n          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>\n        </button>\n        <a href="https://${e[0]}" class="top-site-visit-btn" target="_blank" title="Visit site" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; padding:4px; transition: color 0.2s;">\n          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>\n        </a>\n        <button class="top-site-rule-btn" data-domain="${e[0]}" title="Add or Edit Rule" style="background:none; border:none; cursor:pointer; padding:4px; display:inline-flex; align-items:center; justify-content:center; transition: color 0.2s;">\n          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>\n        </button>\n      </div>\n      ${n}\n      <span class="stat-pill">${fmt(e[1])}</span>\n      <span class="stat-pill">~${fmt(Math.round(e[1] / l))}</span>\n    `);
a.querySelector(".sel")?.addEventListener("change", async function () {
                    await tagSite(this.getAttribute("data-domain"), this.value), loadAnalytics()
                });

                a.querySelector(".top-site-pin-btn")?.addEventListener("click", function () {
                    const dom = this.getAttribute("data-domain");
                    chrome.storage.local.get(["pinnedSites"], function (res) {
                        let list = res.pinnedSites || [];
                        if (list.includes(dom)) {
                            list = list.filter(x => x !== dom);
                        } else {
                            list.push(dom);
                        }
                        chrome.storage.local.set({ pinnedSites: list }, function () {
                            renderTopSites();
                        });
                    });
                });

                a.querySelector(".top-site-rule-btn")?.addEventListener("click", function () {
                    if (window.openAddOrEditModal) {
                        window.openAddOrEditModal(this.getAttribute("data-domain"));
                    }
                });

                r.appendChild(a)
            })
        } else r.innerHTML = '<div class="empty">\n      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3; margin-bottom:16px;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1 4-10z"></path></svg>\n      <p>No sites tracked for this period.</p>\n    </div>'
}
async function renderTrend() {
    var _trendCustom = trendCustomFrom && trendCustomTo;
    var _windowDays = _trendCustom
        ? Math.max(1, Math.round((new Date(trendCustomTo) - new Date(trendCustomFrom)) / 86400000) + 1)
        : trendRange;
    var {
        days: e,
        labels: t
    } = getDays(_trendCustom ? { from: trendCustomFrom, to: trendCustomTo } : trendRange);
    var a = await msg("STATS_GET_RANGE", {
        days: e
    });
    var n = a?.data || {};
    recalculateRangeStats(n);
    var i = 0, s = 0;
    var o = e.map(e => {
        var t = (n[e] || {}).productivity || 0;
        return i += t, Math.round(t / 60)
    });
    var r = e.map(e => {
        var t = (n[e] || {}).learning || 0;
        return i += t, Math.round(t / 60)
    });
    var l = e.map(e => {
        var t = (n[e] || {}).communication || 0;
        return Math.round(t / 60)
    });
    var c = e.map(e => {
        var t = (n[e] || {}).distraction || 0;
        return s += t, Math.round(t / 60)
    });
    var d = e.map(e => {
        var t = (n[e] || {}).uncategorized || 0;
        return Math.round(t / 60)
    });
    var u = [];
    for (var p = 2 * _windowDays - 1; p >= _windowDays; p--) {
        // Previous-period window of equal length, ending the day before our window starts.
        var anchor = _trendCustom ? new Date(trendCustomFrom + "T00:00:00") : new Date();
        var g = new Date(anchor);
        if (_trendCustom) {
            g.setDate(anchor.getDate() - (p - _windowDays + 1));
        } else {
            g.setDate(g.getDate() - p);
        }
        u.push(`${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, "0")}-${String(g.getDate()).padStart(2, "0")}`)
    }
    var m = await msg("STATS_GET_RANGE", {
        days: u
    });
    var v = m?.data || {};
    recalculateRangeStats(v);
    var h = 0,
        f = 0;
    u.forEach(e => {
        h += (v[e]?.productivity || 0) + (v[e]?.learning || 0), f += v[e]?.distraction || 0
    });
    var y = h > 0 ? Math.round((i - h) / h * 100) : i > 0 ? 100 : 0,
        b = f > 0 ? Math.round((s - f) / f * 100) : s > 0 ? 100 : 0;

    function buildTrendBadge(percentChange, isProductivity) {
        if (0 === percentChange) {
            return `<span class="stat-trend-badge" style="background:var(--bg4);color:var(--tx3);border:1px solid var(--bd2)">No change</span>`;
        }
        let isGood = isProductivity ? percentChange > 0 : percentChange < 0;
        let badgeClass = isGood ? "stat-trend-badge up-good" : "stat-trend-badge up-bad";
        let arrowSymbol = percentChange > 0 ? "↗" : "↘";
        return `<span class="${badgeClass}">${arrowSymbol} ${Math.abs(percentChange)}%</span> <span class="stat-trend-meta">vs prev ${_windowDays}d</span>`;
    }
    let x = $("trend-study-total")?.parentElement?.parentElement;
    x && !x.dataset.modified && (x.dataset.modified = "true", setSafeHTML(x, `
          <div class="stat-card prod-stat-card">
              <div class="stat-card-hdr">
                  <span class="stat-card-title">Productivity Focus</span>
                  <span class="stat-card-icon prod-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  </span>
              </div>
              <div class="stat-card-body">
                  <div class="stat-card-val" id="pop-prod-val">—</div>
                  <div id="pop-prod-trend" class="stat-card-trend">—</div>
              </div>
          </div>
          <div class="stat-card dist-stat-card">
              <div class="stat-card-hdr">
                  <span class="stat-card-title">Distraction Tracking</span>
                  <span class="stat-card-icon dist-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </span>
              </div>
              <div class="stat-card-body">
                  <div class="stat-card-val" id="pop-dist-val">—</div>
                  <div id="pop-dist-trend" class="stat-card-trend">—</div>
              </div>
          </div>
    `));
    $("pop-prod-val") && setSafeHTML($("pop-prod-val"), fmt(i));
    $("pop-prod-trend") && setSafeHTML($("pop-prod-trend"), buildTrendBadge(y, true));
    $("pop-dist-val") && setSafeHTML($("pop-dist-val"), fmt(s));
    $("pop-dist-trend") && setSafeHTML($("pop-dist-trend"), buildTrendBadge(b, false));
    var w = !$("tog-trend-prod") || $("tog-trend-prod").checked,
        E = !$("tog-trend-lrn") || $("tog-trend-lrn").checked,
        S = !$("tog-trend-comm") || $("tog-trend-comm").checked,
        L = !$("tog-trend-dist") || $("tog-trend-dist").checked,
        T = !$("tog-trend-unc") || $("tog-trend-unc").checked;
    "function" == typeof drawTrendChart && $("trend-chart") && drawTrendChart("trend-chart", "trend-y-axis", "trend-scroll", t, w ? o : null, E ? r : null, S ? l : null, L ? c : null, T ? d : null)
}
async function loadDashboardStreak() {
    var t = await msg("STATS_GET_STREAK"),
        s = t && t.streak,
        a = $("streak-badge");
    if (a) {
        if (s && s.currentStreak > 0) {
            a.textContent = "🔥 " + s.currentStreak + "d";
            a.style.display = "inline-flex";
            a.style.background = "var(--amber-bg)";
            a.style.color = "var(--amber)";
            a.style.borderColor = "rgba(246,184,70,.3)";
        } else if (s) {
            a.textContent = "🧊 " + s.currentStreak + "d";
            a.style.display = "inline-flex";
            a.style.background = "var(--bg4)";
            a.style.color = "var(--tx3)";
            a.style.borderColor = "var(--bd2)";
        } else {
            a.style.display = "none";
        }
    }
}
async function loadWeeklyGoalSettings() {
    var e = (await gSync(["settings"])).settings || {};
    $("weekly-goal-input") && ($("weekly-goal-input").value = e.weeklyGoalHours || 0);
    $("streak-min-input") && ($("streak-min-input").value = e.streakMinMinutes || 30);
    $("week-start-select") && ($("week-start-select").value = e.weekStartsOn || "mon");
    let t = e.goalCats || ["productivity", "learning"];
    document.querySelectorAll(".goal-cb-cat").forEach(e => {
        e.checked = t.includes(e.value)
    }), await renderGoalPreview(e.weeklyGoalHours || 0);
    await loadDashboardStreak();
}
async function renderGoalPreview(e) {
    var t = await msg("STATS_GET_WEEK"),
        a = t?.studySecs || 0,
        n = 3600 * e,
        i = Math.min(1, n > 0 ? a / n : 0);
    $("goal-preview-bar") && ($("goal-preview-bar").style.width = Math.round(100 * i) + "%", $("goal-preview-bar").style.background = i >= 1 ? "var(--amber)" : "var(--green)"), $("goal-preview-pct") && ($("goal-preview-pct").textContent = n > 0 ? i >= 1 ? "🏆" : Math.round(100 * i) + "%" : "—", $("goal-preview-pct").style.color = i >= 1 ? "var(--amber)" : "var(--green)"), $("goal-preview-done") && ($("goal-preview-done").textContent = Math.floor(a / 3600) + "h " + Math.floor(a % 3600 / 60) + "m done"), $("goal-preview-left") && ($("goal-preview-left").textContent = n > 0 ? i >= 1 ? "Goal hit! ✓" : fmt(Math.max(0, n - a)) + " remaining" : "No goal")
}

function renderWhitelist(e) {
    var t = $("whitelist-container");
    t && (setSafeHTML(t, ""), e.length ? (e.forEach((e, a) => {
        var n = document.createElement("div");
        n.style.cssText = "display:flex;align-items:center;justify-content:space-between;background:var(--bg3);padding:10px 16px;border-radius:10px;border:1px solid var(--bd2);", n.innerHTML = `<span style="font-family:monospace;font-size:14px;color:var(--tx);font-weight:700">${sanitizeDomain(e)}</span><button class="bic del rm-wl" data-idx="${a}" style="width:28px;height:28px;font-size:12px">✕</button>`, t.appendChild(n)
    }), t.querySelectorAll(".rm-wl").forEach(t => t.addEventListener("click", async () => {
        e.splice(parseInt(t.getAttribute("data-idx")), 1), await sLocal({
            idleWhitelist: e
        }), renderWhitelist(e), toast("Removed exception", "ok")
    }))) : t.innerHTML = '<span style="font-size:13px;color:var(--tx3)">No exceptions added.</span>')
}
// Storage Usage Indicator Helper
async function updateStorageUsageIndicator() {
    const fillEl = $("storage-usage-fill");
    const textEl = $("storage-usage-text");
    if (!fillEl && !textEl) return;

    try {
        const bytes = await new Promise((resolve) => {
            if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local && typeof chrome.storage.local.getBytesInUse === "function") {
                chrome.storage.local.getBytesInUse(null, (b) => {
                    resolve(b || 0);
                });
            } else if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
                // Fallback for Firefox: stringify storage contents
                chrome.storage.local.get(null, (data) => {
                    try {
                        const str = JSON.stringify(data || {});
                        resolve(str.length);
                    } catch (_) {
                        resolve(0);
                    }
                });
            } else {
                resolve(0);
            }
        });

        const limit = 10485760;
        const pct = Math.min(100, Math.max(0, (bytes / limit) * 100));
        
        let formatted = "0.00 KB";
        if (bytes >= 1048576) {
            formatted = (bytes / 1048576).toFixed(2) + " MB";
        } else {
            formatted = (bytes / 1024).toFixed(2) + " KB";
        }

        if (textEl) {
            textEl.textContent = `${formatted} / 10 MB (${pct.toFixed(2)}%)`;
        }
        if (fillEl) {
            fillEl.style.width = pct.toFixed(2) + "%";
            if (pct >= 90) {
                fillEl.style.background = "var(--red)";
            } else if (pct >= 75) {
                fillEl.style.background = "var(--amber)";
            } else {
                fillEl.style.background = "var(--green)";
            }
        }
    } catch (err) {
        console.warn("[FF storage] failed to query storage usage:", err);
    }
}

// Bug #5 fix: accept pre-loaded settings to avoid double gSync when called alongside loadSettings
async function loadExtendedSettings(preloadedSettings) {
    updateStorageUsageIndicator();
    var e = preloadedSettings || (await gSync(["settings"])).settings || {};
    if ($("tog-pc") && ($("tog-pc").checked = !!e.passcodeEnabled), 
        $("tog-fun") && ($("tog-fun").checked = !1 !== e.funnyBlocked), 
        $("tab-limit-input") && ($("tab-limit-input").value = e.tabLimit || 0), 
        $("tog-time-warn") && ($("tog-time-warn").checked = !1 !== e.timeWarningEnabled), 
        $("time-warn-secs") && ($("time-warn-secs").value = e.timeWarningSecs || 60), 
        $("tog-badge") && ($("tog-badge").checked = !1 !== e.showBadge), 
        $("tog-idle-badge") && ($("tog-idle-badge").checked = !1 !== e.showIdleBadge), 
        $("idle-timeout-sel") && ($("idle-timeout-sel").value = e.idleTimeout || 30), 
        $("welcome-back-thresh-sel") && ($("welcome-back-thresh-sel").value = e.welcomeBackThresh || 10), 
        $("max-gap-sel") && ($("max-gap-sel").value = e.maxGapSecs !== undefined ? e.maxGapSecs : 300),
        $("tog-media") && ($("tog-media").checked = !1 !== e.trackMedia),
        $("min-visit-sel") && ($("min-visit-sel").value = e.minVisitSecs !== undefined ? e.minVisitSecs : 0),
        $("tog-track-local") && ($("tog-track-local").checked = !!e.trackLocalFiles),
        $("day-rollover-sel") && ($("day-rollover-sel").value = e.dayRolloverHour !== undefined ? e.dayRolloverHour : 0),
        $("data-retention-sel") && ($("data-retention-sel").value = e.dataRetentionDays !== undefined ? e.dataRetentionDays : 365),
        $("tog-auto-backup") && ($("tog-auto-backup").checked = !!e.autoBackupEnabled),
        renderWhitelist((await gLocal(["idleWhitelist"])).idleWhitelist || []), 
        $("pin-status-badge")) {
        const updateIdleBadgeVisibility = () => {
            const idleRow = $("idle-badge-row");
            const badgeChecked = $("tog-badge")?.checked;
            if (idleRow) {
                idleRow.style.opacity = badgeChecked ? "1" : "0.5";
                idleRow.style.pointerEvents = badgeChecked ? "auto" : "none";
            }
        };
        $("tog-badge")?.removeEventListener("change", updateIdleBadgeVisibility);
        $("tog-badge")?.addEventListener("change", updateIdleBadgeVisibility);
        updateIdleBadgeVisibility();

        if (e.passcodeHash) {
            $("pin-status-badge").innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>PIN Active', $("pin-status-badge").style.color = "var(--green)";
            var t = $("pin-status-badge").parentElement;
            t.style.display = "flex", t.style.justifyContent = "space-between", t.style.alignItems = "center", (a = document.getElementById("pin-actions-div")) || ((a = document.createElement("div")).id = "pin-actions-div", a.style.display = "flex", a.style.gap = "12px", $("btn-change-pin") && a.appendChild($("btn-change-pin")), $("btn-remove-pin") && a.appendChild($("btn-remove-pin")), t.appendChild(a)), $("granular-locks") && ($("granular-locks").style.display = "block"), $("granular-locks-overlay") && ($("granular-locks-overlay").style.display = "none"), $("pin-setup-box").style.display = "none", $("pin-manage-box").style.display = "flex";

            $("lock-stop") && ($("lock-stop").checked = !1 !== e.lockStop);
            $("lock-rules") && ($("lock-rules").checked = !1 !== e.lockRules);
            $("lock-freetime") && ($("lock-freetime").checked = !1 !== e.lockFreetime);
            $("lock-focus-presets") && ($("lock-focus-presets").checked = !1 !== e.lockFocusPresets);
            $("lock-focus-scheds") && ($("lock-focus-scheds").checked = !1 !== e.lockFocusScheds);
            $("lock-danger") && ($("lock-danger").checked = !1 !== e.lockDanger);
            $("lock-tweaks") && ($("lock-tweaks").checked = !1 !== e.lockTweaks);
            $("lock-privacy") && ($("lock-privacy").checked = !1 !== e.lockPrivacy);
            $("lock-adjust-time") && ($("lock-adjust-time").checked = !1 !== e.lockAdjustTime);
        } else {
            var a;
            $("pin-status-badge").innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>Not Set', $("pin-status-badge").style.color = "var(--tx2)";
            if ($("granular-locks")) $("granular-locks").style.display = "block";
            if ($("granular-locks-overlay")) { $("granular-locks-overlay").style.display = "flex"; }
            (a = document.getElementById("pin-actions-div")) && ($("btn-change-pin") && $("pin-manage-box").insertBefore($("btn-change-pin"), $("pin-manage-box").firstChild), $("btn-remove-pin") && $("pin-manage-box").insertBefore($("btn-remove-pin"), $("pin-manage-box").firstChild), a.remove()), $("pin-setup-box").style.display = "flex", $("pin-manage-box").style.display = "none"
        }
    }
    var n = $("free-hours-list");
    const _DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
    var isFreeTimeLocked = e.passcodeHash && !1 !== e.lockFreetime && !window.__freeTimeUnlocked;
    if (n) {
        setSafeHTML(n, "");
        const list = e.freeTimeHours || [];
        for (let t = 0; t < 3; t++) {
            const fh = list[t];
            const a = document.createElement("div");
            a.className = "free-hour-card";
            a.style.cssText = `
                flex: 1;
                min-width: 200px;
                background: var(--bg3);
                border-radius: 12px;
                border: 1px solid var(--bd);
                padding: 16px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                min-height: 120px;
                position: relative;
                transition: all 0.2s ease;
                box-sizing: border-box;
            `;
            if (!fh) {
                // Empty slot: Add card!
                a.style.borderStyle = "dashed";
                a.style.cursor = "pointer";
                a.style.justifyContent = "center";
                a.style.alignItems = "center";
                a.innerHTML = `
                    <div style="font-size:24px; color:var(--tx3); margin-bottom:4px;">+</div>
                    <div style="font-size:13px; font-weight:800; color:var(--tx3);">Add Free-time</div>
                `;
                a.addEventListener("mouseover", () => {
                    a.style.borderColor = "var(--green)";
                    a.querySelector("div:nth-child(2)").style.color = "var(--green)";
                });
                a.addEventListener("mouseout", () => {
                    a.style.borderColor = "var(--bd)";
                    a.querySelector("div:nth-child(2)").style.color = "var(--tx3)";
                });
                a.addEventListener("click", async () => {
                    if (isFreeTimeLocked) {
                        if (!await promptPinIfEnabled("lockFreetime")) return;
                        window.__freeTimeUnlocked = true;
                    }
                    showFreeTimeEditModal(t, null);
                });
            } else {
                // Configured slot: Show details!
                const start12 = formatTime12(fh.start || "18:00");
                const end12 = formatTime12(fh.end || "22:00");
                const activeDays = fh.days || [0, 1, 2, 3, 4, 5, 6];
                const dayBubbles = _DAY_NAMES.map((name, idx) => {
                    const isActive = activeDays.includes(idx);
                    return `<span style="
                        font-size: 10px;
                        font-weight: 800;
                        width: 18px;
                        height: 18px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        background: ${isActive ? 'var(--green-bg)' : 'var(--bg4)'};
                        color: ${isActive ? 'var(--green)' : 'var(--tx3)'};
                        border: 1px solid ${isActive ? 'var(--green-bd)' : 'var(--bd)'};
                    ">${name}</span>`;
                }).join("");

                setSafeHTML(a, `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="font-size:11px; font-weight:800; color:var(--tx3); text-transform:uppercase; letter-spacing:0.05em;">Free-time Hours</span>
                            <span style="font-size:14px; font-weight:800; color:var(--tx);">${start12} to ${end12}</span>
                        </div>
                        <div class="fh-actions" style="display:flex; gap:6px;">
                            <button class="bic rm-fh-btn" data-idx="${t}" title="Delete" style="background:var(--bg4); border:1px solid var(--bd); border-radius:6px; cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; color:var(--red); padding: 0;">✕</button>
                            <button class="bic edit-fh-btn" data-idx="${t}" title="Edit" style="background:var(--bg4); border:1px solid var(--bd); border-radius:6px; cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; color:var(--tx2); padding: 0;">✎</button>
                        </div>
                    </div>
                    <div style="display:flex; gap:3px; margin-top:12px;">
                        ${dayBubbles}
                    </div>
                `);
// Wire edit button
                a.querySelector(".edit-fh-btn").addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    if (isFreeTimeLocked) {
                        if (!await promptPinIfEnabled("lockFreetime")) return;
                        window.__freeTimeUnlocked = true;
                    }
                    showFreeTimeEditModal(t, fh);
                });

                // Wire delete button
                a.querySelector(".rm-fh-btn").addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    if (isFreeTimeLocked) {
                        if (!await promptPinIfEnabled("lockFreetime")) return;
                        window.__freeTimeUnlocked = true;
                    }
                    var freeList = e.freeTimeHours || [];
                    freeList.splice(t, 1);
                    await sSync({
                        settings: {
                            ...e,
                            freeTimeHours: freeList
                        }
                    });
                    loadExtendedSettings();
                    await msg("UPDATE_IDLE");
                });
            }
            n.appendChild(a);
        }
    }
    renderLocalBackupsList();

    function showFreeTimeEditModal(slotIdx, fhObj) {
        const modal = $("free-time-modal");
        if (!modal) return;
        $("ft-modal-title").textContent = fhObj ? "Edit Free-time" : "Add Free-time";
        $("ft-start").value = fhObj ? (fhObj.start || "18:00") : "18:00";
        $("ft-end").value = fhObj ? (fhObj.end || "22:00") : "22:00";
        const daysList = fhObj ? (fhObj.days || [0, 1, 2, 3, 4, 5, 6]) : [0, 1, 2, 3, 4, 5, 6];
        document.querySelectorAll(".ft-day-cb").forEach(cb => {
            cb.checked = daysList.includes(parseInt(cb.value));
        });
        modal.classList.remove("hide");
        const saveBtn = $("ft-modal-save");
        const cancelBtn = $("ft-modal-cancel");
        const closeBtn = $("ft-modal-close");
        const closeModal = () => { modal.classList.add("hide"); };
        cancelBtn.onclick = closeModal;
        closeBtn.onclick = closeModal;
        saveBtn.onclick = async () => {
            const startVal = $("ft-start").value || "18:00";
            const endVal = $("ft-end").value || "22:00";
            const checkedDays = Array.from(document.querySelectorAll(".ft-day-cb"))
                .filter(cb => cb.checked)
                .map(cb => parseInt(cb.value));
            if (!checkedDays.length) {
                toast("Please select at least one day", "er");
                return;
            }
            var settingsData = (await gSync(["settings"])).settings || {};
            var freeList = settingsData.freeTimeHours || [];
            const newFh = { start: startVal, end: endVal, days: checkedDays };
            if (slotIdx < freeList.length) {
                freeList[slotIdx] = newFh;
            } else {
                freeList.push(newFh);
            }
            settingsData.freeTimeHours = freeList;
            await sSync({ settings: settingsData });
            closeModal();
            loadExtendedSettings();
            await msg("UPDATE_IDLE");
            toast("Free-time slot saved successfully!", "ok");
        };
    }
}
async function loadFocusHistory() {
    var e = await msg("GET_FOCUS_HISTORY"),
        t = e?.focusHistory || [],
        a = $("history-list");
    if (a) {
        if (!t.length) return setSafeHTML(a, '<div class="empty" style="padding:40px 10px">\n      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3; margin-bottom:16px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>\n      <p>No focus sessions yet.</p>\n      <button class="bp" id="btn-empty-start-focus" style="margin-top:16px;padding:10px 24px;">🚀 Start First Session</button>\n    </div>'), void ($("btn-empty-start-focus") && $("btn-empty-start-focus").addEventListener("click", () => {
            $("btn-fs").click()
        }));
        a.innerHTML = "";
        let histWithIdx = t.map((item, idx) => { item._idx = idx; return item; });
        histWithIdx.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)).forEach(e => {
            var t = document.createElement("div");
            const presetMeta = {
                pomodoro: { emoji: "🍅", name: "Pomodoro" },
                deep_work: { emoji: "🧠", name: "Deep Work" },
                sprint: { emoji: "⚡", name: "Short Sprint" },
                custom: { emoji: "🌊", name: "Flow" }
            };
            const pObj = presetMeta[e.presetId] || { emoji: "🎯", name: "Focus" };
            const dateStr = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            const timeStr = e.startedAt ? new Date(e.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
            t.style.cssText = "display:flex;align-items:center;padding:14px 16px;background:var(--bg3);border:1px solid var(--bd);border-radius:12px;margin-bottom:8px;transition:var(--trans)";
            t.onmouseover = () => t.style.borderColor = "var(--bd2)";
            t.onmouseout = () => t.style.borderColor = "var(--bd)";
            setSafeHTML(t, `
              <div style="font-size:20px; width:36px;" title="${pObj.name}">${pObj.emoji}</div>
              <div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:3px; min-width:0; padding-right:8px;">
                <div style="font-size:13px; font-weight:800; color:var(--tx); line-height:1.2;">${dateStr} <span style="opacity:0.5; font-weight:500; margin-left:2px; white-space:nowrap;">${timeStr}</span></div>
                <div style="font-size:12px; font-weight:600; color:var(--tx2); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${e.isSchedule ? "Scheduled Session" : pObj.name}</div>
              </div>
              <div style="text-align:right; display:flex; flex-direction:column; justify-content:center; padding-left:8px;">
                <div class="num" style="font-size:14px; font-weight:800; color:var(--tx);">${e.durationMins || 0}<span style="font-size:10px; opacity:0.6; margin-left:2px;">m</span></div>
                ${e.cyclesCompleted && !e.isSchedule ? `<div class="num" style="font-size:12px; font-weight:600; color:var(--tx3);">${e.cyclesCompleted} cycle${e.cyclesCompleted === 1 ? '' : 's'}</div>` : ``}
              </div>
              <button class="bic del-fs" style="margin-left:16px; background:transparent; border-color:transparent; color:var(--tx3);" data-idx="${e._idx}">✕</button>
            `);
a.appendChild(t)
        });
        a.querySelectorAll(".del-fs").forEach(btn => {
            btn.addEventListener("click", async () => {
                const idx = parseInt(btn.getAttribute("data-idx"));
                await msg("DELETE_FOCUS_SESSION", { idx: idx });
                if (typeof toast === "function") toast("Session deleted", "ok");
                loadFocusHistory();
            });
        });
    }
} ["tog-ov-prod", "tog-ov-lrn", "tog-ov-dist", "tog-ov-comm", "tog-ov-unc"].forEach(e => {
    $(e) && $(e).addEventListener("change", renderOverview)
}), ["tog-trend-prod", "tog-trend-lrn", "tog-trend-comm", "tog-trend-dist", "tog-trend-unc"].forEach(e => {
    $(e) && $(e).addEventListener("change", renderTrend)
}), $("weekly-goal-input") && $("weekly-goal-input").addEventListener("input", () => {
    renderGoalPreview(parseInt($("weekly-goal-input").value) || 0)
}), $("btn-add-whitelist") && $("btn-add-whitelist").addEventListener("click", async () => {
    var e = $("whitelist-inp").value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (e) {
        var t = (await gLocal(["idleWhitelist"])).idleWhitelist || [];
        t.includes(e) ? toast("Already added", "er") : (t.push(e), await sLocal({
            idleWhitelist: t
        }), $("whitelist-inp").value = "", renderWhitelist(t), toast("Exception added", "ok"))
    }
});

if ($("btn-save-set")) {
    $("btn-save-set").addEventListener("click", async () => {
    try {
        var e = (await gSync(["settings"])).settings || {};
        e.passcodeEnabled = $("tog-pc")?.checked || !1;
        e.funnyBlocked = !1 !== $("tog-fun")?.checked;
        e.tabLimit = parseInt($("tab-limit-input")?.value) || 0;
        e.timeWarningEnabled = !1 !== $("tog-time-warn")?.checked;
        e.timeWarningSecs = parseInt($("time-warn-secs")?.value) || 60;
        e.showBadge = !1 !== $("tog-badge")?.checked;
        e.showIdleBadge = !1 !== $("tog-idle-badge")?.checked;
        e.idleTimeout = parseInt($("idle-timeout-sel")?.value) || 60;
        e.welcomeBackThresh = parseInt($("welcome-back-thresh-sel")?.value) || 10;
        e.maxGapSecs = parseInt($("max-gap-sel")?.value) || 300;
        e.trackMedia = $("tog-media")?.checked || !1;
        e.minVisitSecs = parseInt($("min-visit-sel")?.value) || 0;
        e.trackLocalFiles = $("tog-track-local")?.checked || !1;
        e.dayRolloverHour = parseInt($("day-rollover-sel")?.value) || 0;
        
        let retentionDays = parseInt($("data-retention-sel")?.value);
        e.dataRetentionDays = isNaN(retentionDays) ? 365 : retentionDays;
        e.autoBackupEnabled = $("tog-auto-backup")?.checked || false;

        if (e.passcodeHash) {
            e.lockStop = !1 !== $("lock-stop")?.checked;
            e.lockRules = !1 !== $("lock-rules")?.checked;
            e.lockFreetime = !1 !== $("lock-freetime")?.checked;
            e.lockFocusPresets = !$("lock-focus-presets") || $("lock-focus-presets").checked;
            e.lockFocusScheds = !$("lock-focus-scheds") || $("lock-focus-scheds").checked;
            e.lockDanger = !1 !== $("lock-danger")?.checked;
            e.lockTweaks = !1 !== $("lock-tweaks")?.checked;
            e.lockPrivacy = !1 !== $("lock-privacy")?.checked;
            e.lockAdjustTime = !1 !== $("lock-adjust-time")?.checked;
        }
        await sSync({
            settings: e
        });
        toast("Settings saved", "ok");
        loadExtendedSettings();
        msg("UPDATE_IDLE");
    } catch (err) {
        toast("Error saving settings: " + err.message, "er");
    }
    });
}

$("btn-pin") && $("btn-pin").addEventListener("click", async () => {
    var e = $("pin1").value,
        t = $("pin2").value,
        a = $("pin-msg");
    if (6 !== e.length || !/^\d{6}$/.test(e)) return a.textContent = "PIN must be exactly 6 digits", void (a.style.color = "var(--red)");
    if (e !== t) return a.textContent = "PINs do not match", void (a.style.color = "var(--red)");
    var n = (await gSync(["settings"])).settings || {};
    n.passcodeHash || (n.lockSettings = !1, n.lockStop = !0, n.lockRules = !0, n.lockFreetime = !0, n.lockDanger = !0, n.lockTweaks = !0, n.lockFocusScheds = !0, n.lockFocusPresets = !0, n.lockPrivacy = !0, n.lockAdjustTime = !0), n.passcodeHash = await hashPin(e), n.passcodeEnabled = !0, await sSync({
        settings: n
    }), $("pin1").value = "", $("pin2").value = "", a.textContent = "", toast("PIN saved & active", "ok"), loadExtendedSettings()
}), $("btn-remove-pin") && $("btn-remove-pin").addEventListener("click", async () => {
    if (await showPass(!0, "Verification Required", "Enter current PIN to remove it.")) {
        var e = (await gSync(["settings"])).settings || {};
        e.passcodeHash = null, e.passcodeEnabled = !1, await sSync({
            settings: e
        }), toast("PIN Removed", "ok"), loadExtendedSettings()
    }
}), $("btn-change-pin") && $("btn-change-pin").addEventListener("click", async () => {
    await showPass(!0, "Verification Required", "Enter current PIN to change it.") && ($("pin-manage-box").style.display = "none", $("pin-setup-box").style.display = "flex")
}), $("btn-rst-stats") && $("btn-rst-stats").addEventListener("click", async () => {
    if (!(await promptPinIfEnabled("lockDanger"))) return;
    if (!(await showConfirm("Reset Stats", "Delete ALL statistics? This cannot be undone.", { isDestructive: true, confirmText: "Reset" }))) return;
    await msg("STATS_RESET_ALL");
    await sLocal({ daily: {} });
    toast("Stats reset", "ok");
    loadAnalytics();
}), $("btn-clr-rules") && $("btn-clr-rules").addEventListener("click", async () => {
    if (await promptPinIfEnabled("lockDanger") && await showConfirm("Clear Rules", "Remove all block/allow rules?", { isDestructive: true, confirmText: "Clear" })) {
        rules = [], allowList = [], await sLocal({
            blockRules: [],
            allowList: []
        }), await msg("TRIGGER_DNR_UPDATE"), renderCombined(), toast("Rules cleared", "ok")
    }
}), $("btn-clr-cats") && $("btn-clr-cats").addEventListener("click", async () => {
    if (await promptPinIfEnabled("lockDanger") && await showConfirm("Clear Categories", "Remove all custom categories?", { isDestructive: true, confirmText: "Clear" })) {
        siteCategories = {}, hiddenDefaultSites = [], await sLocal({
            siteCategories: {},
            hiddenDefaultSites: []
        }), renderCategories(), loadAnalytics(), toast("Categories cleared", "ok")
    }
}), $("btn-clear-history") && $("btn-clear-history").addEventListener("click", async () => {
    if (await showConfirm("Clear History", "Clear history?", { isDestructive: true, confirmText: "Clear" })) {
        await msg("CLEAR_FOCUS_HISTORY"), loadFocusHistory(), toast("Cleared", "ok")
    }
});

var _origRF = renderFocus,
    _focusTick = null;

function startSmoothFocusTick(e) {
    if (_focusTick) clearInterval(_focusTick);
    if (!e || !e.active || e.paused || !e.phaseEndsAt) return;
    const i = _favCanvas;
    i.width = 32; i.height = 32;
    const s = i.getContext("2d");
    _focusTick = setInterval(function () {
        var t = Math.max(0, Math.round((e.phaseEndsAt - Date.now()) / 1e3)),
            a = "work" === e.phase,
            n = e.fullDuration || (a ? 1500 : "long_break" === e.phase ? 900 : 300);
        $("frf") && $("frf").setAttribute("stroke-dashoffset", (FCIRC * Math.max(0, 1 - t / n)).toFixed(1)), $("ftb") && ($("ftb").textContent = fmtT(t));
        s.clearRect(0, 0, 32, 32);
        const o = document.documentElement.classList.contains("light");
        s.fillStyle = o ? "#f1f5f9" : "#121212", s.beginPath(), s.arc(16, 16, 16, 0, 2 * Math.PI), s.fill(), s.strokeStyle = "#2E2E2E", s.lineWidth = 4, s.beginPath(), s.arc(16, 16, 12, 0, 2 * Math.PI), s.stroke(), s.strokeStyle = a ? "#05D581" : "#F6B846", s.lineCap = "round", s.beginPath(), s.arc(16, 16, 12, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - t / n)), s.stroke();
        let r = document.getElementById("dynamic-favicon");
        r && (r.href = i.toDataURL()), t <= 0 && (clearInterval(_focusTick), _focusTick = null, setTimeout(async () => {
            var e = await msg("FOCUS_GET_STATE");
            renderFocus(e?.focusState, await getActiveWorkMins()), loadFocusHistory()
        }, 1500))
    }, 1e3);
}
renderFocus = function (e, t) {
    if (_origRF(e, t), e && e.active && !e.paused && e.phaseEndsAt) startSmoothFocusTick(e);
    else {
        _focusTick && (clearInterval(_focusTick), _focusTick = null);
        let e = document.getElementById("dynamic-favicon");
        e && (e.href = "../icons/icon128.png")
    }
}, async function () {
    hideAnalyticsHeader();
    const e = await msg("GET_AUTO_CATEGORIES");
    e && e.autoCategories && (AUTO_CATEGORIES = e.autoCategories), await checkGate();
    // Bug #5 fix: fetch settings once and share with loadSettings
    const _sharedSettings = (await gSync(["settings"])).settings || {};
    await loadSettings(_sharedSettings);

    // Find active tab from hash (default to analytics)
    let initialTab = "analytics";
    const rawHash = window.location.hash.replace("#", "");
    const hashParts = rawHash.split("?");
    const hash = hashParts[0];
    const query = hashParts[1] || "";
    if (["analytics", "focus", "sitemanager", "settings"].includes(hash)) {
        initialTab = hash;
    }

    if (query || window.location.search) {
        const params = new URLSearchParams(window.location.search || query);
        window.__glowPresetId = params.get("preset") || params.get("glow") || "";
    }

    // Programmatically click the navigation button for the active tab to trigger its load sequence
    const navBtn = document.querySelector(`.ni[data-tab="${initialTab}"]`);
    if (navBtn) {
        navBtn.click();
    } else {
        loadAnalytics();
    }
    // FF v6.7: Floating "Save All Settings" button that follows the user when on the Settings tab
    (function initFloatingSave() {
        const _fab = document.createElement("button");
        _fab.id = "floating-save-btn";
        _fab.textContent = "Save All Settings";
        _fab.style.cssText = "display:none;position:fixed;bottom:28px;right:28px;z-index:9000;background:var(--green);color:#000;font-weight:800;font-size:16px;padding:12px 22px;border-radius:14px;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(5,213,129,.4);transition:opacity .2s,transform .2s;font-family:inherit;";
        document.body.appendChild(_fab);
        _fab.addEventListener("click", () => { $("btn-save-set") && $("btn-save-set").click(); });
        // Show only on settings tab
        document.querySelectorAll(".ni[data-tab]").forEach(tab => tab.addEventListener("click", () => {
            _fab.style.display = tab.getAttribute("data-tab") === "settings" ? "block" : "none";
        }));
        if (window.location.hash === "#settings") _fab.style.display = "block";
    })()
}();
// ============================================================
// FF v4.7 — Backup/Restore + Cool-downs wiring
// ============================================================
function switchRuleModalTab(type) {
    document.querySelectorAll(".add-rule-tab").forEach(b => {
        if (b.getAttribute("data-ruletype") === type) b.classList.add("act");
        else b.classList.remove("act");
    });
    document.querySelectorAll(".add-form-pane").forEach(p => p.style.display = "none");
    const pane = document.getElementById(`add-form-${type}`);
    if (pane) pane.style.display = "block";
    if (type === "block") {
        if ($("btn-add-block")) $("btn-add-block").style.display = "block";
        if ($("btn-add-tag-inline")) $("btn-add-tag-inline").style.display = "none";
    } else {
        if ($("btn-add-block")) $("btn-add-block").style.display = "none";
        if ($("btn-add-tag-inline")) $("btn-add-tag-inline").style.display = "block";
    }
}
// Legacy cooldown helpers removed in favor of integrated checkboxes

if ($("btn-export")) $("btn-export").addEventListener("click", async () => {
    const r = await msg("BACKUP_EXPORT");
    if (!r || !r.ok) return toast("Export failed", "err");
    const blob = new Blob([JSON.stringify(r.payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "flow-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded", "ok");
});
if ($("file-import")) $("file-import").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(await showConfirm("Restore Backup", "Restoring will REPLACE all current data. Continue?", { isDestructive: true, confirmText: "Restore" }))) {
        e.target.value = "";
        return;
    }
    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const r = await msg("BACKUP_IMPORT", { payload });
        if (r && r.ok) { toast("Restored — reloading…", "ok"); setTimeout(() => location.reload(), 800); }
        else toast("Restore failed", "err");
    } catch (err) {
        toast("Invalid JSON file", "err");
    }
    e.target.value = "";
});

let isMigrationRunning = false;
if ($("file-migrate-watt")) $("file-migrate-watt").addEventListener("change", async (e) => {
    if (isMigrationRunning) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!(await showConfirm("Import Logs", "This will merge Web Activity Time Tracker logs into Flow's history.\n\nWarning: If you import the same spreadsheet twice, it will add the tracked time twice. Click OK to proceed.", { isDestructive: false, confirmText: "Import" }))) {
        e.target.value = "";
        return;
    }

    isMigrationRunning = true;
    const statusEl = $("migration-status");
    const statusTextEl = $("migration-status-text");
    const progressBarEl = $("migration-progress-bar");

    if (statusEl) statusEl.style.display = "block";
    if (statusTextEl) statusTextEl.textContent = "Reading file...";
    if (progressBarEl) progressBarEl.style.width = "0%";

    try {
        const text = await file.text();
        if (statusTextEl) statusTextEl.textContent = "Parsing CSV data...";

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
            throw new Error("The file is empty or has no rows.");
        }

        const parseCSVLine = (line) => {
            const result = [];
            let cell = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(cell.trim());
                    cell = '';
                } else {
                    cell += char;
                }
            }
            result.push(cell.trim());
            return result;
        };

        const headers = parseCSVLine(lines[0]);
        let dateIdx = -1;
        let siteIdx = -1;
        let timeIdx = -1;

        for (let i = 0; i < headers.length; i++) {
            const h = headers[i].toLowerCase();
            if (h === 'date' || h === 'day') dateIdx = i;
            else if (h === 'website' || h === 'site' || h === 'domain' || h === 'url') siteIdx = i;
            else if (h === 'time(sec)' || h === 'time' || h === 'seconds' || h.includes('sec')) timeIdx = i;
        }

        if (dateIdx === -1) dateIdx = 0;
        if (siteIdx === -1) siteIdx = 1;
        if (timeIdx === -1) timeIdx = 2;

        const grouped = {};
        let skippedRows = 0;
        let totalRows = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cells = parseCSVLine(line);
            if (cells.length <= Math.max(dateIdx, siteIdx, timeIdx)) {
                skippedRows++;
                continue;
            }

            const rawDate = cells[dateIdx];
            const rawSite = cells[siteIdx];
            const rawTime = cells[timeIdx];

            if (!rawDate) { skippedRows++; continue; }
            let parts = rawDate.split(/[\/\-.]/);
            if (parts.length !== 3) {
                skippedRows++;
                continue;
            }

            let m = parseInt(parts[0], 10);
            let d = parseInt(parts[1], 10);
            let y = parseInt(parts[2], 10);

            if (isNaN(m) || isNaN(d) || isNaN(y)) {
                skippedRows++;
                continue;
            }

            if (m > 12 && d <= 12) {
                const temp = m;
                m = d;
                d = temp;
            }

            if (y < 100) {
                y = 2000 + y;
            }

            const dayKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
                skippedRows++;
                continue;
            }

            if (!rawSite) { skippedRows++; continue; }
            let site = rawSite.trim().toLowerCase();

            if (site.startsWith("file:///")) {
                const parts = site.split("/");
                const filename = decodeURIComponent(parts[parts.length - 1] || "local-file");
                site = "local:" + filename.toLowerCase();
            } else {
                site = site.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
            }

            if (!site) {
                skippedRows++;
                continue;
            }

            let secs = parseInt(rawTime, 10);
            if (isNaN(secs) || secs <= 0) {
                skippedRows++;
                continue;
            }

            if (!grouped[dayKey]) grouped[dayKey] = {};
            grouped[dayKey][site] = (grouped[dayKey][site] || 0) + secs;
            totalRows++;
        }

        const dateKeys = Object.keys(grouped);
        if (dateKeys.length === 0) {
            throw new Error("No valid website history rows were found in the file.");
        }

        if (statusTextEl) statusTextEl.textContent = `Merging ${dateKeys.length} days of history...`;

        const batchSize = 50;
        let processed = 0;

        const processBatch = async () => {
            if (processed >= dateKeys.length) {
                if (statusTextEl) statusTextEl.textContent = `Finalizing and reloading...`;
                if (progressBarEl) progressBarEl.style.width = "100%";

                await msg("INVALIDATE_CACHES");

                toast(`Successfully imported ${dateKeys.length} days! Reloading...`, "ok");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            const batchKeys = dateKeys.slice(processed, processed + batchSize);
            const currentDB = await FFDB.getDays(batchKeys);
            const writeMap = {};

            for (const day of batchKeys) {
                const importedSites = grouped[day];
                let entry = currentDB[day];

                if (!entry) {
                    entry = {
                        sites: {},
                        timeline: [],
                        productivity: 0,
                        learning: 0,
                        distraction: 0,
                        communication: 0,
                        uncategorized: 0
                    };
                } else {
                    entry.sites = entry.sites || {};
                    entry.timeline = entry.timeline || [];
                }

                for (const [dom, secs] of Object.entries(importedSites)) {
                    entry.sites[dom] = (entry.sites[dom] || 0) + secs;
                }

                entry.productivity = 0;
                entry.learning = 0;
                entry.distraction = 0;
                entry.communication = 0;
                entry.uncategorized = 0;

                for (const [dom, secs] of Object.entries(entry.sites)) {
                    const cat = getEffectiveCat(dom).cat;
                    entry[cat] = (entry[cat] || 0) + secs;
                }

                writeMap[day] = entry;
            }

            await FFDB.bulkSetDays(writeMap);
            processed += batchKeys.length;

            const percent = Math.round((processed / dateKeys.length) * 100);
            if (progressBarEl) progressBarEl.style.width = `${percent}%`;
            if (statusTextEl) statusTextEl.textContent = `Importing data: Day ${processed} of ${dateKeys.length}...`;

            setTimeout(processBatch, 20);
        };

        await processBatch();

    } catch (err) {
        console.error("[Migration] Error importing CSV file", err);
        if (statusTextEl) setSafeHTML(statusTextEl, `<span style="color:var(--red)">Failed: ${sanitizeDomain(err.message || err)}</span>`);
        toast("Import failed: " + (err.message || "Invalid file"), "er");
        isMigrationRunning = false;
    }

    e.target.value = "";
});

if ($("file-migrate-tt")) $("file-migrate-tt").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!(await showConfirm("Import Logs", "This will merge Time Tracker JSON logs into Flow's history.\n\nWarning: If you import the same JSON file twice, it will add the tracked time twice. Click OK to proceed.", { isDestructive: false, confirmText: "Import" }))) {
        e.target.value = "";
        return;
    }

    if (isMigrationRunning) return;
    isMigrationRunning = true;

    const statusEl = $("migration-status");
    const statusTextEl = $("migration-status-text");
    const progressBarEl = $("migration-progress-bar");

    if (statusEl) statusEl.style.display = "block";
    if (statusTextEl) statusTextEl.textContent = "Reading file...";
    if (progressBarEl) progressBarEl.style.width = "0%";

    try {
        const text = await file.text();
        if (statusTextEl) statusTextEl.textContent = "Parsing JSON data...";

        const payload = JSON.parse(text);
        if (!payload || !Array.isArray(payload.__stat__)) {
            throw new Error("Invalid format. Missing time-tracker list data (__stat__).");
        }

        const stats = payload.__stat__;
        const grouped = {};
        let skippedRows = 0;
        let newtabFiltered = 0;
        let totalRows = 0;

        for (const item of stats) {
            const host = item.host;
            const dateStr = item.date;
            const focusMs = item.focus;

            if (!host || !dateStr || focusMs === undefined) {
                skippedRows++;
                continue;
            }

            let site = host.trim().toLowerCase();
            if (site === "newtab") {
                newtabFiltered++;
                continue;
            }

            site = site.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
            if (!site) {
                skippedRows++;
                continue;
            }

            if (dateStr.length !== 8) {
                skippedRows++;
                continue;
            }

            const y = dateStr.slice(0, 4);
            const m = dateStr.slice(4, 6);
            const d = dateStr.slice(6, 8);
            const dayKey = `${y}-${m}-${d}`;

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
                skippedRows++;
                continue;
            }

            let secs = Math.round(parseInt(focusMs, 10) / 1000);
            if (isNaN(secs) || secs <= 0) {
                skippedRows++;
                continue;
            }

            if (!grouped[dayKey]) grouped[dayKey] = {};
            grouped[dayKey][site] = (grouped[dayKey][site] || 0) + secs;
            totalRows++;
        }

        const dateKeys = Object.keys(grouped);
        if (dateKeys.length === 0) {
            throw new Error("No valid website history entries were found in the file.");
        }

        if (statusTextEl) statusTextEl.textContent = `Merging ${dateKeys.length} days of history...`;

        const batchSize = 50;
        let processed = 0;

        const processBatch = async () => {
            if (processed >= dateKeys.length) {
                if (statusTextEl) statusTextEl.textContent = `Finalizing and reloading...`;
                if (progressBarEl) progressBarEl.style.width = "100%";

                await msg("INVALIDATE_CACHES");

                toast(`Successfully imported ${dateKeys.length} days! Reloading...`, "ok");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            const batchKeys = dateKeys.slice(processed, processed + batchSize);
            const currentDB = await FFDB.getDays(batchKeys);
            const writeMap = {};

            for (const day of batchKeys) {
                const importedSites = grouped[day];
                let entry = currentDB[day];

                if (!entry) {
                    entry = {
                        sites: {},
                        timeline: [],
                        productivity: 0,
                        learning: 0,
                        distraction: 0,
                        communication: 0,
                        uncategorized: 0
                    };
                } else {
                    entry.sites = entry.sites || {};
                    entry.timeline = entry.timeline || [];
                }

                for (const [dom, secs] of Object.entries(importedSites)) {
                    entry.sites[dom] = (entry.sites[dom] || 0) + secs;
                }

                entry.productivity = 0;
                entry.learning = 0;
                entry.distraction = 0;
                entry.communication = 0;
                entry.uncategorized = 0;

                for (const [dom, secs] of Object.entries(entry.sites)) {
                    const cat = getEffectiveCat(dom).cat;
                    entry[cat] = (entry[cat] || 0) + secs;
                }

                writeMap[day] = entry;
            }

            await FFDB.bulkSetDays(writeMap);
            processed += batchKeys.length;

            const percent = Math.round((processed / dateKeys.length) * 100);
            if (progressBarEl) progressBarEl.style.width = `${percent}%`;
            if (statusTextEl) statusTextEl.textContent = `Importing data: Day ${processed} of ${dateKeys.length}...`;

            setTimeout(processBatch, 20);
        };

        await processBatch();

    } catch (err) {
        console.error("[Migration] Error importing JSON file", err);
        if (statusTextEl) setSafeHTML(statusTextEl, `<span style="color:var(--red)">Failed: ${sanitizeDomain(err.message || err)}</span>`);
        toast("Import failed: " + (err.message || "Invalid file"), "er");
        isMigrationRunning = false;
    }

    e.target.value = "";
});

if ($("file-migrate-wt")) $("file-migrate-wt").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!(await showConfirm("Import Logs", "This will merge Webtime Tracker CSV logs into Flow's history.\n\nWarning: If you import the same CSV file twice, it will add the tracked time twice. Click OK to proceed.", { isDestructive: false, confirmText: "Import" }))) {
        e.target.value = "";
        return;
    }

    if (isMigrationRunning) return;
    isMigrationRunning = true;

    const statusEl = $("migration-status");
    const statusTextEl = $("migration-status-text");
    const progressBarEl = $("migration-progress-bar");

    if (statusEl) statusEl.style.display = "block";
    if (statusTextEl) statusTextEl.textContent = "Reading file...";
    if (progressBarEl) progressBarEl.style.width = "0%";

    try {
        const text = await file.text();
        if (statusTextEl) statusTextEl.textContent = "Parsing CSV data...";

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
            throw new Error("The file is empty or has no rows.");
        }

        const parseCSVLine = (line) => {
            const result = [];
            let cell = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(cell.trim());
                    cell = '';
                } else {
                    cell += char;
                }
            }
            result.push(cell.trim());
            return result;
        };

        const headers = parseCSVLine(lines[0]);
        if (headers.length < 2) {
            throw new Error("Invalid CSV format. Missing columns.");
        }

        if (headers[0].toLowerCase() !== "domain") {
            throw new Error("Invalid CSV format. First column must be 'Domain'.");
        }

        // Extract dates and check which column they are in
        const dates = [];
        for (let i = 1; i < headers.length; i++) {
            const rawDate = headers[i].trim();
            if (!rawDate) continue;

            // Check if date is YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                dates.push({ colIndex: i, dayKey: rawDate });
            } else {
                let parts = rawDate.split(/[\/\-.]/);
                if (parts.length === 3) {
                    let m = parseInt(parts[0], 10);
                    let d = parseInt(parts[1], 10);
                    let y = parseInt(parts[2], 10);
                    if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
                        if (m > 12 && d <= 12) {
                            const temp = m; m = d; d = temp;
                        }
                        if (y < 100) y = 2000 + y;
                        const dayKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                        if (/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
                            dates.push({ colIndex: i, dayKey });
                        }
                    }
                }
            }
        }

        if (dates.length === 0) {
            throw new Error("No valid date columns were found in the header row.");
        }

        const grouped = {};
        let skippedRows = 0;
        let totalRows = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cells = parseCSVLine(line);
            if (cells.length < 2) {
                skippedRows++;
                continue;
            }

            const rawSite = cells[0];
            if (!rawSite) {
                skippedRows++;
                continue;
            }

            let site = rawSite.trim().toLowerCase();
            if (site.startsWith("file:///")) {
                const parts = site.split("/");
                const filename = decodeURIComponent(parts[parts.length - 1] || "local-file");
                site = "local:" + filename.toLowerCase();
            } else {
                site = site.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
            }

            if (!site) {
                skippedRows++;
                continue;
            }

            // Loop over dates
            for (const dateObj of dates) {
                const colIndex = dateObj.colIndex;
                const dayKey = dateObj.dayKey;

                if (colIndex >= cells.length) continue;

                const rawTime = cells[colIndex];
                if (!rawTime) continue;

                const secs = parseInt(rawTime, 10);
                if (isNaN(secs) || secs <= 0) continue;

                if (!grouped[dayKey]) grouped[dayKey] = {};
                grouped[dayKey][site] = (grouped[dayKey][site] || 0) + secs;
                totalRows++;
            }
        }

        const dateKeys = Object.keys(grouped);
        if (dateKeys.length === 0) {
            throw new Error("No valid website history entries were found in the CSV file.");
        }

        if (statusTextEl) statusTextEl.textContent = `Merging ${dateKeys.length} days of history...`;

        const batchSize = 50;
        let processed = 0;

        const processBatch = async () => {
            if (processed >= dateKeys.length) {
                if (statusTextEl) statusTextEl.textContent = `Finalizing and reloading...`;
                if (progressBarEl) progressBarEl.style.width = "100%";

                await msg("INVALIDATE_CACHES");

                toast(`Successfully imported ${dateKeys.length} days! Reloading...`, "ok");
                setTimeout(() => location.reload(), 1500);
                return;
            }

            const batchKeys = dateKeys.slice(processed, processed + batchSize);
            const currentDB = await FFDB.getDays(batchKeys);
            const writeMap = {};

            for (const day of batchKeys) {
                const importedSites = grouped[day];
                let entry = currentDB[day];

                if (!entry) {
                    entry = {
                        sites: {},
                        timeline: [],
                        productivity: 0,
                        learning: 0,
                        distraction: 0,
                        communication: 0,
                        uncategorized: 0
                    };
                } else {
                    entry.sites = entry.sites || {};
                    entry.timeline = entry.timeline || [];
                }

                for (const [dom, secs] of Object.entries(importedSites)) {
                    entry.sites[dom] = (entry.sites[dom] || 0) + secs;
                }

                entry.productivity = 0;
                entry.learning = 0;
                entry.distraction = 0;
                entry.communication = 0;
                entry.uncategorized = 0;

                for (const [dom, secs] of Object.entries(entry.sites)) {
                    const cat = getEffectiveCat(dom).cat;
                    entry[cat] = (entry[cat] || 0) + secs;
                }

                writeMap[day] = entry;
            }

            await FFDB.bulkSetDays(writeMap);
            processed += batchKeys.length;

            const percent = Math.round((processed / dateKeys.length) * 100);
            if (progressBarEl) progressBarEl.style.width = `${percent}%`;
            if (statusTextEl) statusTextEl.textContent = `Importing data: Day ${processed} of ${dateKeys.length}...`;

            setTimeout(processBatch, 20);
        };

        await processBatch();

    } catch (err) {
        console.error("[Migration] Error importing Webtime Tracker CSV file", err);
        if (statusTextEl) setSafeHTML(statusTextEl, `<span style="color:var(--red)">Failed: ${sanitizeDomain(err.message || err)}</span>`);
        toast("Import failed: " + (err.message || "Invalid file"), "er");
        isMigrationRunning = false;
    }

    e.target.value = "";
});

// =====================================================================
// FocusFlow v6.12 — Structural UI patch (additive, runs after main init)
//   1. Preset Builder card replaces legacy Work/Break/Long/Cycles inputs
//      in the Focus Mode panel. Inputs arranged 2x2:
//         [ Work Time | Break Time ]
//         [ Long Break | Cycles    ]
//   2. Site Manager split into 3 pill tabs:
//         Smart Presets & Categories | Site List | Advanced Tweaks
//   3. Mid-flight lockdown: Preset Builder is disabled when a focus
//      session is active (focusState.active === true).
//   4. Study Goals card relocated from right column → bottom of left
//      column (under Start Focus card).
// =====================================================================
(function ffV612() {
    "use strict";
    if (window.__ffV612Loaded) return;
    window.__ffV612Loaded = true;

    const $$ = (id) => document.getElementById(id);

    const DEFAULT_PRESETS = [
        { id: "pomodoro", emoji: "🍅", name: "Pomodoro", work: 25, brk: 5, long: 15, longBrk: 15, cycles: 4, strict: false, cats: [], blockCats: [], notify: true, autoStart: true },
        { id: "deep-work", emoji: "🧠", name: "Deep Work", work: 90, brk: 15, long: 30, longBrk: 30, cycles: 2, strict: false, cats: [], blockCats: [], notify: true, autoStart: true },
        { id: "short-sprint", emoji: "⚡", name: "Short Sprint", work: 15, brk: 3, long: 10, longBrk: 10, cycles: 4, strict: false, cats: [], blockCats: [], notify: true, autoStart: true },
        { id: "custom", emoji: "🌊", name: "Flow", work: 25, brk: 5, long: 15, longBrk: 15, cycles: 4, strict: false, cats: [], blockCats: [], notify: true, autoStart: true },
    ];
    const CATS = [
        { v: "distraction", l: "⚡ Distraction" },
        { v: "communication", l: "💬 Communication" },
        { v: "uncategorized", l: "❓ Uncategorized" },
        { v: "productivity", l: "💻 Productivity" },
        { v: "learning", l: "📚 Learning" },
    ];

    async function loadStore() {
        try {
            const localRes = await gSync(["focusPresets"]);
            const syncRes = await gSync(["settings"]);
            const presetsList = localRes.focusPresets;
            const activeId = (syncRes.settings && syncRes.settings.activePresetId) || "pomodoro";
            
            if (Array.isArray(presetsList) && presetsList.length) {
                presetsList.forEach(item => {
                    if (item.autoStart === undefined) item.autoStart = true;
                    if (item.long !== undefined && item.longBrk === undefined) item.longBrk = item.long;
                    if (item.longBrk !== undefined && item.long === undefined) item.long = item.longBrk;
                    if (item.cats !== undefined && item.blockCats === undefined) item.blockCats = item.cats;
                    if (item.blockCats !== undefined && item.cats === undefined) item.cats = item.blockCats;
                    if (item.cats === undefined && item.blockCats === undefined) {
                        item.cats = [];
                        item.blockCats = [];
                    }
                });
                if (!presetsList.some(x => x.id === "custom")) {
                    presetsList.push({ id: "custom", emoji: "🌊", name: "Flow", work: 25, brk: 5, long: 15, longBrk: 15, cycles: 4, strict: false, cats: [], blockCats: [] });
                }
                return { list: presetsList, activeId, editingId: "pomodoro" };
            }
        } catch (_) { }
        return { list: DEFAULT_PRESETS.map((p) => ({ ...p })), activeId: "pomodoro", editingId: "pomodoro" };
    }
    function saveStore(s) {
        syncPresetsToSW(s);
    }

    async function syncPresetsToSW(s) {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            await new Promise(r => chrome.runtime.sendMessage({ type: "PRESETS_SAVE", presets: s.list }, r));
            await new Promise(r => chrome.runtime.sendMessage({ type: "PRESETS_SET_ACTIVE", id: s.activeId }, r));
        }
    }

    // ---------- Preset Builder Redesign ------------------------------
    async function buildPresetBuilder() {
        const store = await loadStore();
        let state = store;



        function renderCards() {
            const switchesEl = $$("preset-quick-switches");
            if (!switchesEl) return;
            setSafeHTML(switchesEl, "");

            state.list.forEach((p) => {
                const isActive = p.id === state.activeId;

                const card = document.createElement("div");
                card.className = "preset-card" + (isActive ? " is-active" : "");
                card.style.cssText = `
          padding: 14px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
          text-align: center;
        `;

                const emojiOrIcon = `<div style="font-size: 24px; margin-bottom: 6px;">${sanitizeDomain(p.emoji || '')}</div>`;

                card.innerHTML = `
          ${emojiOrIcon}
          <div style="font-size: 13px; font-weight: 800; color: var(--tx); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">${sanitizeDomain(p.name || '')}</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--tx2); margin-top: 2px; display: flex; align-items: center; gap: 4px;">${p.work}m · ${p.brk}m · ${p.cycles || 4} <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg></div>
          
          <div class="preset-card-actions" style="display: flex; gap: 8px; margin-top: 10px; width: 100%; justify-content: center;">
            <button class="preset-play-btn" title="Quick Start" style="
              background: var(--green-bg);
              border: 1px solid var(--green-bd);
              color: var(--green);
              width: 28px;
              height: 28px;
              border-radius: 8px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              transition: all 0.2s;
            ">▶</button>
            <button class="preset-edit-btn" title="Edit Settings" style="
              background: var(--bg4);
              border: 1px solid var(--bd2);
              color: var(--tx2);
              width: 28px;
              height: 28px;
              border-radius: 8px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              transition: all 0.2s;
            ">✎</button>
          </div>
        `;

                // Click main card to select
                card.addEventListener("click", (e) => {
                    if (e.target.closest(".preset-card-actions")) return;
                    if (window.__ffV612Locked) return;

                    state.activeId = p.id;
                    saveStore(state);
                    window.__glowPresetId = "";
                    renderAll();

                    syncPresetsToSW(state).then(() => {
                        msg("TRIGGER_DNR_UPDATE");
                        if (typeof loadFocusUI === "function") loadFocusUI();
                        if (typeof toast === "function") toast(`Activated preset: ${p.name}`, "ok");
                    });
                });

                // Click play button to select and start focus
                const playBtn = card.querySelector(".preset-play-btn");
                playBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (window.__ffV612Locked) return;

                    state.activeId = p.id;
                    saveStore(state);
                    window.__glowPresetId = "";
                    renderAll();

                    syncPresetsToSW(state).then(() => {
                        msg("TRIGGER_DNR_UPDATE");

                        if (typeof loadFocusUI === "function") loadFocusUI();

                        const fsBtn = document.getElementById("btn-fs");
                        if (fsBtn) fsBtn.click();
                    });
                });

                // Click edit button to open modal with PIN prompt if enabled
                const editBtn = card.querySelector(".preset-edit-btn");
                if (p.id === window.__glowPresetId) {
                    editBtn.classList.add("glowing-edit-btn");
                }
                editBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (window.__ffV612Locked) return;

                    editBtn.classList.remove("glowing-edit-btn");
                    window.__glowPresetId = "";

                    const ok = await promptPinIfEnabled("lockFocusPresets");
                    if (ok) showEditPresetModal(p.id);
                });

                switchesEl.appendChild(card);
            });
        }

        function showEditPresetModal(presetId) {
            const old = document.getElementById("ff-preset-edit-modal");
            if (old) old.remove();

            const p = state.list.find((x) => x.id === presetId);
            if (!p) return;

            const modalHeaderIcon = `<span style="font-size:24px;">${sanitizeDomain(p.emoji || '')}</span>`;

            const overlay = document.createElement("div");
            overlay.id = "ff-preset-edit-modal";
            overlay.className = "overlay";
            overlay.setAttribute("role", "dialog");
            overlay.setAttribute("aria-modal", "true");
            overlay.setAttribute("aria-labelledby", "ep-title");
            setSafeHTML(overlay, `
        <div class="card" style="width:100%; max-width:460px; padding:0; display:flex; flex-direction:column; max-height:85vh; overflow:hidden; background:var(--bg2); border:1px solid var(--bd);">
          <div style="padding:24px 32px 16px; border-bottom:1px solid var(--bd); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
            <div style="font-size:20px; font-weight:800; color:var(--tx); display:flex; align-items:center; gap:10px;">
              ${modalHeaderIcon}
              <span id="ep-title">Edit Preset</span>
            </div>
            <button id="ep-close" aria-label="Close Edit Preset Modal" style="background:none; border:none; color:var(--tx3); cursor:pointer; padding:4px; display:inline-flex; align-items:center; justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div style="padding:24px 32px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; flex:1;">
            <div class="srow">
              <label for="ep-name" class="slbl">Preset Name</label>
              <input type="text" id="ep-name" class="inp" style="width:100%" value="${sanitizeDomain(p.name || '')}"/>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div class="srow">
                <label for="ep-work" class="slbl">Work Time (min)</label>
                <input type="number" id="ep-work" class="num inp" min="1" max="180" style="width:100%" value="${p.work}"/>
              </div>
              <div class="srow">
                <label for="ep-brk" class="slbl">Break Time (min)</label>
                <input type="number" id="ep-brk" class="num inp" min="0" max="60" style="width:100%" value="${p.brk}"/>
              </div>
              <div class="srow">
                <label for="ep-long" class="slbl">Long Break (min)</label>
                <input type="number" id="ep-long" class="num inp" min="0" max="120" style="width:100%" value="${p.long}"/>
              </div>
              <div class="srow">
                <label for="ep-cyc" class="slbl">Cycles</label>
                <input type="number" id="ep-cyc" class="num inp" min="1" max="12" style="width:100%" value="${p.cycles}"/>
              </div>
            </div>

            <div class="trow" style="padding:16px 0; border-top:none; border-bottom:1px solid var(--bd); margin-top:-10px;">
              <div style="flex:1;">
                <label for="ep-notify" class="tlbl" style="font-size:14px; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  Enable Notifications
                </label>
                <div class="tdesc" style="font-size:12px; color:var(--tx2); margin-top:2px;">Receive push alerts when focus periods or breaks end.</div>
              </div>
              <label class="tog">
                <input type="checkbox" id="ep-notify" ${p.notify !== false ? 'checked' : ''}/>
                <span class="ttrack"></span>
              </label>
            </div>

            <div class="trow" style="padding:16px 0; border-top:none; border-bottom:1px solid var(--bd); margin-top:-10px;">
              <div style="flex:1;">
                <label for="ep-autostart" class="tlbl" style="font-size:14px; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                  Auto-Start Next Cycle
                </label>
                <div class="tdesc" style="font-size:12px; color:var(--tx2); margin-top:2px;">Automatically transition to the next work cycle or break.</div>
              </div>
              <label class="tog">
                <input type="checkbox" id="ep-autostart" ${p.autoStart ? 'checked' : ''}/>
                <span class="ttrack"></span>
              </label>
            </div>

            <div id="ep-cats-section" style="display: block;">
              <div class="slbl" style="margin-bottom:10px;">Categories to Block during focus</div>
              <div id="ep-cats-grid" class="c-checkbox-group" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                ${CATS.map(c => {
                  const checked = (p.cats || p.blockCats || []).includes(c.v);
                  return `
                    <label class="c-checkbox-lbl" style="padding:10px; font-size:13px; font-weight:700; margin:0;">
                      <input type="checkbox" value="${c.v}" ${checked ? 'checked' : ''}/>
                      <span>${c.l}</span>
                    </label>
                  `;
              }).join("")}
              </div>
            </div>
          </div>

          <div style="padding: 16px 32px 24px; border-top: 1px solid var(--bd); display: flex; gap: 12px; justify-content: flex-end; flex-shrink: 0;">
            <button class="bs" id="ep-cancel" style="padding: 10px 20px;">Cancel</button>
            <button class="bp" id="ep-save" style="padding: 10px 20px; font-size: 13px; font-weight: 700;">Save Changes</button>
          </div>
        </div>
      `);
document.body.appendChild(overlay);

            const catsSection = overlay.querySelector("#ep-cats-section");
            overlay.querySelector("#ep-close").addEventListener("click", () => overlay.remove());
            overlay.querySelector("#ep-cancel").addEventListener("click", () => overlay.remove());

            overlay.querySelector("#ep-save").addEventListener("click", async () => {
                const nameVal = overlay.querySelector("#ep-name").value.trim() || p.name;
                const workVal = Math.max(1, Math.min(180, parseInt(overlay.querySelector("#ep-work").value, 10) || 25));
                const brkInputVal = parseInt(overlay.querySelector("#ep-brk").value, 10);
                const brkVal = Math.max(0, Math.min(60, isNaN(brkInputVal) ? 5 : brkInputVal));
                const longInputVal = parseInt(overlay.querySelector("#ep-long").value, 10);
                const longVal = Math.max(0, Math.min(120, isNaN(longInputVal) ? 15 : longInputVal));
                const cycVal = Math.max(1, Math.min(12, parseInt(overlay.querySelector("#ep-cyc").value, 10) || 4));
                const notifyVal = overlay.querySelector("#ep-notify").checked;
                const autoStartVal = overlay.querySelector("#ep-autostart").checked;


                // Gather categories
                const checkedCats = Array.from(overlay.querySelectorAll("#ep-cats-grid input:checked")).map((cb) => cb.value);

                p.name = nameVal;
                p.work = workVal;
                p.brk = brkVal;
                p.long = longVal;
                p.longBrk = longVal;
                p.cycles = cycVal;
                p.notify = notifyVal;
                p.autoStart = autoStartVal;
                p.cats = checkedCats;
                p.blockCats = checkedCats;



                saveStore(state);
                renderAll();

                await syncPresetsToSW(state);

                if (p.id === state.activeId) {
                    msg("TRIGGER_DNR_UPDATE");
                    if (typeof loadFocusUI === "function") loadFocusUI();
                }

                overlay.remove();
                if (typeof toast === "function") toast("Preset saved successfully!", "ok");
            });
        }

        function renderAll() {
            renderCards();
            applyLockUI();
        }

        function applyLockUI() {
            const locked = !!window.__ffV612Locked;
            const switches = $$("preset-quick-switches");
            if (switches) {
                switches.style.opacity = locked ? "0.4" : "";
                switches.style.pointerEvents = locked ? "none" : "";
            }
        }

        window.__ffV612ApplyLock = applyLockUI;
        renderAll();
    }

    // ---------- Move Study Goals to bottom of Start Focus panel -------

    // ---------- Site Manager → 3 pill tabs ---------------------------
    function buildSiteManagerTabs() {
        const sm = $$("tab-sitemanager");
        if (!sm || sm.dataset.ffV612 === "1") return;
        sm.dataset.ffV612 = "1";

        const cards = Array.from(sm.querySelectorAll(":scope > .card"));
        if (cards.length < 2) return;

        const ruleCard = cards[0]; // Rule manager (block/allow)
        const filterCard = cards[1]; // Smart presets + categories

        // Build tab nav
        const nav = document.createElement("div");
        nav.className = "sm-tabs";
        nav.innerHTML = `
      <button type="button" class="sm-tab is-active" data-pane="sites">Site List</button>
      <button type="button" class="sm-tab" data-pane="presets">Smart Presets & Categories</button>
      <button type="button" class="sm-tab" data-pane="tweaks">Advanced Tweaks</button>
    `;
        const ph = sm.querySelector(".ph");
        ph.parentNode.insertBefore(nav, ph.nextSibling);

        // Build panes
        const paneS = document.createElement("div"); paneS.className = "sm-pane is-active"; paneS.id = "sm-pane-sites";
        const paneP = document.createElement("div"); paneP.className = "sm-pane"; paneP.id = "sm-pane-presets";
        const paneT = document.createElement("div"); paneT.className = "sm-pane"; paneT.id = "sm-pane-tweaks";
        sm.appendChild(paneP); sm.appendChild(paneS); sm.appendChild(paneT);

        // Move existing cards: Smart Presets card → presets pane, Rule Manager → sites pane.
        paneP.appendChild(filterCard);
        paneS.appendChild(ruleCard);

        // Tweaks pane gets a host for the granular blocks UI (existing
        // renderGranularBlocksUI() targets #tab-sitemanager — give it a hook).
        paneT.innerHTML = `
      <div class="card">
        <div class="ctit" style="display:flex;align-items:center;gap:8px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;flex-shrink:0;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Advanced Site Tweaks</div>
        <p style="font-size:13px;color:var(--tx2);margin:-12px 0 16px">Hide distracting UI elements on supported sites (YouTube Shorts, Reddit feed, X timeline, etc.).</p>
        <div id="ff-granular-host"></div>
      </div>
    `;

        // Wire tab switching
        nav.querySelectorAll(".sm-tab").forEach((b) => {
            b.addEventListener("click", () => {
                nav.querySelectorAll(".sm-tab").forEach((x) => x.classList.remove("is-active"));
                b.classList.add("is-active");
                sm.querySelectorAll(".sm-pane").forEach((p) => p.classList.remove("is-active"));
                const pane = sm.querySelector("#sm-pane-" + b.dataset.pane);
                if (pane) pane.classList.add("is-active");
            });
        });

        // Re-target existing granular UI: monkey-patch the host.
        if (typeof renderGranularBlocksUI === "function") {
            const orig = renderGranularBlocksUI;
            window.renderGranularBlocksUI = async function () {
                const host = document.getElementById("ff-granular-host");
                if (host && !document.getElementById("granular-ui-wrapper")) {
                    // Trick the original function by giving it a target inside our pane.
                    // Easiest: temporarily move tab-sitemanager's id pointer.
                }
                return orig.apply(this, arguments);
            };
        }
    }

    // ---------- Mid-flight lockdown polling --------------------------
    async function pollFocusState() {
        try {
            const r = await new Promise((res) => {
                try { chrome.runtime.sendMessage({ type: "FOCUS_GET_STATE" }, (x) => { void chrome.runtime.lastError; res(x || null); }); }
                catch (_) { res(null); }
            });
            const active = !!(r && r.focusState && r.focusState.active);
            if (active !== window.__ffV612Locked) {
                window.__ffV612Locked = active;
                if (typeof window.__ffV612ApplyLock === "function") window.__ffV612ApplyLock();
            }
        } catch (_) { }
    }




    function init() {
        // CSP-compliant global fallback for broken favicon images
        document.addEventListener("error", function (e) {
            if (e.target && e.target.tagName === "IMG") {
                if (e.target.dataset.domain || e.target.src.includes("icons.duckduckgo.com") || e.target.src.includes("google.com/s2/favicons")) {
                    if (e.target.src !== window.FALLBACK_ICON) {
                        e.target.src = window.FALLBACK_ICON;
                    }
                }
            }
        }, true);

        buildPresetBuilder();
        buildSiteManagerTabs();
        pollFocusState();
        setInterval(pollFocusState, 2000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        // dashboard.js itself runs after DOMContentLoaded; defer one tick so the
        // main init() finishes wiring legacy listeners first.
        setTimeout(init, 0);
    }
})();

// =====================================================================
// FF v6.16 — formerly dashboard/v613-patch.js, merged in to drop the
// extra <script> file. Original v6.13 notes:
//   1. Site Manager: Advanced Tweaks UI ONLY shows inside its own pane.
//   2. Site Manager: Move "Cool-down Sites" cards
//      from Settings → Site List pane.
//   3. Focus Mode: Clean 2-column responsive grid.
//   4. Preset Builder polish.
// =====================================================================
(function ffV613Inline() {
    "use strict";
    if (window.__ffV613Loaded) return;
    window.__ffV613Loaded = true;

    const css = `
    #tab-focus .focus-layout {
      display: grid !important;
      grid-template-columns: 1.8fr 1fr !important;
      gap: 24px !important;
      align-items: stretch !important;
    }
    #tab-focus .focus-layout > .ff-col {
      display: flex; flex-direction: column; gap: 24px; min-width: 0; height: 100%;
    }
    #tab-focus .focus-layout .card { margin: 0 !important; }
    #tab-focus .focus-layout #history-list { flex: 1; overflow-y: auto; max-height: 350px !important; padding-right: 6px; }
    #tab-focus .focus-layout .ff-history-card {
      flex: 1 !important; height: auto !important; min-height: 320px !important; display: flex; flex-direction: column;
    }
    #tab-focus .focus-layout #focus-allowlist-container {
      max-height: 280px !important; overflow-y: auto; padding-right: 6px;
    }
    #tab-focus .focus-layout #history-list::-webkit-scrollbar,
    #tab-focus .focus-layout #focus-allowlist-container::-webkit-scrollbar { width: 6px; }
    #tab-focus .focus-layout #history-list::-webkit-scrollbar-track,
    #tab-focus .focus-layout #focus-allowlist-container::-webkit-scrollbar-track { background: transparent; }
    #tab-focus .focus-layout #history-list::-webkit-scrollbar-thumb,
    #tab-focus .focus-layout #focus-allowlist-container::-webkit-scrollbar-thumb { background: var(--bd2); border-radius: 10px; }
    @media (max-width: 1024px) {
      #tab-focus .focus-layout { grid-template-columns: 1fr !important; }
    }
    #pb-cards { gap: 14px !important; margin-bottom: 24px !important; }
    .pb-card {
      padding: 18px 16px !important;
      gap: 6px !important;
      border-radius: 16px !important;
      border: 1px solid var(--bd2) !important;
      background: var(--bg3) !important;
      box-shadow: var(--shadow-sm) !important;
    }
    .pb-card:hover:not(:disabled) {
      transform: translateY(-2px) !important;
      border-color: var(--bd3) !important;
      background: var(--bg4) !important;
    }
    .pb-card.is-active {
      border-color: var(--green) !important;
      background: var(--green-bg) !important;
      box-shadow: 0 0 0 1px var(--green-bd), 0 4px 12px rgba(5,213,129,.05) !important;
    }
    .pb-card.is-editing {
      box-shadow: 0 0 0 2px var(--blue) !important;
      border-color: var(--blue) !important;
    }
    .pb-card-emoji { font-size: 26px !important; line-height: 1 !important; margin-bottom: 2px !important; }
    .pb-card-name {
      font-family: 'Manrope', system-ui, sans-serif !important;
      font-weight: 800 !important;
      font-size: 16px !important;
      letter-spacing: -0.02em !important;
      color: var(--tx) !important;
    }
    .pb-card-meta {
      font-family: 'Manrope', system-ui, sans-serif !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: var(--tx2) !important;
      letter-spacing: -0.01em !important;
    }
    .pb-badge {
      padding: 3px 8px !important;
      border-radius: 99px !important;
      font-size: 9px !important;
      font-weight: 800 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
    }
    .pb-badge-active {
      background: var(--green-bg) !important;
      color: var(--green) !important;
      border: 1px solid var(--green-bd) !important;
    }
    .pb-badge-strict {
      background: var(--amber-bg) !important;
      color: var(--amber) !important;
      border: 1px solid var(--amber-bd) !important;
    }
    .pb-editor {
      background: rgba(22, 22, 24, 0.45) !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      border: 1px solid var(--bd) !important;
      border-radius: 18px !important;
      padding: 24px !important;
      gap: 20px !important;
      box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.02) !important;
    }
    .pb-grid { grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
    .pb-field label {
      font-family: 'Manrope', system-ui, sans-serif !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      color: var(--tx3) !important;
      margin-bottom: 6px !important;
    }
    .pb-field .num {
      width: 100% !important;
      background: var(--bg3) !important;
      border: 1px solid var(--bd2) !important;
      border-radius: 12px !important;
      padding: 12px 16px !important;
      color: var(--tx) !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      text-align: center !important;
      font-family: inherit !important;
      transition: var(--trans) !important;
    }
    .pb-field .num:focus {
      border-color: var(--green) !important;
      box-shadow: 0 0 0 3px var(--green-bg) !important;
      background: var(--bg4) !important;
    }
    .pb-strict-row {
      padding-top: 18px !important;
      border-top: 1px solid var(--bd) !important;
    }
    .pb-strict-row .tlbl {
      font-size: 14px !important;
      font-weight: 700 !important;
      color: var(--tx) !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
    .pb-strict-row .tdesc {
      font-size: 12px !important;
      color: var(--tx2) !important;
      line-height: 1.5 !important;
      margin-top: 4px !important;
    }
    .pb-cats-title {
      font-family: 'Manrope', system-ui, sans-serif !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      letter-spacing: 0.08em !important;
      text-transform: uppercase !important;
      color: var(--tx3) !important;
      margin-bottom: 10px !important;
    }
    .pb-cats { gap: 10px !important; }
    .pb-cat-row {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 12px 16px !important;
      border: 1px solid var(--bd) !important;
      background: var(--bg3) !important;
      border-radius: 12px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      color: var(--tx) !important;
      cursor: pointer !important;
      transition: var(--trans) !important;
    }
    .pb-cat-row:hover:not(.is-disabled) {
      border-color: var(--bd3) !important;
      background: var(--bg4) !important;
      transform: translateY(-1px) !important;
    }
    .pb-cat-row:has(input:checked) {
      background: var(--green-bg) !important;
      border-color: var(--green-bd) !important;
      color: var(--green) !important;
    }
    .pb-cat-row input[type="checkbox"] {
      width: 16px !important;
      height: 16px !important;
      accent-color: var(--green) !important;
      cursor: pointer !important;
    }
    .pb-actions { display: flex !important; gap: 12px !important; padding-top: 8px !important; }
    .pb-actions .bp {
      background: var(--green) !important;
      color: #0a0a0a !important;
      font-weight: 800 !important;
      border-radius: 14px !important;
      padding: 14px 20px !important;
      font-size: 14px !important;
      box-shadow: 0 4px 12px rgba(5,213,129,0.15) !important;
      transition: var(--trans) !important;
    }
    .pb-actions .bp:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 16px rgba(5,213,129,0.25) !important;
    }
    .pb-actions .bs {
      background: var(--bg3) !important;
      color: var(--tx) !important;
      border: 1px solid var(--bd2) !important;
      font-weight: 700 !important;
      border-radius: 14px !important;
      padding: 14px 20px !important;
      font-size: 14px !important;
      transition: var(--trans) !important;
    }
    .pb-actions .bs:hover {
      background: var(--bg4) !important;
      border-color: var(--bd3) !important;
      transform: translateY(-2px) !important;
    }
    #tab-sitemanager .sm-pane { display: none !important; }
    #tab-sitemanager .sm-pane.is-active { display: block !important; }
    #tab-sitemanager > #granular-ui-wrapper { display: none !important; }
    #ff-granular-host #granular-blocks-grid {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
    }
    #ff-granular-host > #granular-ui-wrapper > div:first-child { display: none !important; }
    #sm-pane-sites .ff-moved-settings-card { margin-top: 24px; }
    html.light .pb-editor {
      background: rgba(255, 255, 255, 0.75) !important;
      border: 1px solid rgba(0, 0, 0, 0.05) !important;
      box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.6) !important;
    }
  `;
    const style = document.createElement("style");
    style.id = "ff-v613-style";
    style.textContent = css;
    document.head.appendChild(style);

    function fixGranularPlacement() {
        if (typeof window.renderGranularBlocksUI !== "function") return;
        if (window.renderGranularBlocksUI.__ffV613Wrapped) return;
        const orig = window.renderGranularBlocksUI;
        const wrapped = async function () {
            const sm = document.getElementById("tab-sitemanager");
            const host = document.getElementById("ff-granular-host");
            if (!sm || !host) return orig.apply(this, arguments);
            // Temporarily swap ids so the legacy renderer's `insertBefore` lands in our host.
            sm.id = "tab-sitemanager-swap";
            host.id = "tab-sitemanager";
            try {
                await orig.apply(this, arguments);
            } finally {
                const swapBack = document.getElementById("tab-sitemanager");
                if (swapBack) swapBack.id = "ff-granular-host";
                const orig2 = document.getElementById("tab-sitemanager-swap");
                if (orig2) orig2.id = "tab-sitemanager";
            }
            const stray = document.querySelector("#tab-sitemanager > #granular-ui-wrapper");
            if (stray) stray.remove();
        };
        wrapped.__ffV613Wrapped = true;
        window.renderGranularBlocksUI = wrapped;

        const stray = document.querySelector("#tab-sitemanager > #granular-ui-wrapper");
        const host = document.getElementById("ff-granular-host");
        if (stray && host) host.appendChild(stray);
    }

    function moveSettingsCardsToSiteManager() {
        const sitesPane = document.getElementById("sm-pane-sites");
        if (!sitesPane) return;
        if (sitesPane.dataset.ffV613Moved === "1") return;
        const settingsTab = document.getElementById("tab-settings");
        if (!settingsTab) return;
        const allCards = Array.from(settingsTab.querySelectorAll(".card"));
        const cdCard = allCards.find((c) => c.querySelector("#cd-list"));
        [cdCard].forEach((c) => {
            if (!c) return;
            c.classList.add("ff-moved-settings-card");
            sitesPane.appendChild(c);
        });
        sitesPane.dataset.ffV613Moved = "1";
    }

    function runAll() {
        fixGranularPlacement();
        moveSettingsCardsToSiteManager();
    }

    function init() {
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            runAll();
            const done =
                document.querySelector("#tab-focus .focus-layout")?.dataset.ffV613 === "1" &&
                document.getElementById("sm-pane-sites")?.dataset.ffV613Moved === "1";
            if (done || tries > 30) clearInterval(t);
        }, 100);
        document.querySelectorAll('.ni[data-tab="sitemanager"]').forEach((b) => {
            b.addEventListener("click", () => setTimeout(runAll, 50));
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 100);
    }
})();

// =====================================================================
// FF v6.7 — Scheduled Focus Mode
// Each schedule: { id, label, days: [0-6], startTime, endTime, enabled }
// Stored in sync settings.focusSchedules[].
// The service worker checks schedules in tracker_heartbeat and auto-starts
// focus mode when the current time matches an enabled schedule.
// =====================================================================
(function initFocusSchedules() {
    "use strict";
    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    function renderSchedules(schedules) {
        const list = document.getElementById("focus-schedules-list");
        if (!list) return;
        list.innerHTML = "";
        const schedList = schedules || [];
        for (let t = 0; t < 3; t++) {
            const sched = schedList[t];
            const a = document.createElement("div");
            a.className = "free-hour-card";
            a.style.cssText = `
                width: 100%;
                background: var(--bg3);
                border-radius: 12px;
                border: 1px solid var(--bd);
                padding: 0 16px;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                height: 54px;
                position: relative;
                transition: all 0.2s ease;
                box-sizing: border-box;
            `;
            if (!sched) {
                // Empty slot: Add card!
                a.style.borderStyle = "dashed";
                a.style.cursor = "pointer";
                a.style.justifyContent = "center";
                a.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="font-size:18px; color:var(--tx3); font-weight:800;">+</div>
                        <div style="font-size:13px; font-weight:800; color:var(--tx3);">Add Schedule</div>
                    </div>
                `;
                a.addEventListener("mouseover", () => {
                    a.style.borderColor = "var(--green)";
                    a.querySelector("div > div:nth-child(2)").style.color = "var(--green)";
                });
                a.addEventListener("mouseout", () => {
                    a.style.borderColor = "var(--bd)";
                    a.querySelector("div > div:nth-child(2)").style.color = "var(--tx3)";
                });
                a.addEventListener("click", async () => {
                    if (!(await promptPinIfEnabled("lockFocusScheds"))) return;
                    if (typeof openScheduleModal === "function") openScheduleModal(schedList || []);
                });
            } else {
                // Configured slot: Show details!
                const activeDays = sched.days || [];
                const isEveryday = DAY_LABELS.every((d, i) => activeDays.includes(i));
                const isWeekdays = [1,2,3,4,5].every(i => activeDays.includes(i)) && !activeDays.includes(0) && !activeDays.includes(6);
                let daysText = "";
                if (isEveryday) daysText = "Everyday";
                else if (isWeekdays) daysText = "Weekdays";
                else daysText = DAY_LABELS.filter((d, i) => activeDays.includes(i)).map(d => d.substring(0,1)).join(", ");

                setSafeHTML(a, `
                    <div style="display:flex; flex-direction:column; justify-content:center;">
                        <div style="font-size:13px; font-weight:800; color:var(--tx);">${sanitizeDomain(sched.label || "Focus Session")}</div>
                        <div style="font-size:10px; font-weight:700; color:var(--tx2); margin-top:2px; display:flex; gap:6px; align-items:center;">
                            <span>${formatTime12(sched.startTime || "09:00")} - ${formatTime12(sched.endTime || "10:00")}</span>
                            <span style="opacity:0.5">•</span>
                            <span>${daysText}</span>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <label class="tog" style="transform:scale(0.85); transform-origin:right center; margin:0;"><input type="checkbox" class="sched-enabled-cb" data-idx="${t}" ${sched.enabled !== false ? "checked" : ""}><span class="ttrack"></span></label>
                        <button class="preset-edit-btn edit-sched" data-idx="${t}" style="width:24px;height:24px;font-size:11px;background:var(--bg4);border:1px solid var(--bd2);color:var(--tx2);border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                        <button class="preset-edit-btn rm-sched" data-idx="${t}" style="width:24px;height:24px;font-size:11px;background:var(--bg4);border:1px solid var(--bd2);color:var(--tx2);border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
                    </div>
                `);
            }
            list.appendChild(a);
        }

        list.querySelectorAll(".sched-enabled-cb").forEach(cb => {
            cb.addEventListener("change", async () => {
                if (!(await promptPinIfEnabled("lockFocusScheds"))) {
                    cb.checked = !cb.checked;
                    return;
                }
                const sv = (await gSync(["settings"])).settings || {};
                const scheds = sv.focusSchedules || [];
                const i = parseInt(cb.getAttribute("data-idx"));
                if (scheds[i]) {
                    scheds[i].enabled = cb.checked;
                    await sSync({ settings: { ...sv, focusSchedules: scheds } });
                }
            });
        });
        list.querySelectorAll(".edit-sched").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!(await promptPinIfEnabled("lockFocusScheds"))) return;
                const sv = (await gSync(["settings"])).settings || {};
                openScheduleModal(sv.focusSchedules || [], parseInt(btn.getAttribute("data-idx")));
            });
        });
        list.querySelectorAll(".rm-sched").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!(await promptPinIfEnabled("lockFocusScheds"))) return;
                const sv = (await gSync(["settings"])).settings || {};
                const scheds = sv.focusSchedules || [];
                scheds.splice(parseInt(btn.getAttribute("data-idx")), 1);
                await sSync({ settings: { ...sv, focusSchedules: scheds } });
                renderSchedules(scheds);
                if (typeof toast === "function") toast("Schedule deleted", "ok");
            });
        });
    }

    function openScheduleModal(schedules, editIdx = -1) {
        const isEdit = editIdx >= 0;
        const sched = isEdit ? schedules[editIdx] : {};

        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.style.zIndex = "9999";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "nsched-title");
        const schedDays = sched.days || [1, 2, 3, 4, 5];
        const DAY_CBS = DAY_LABELS.map((d, i) =>
            `<label class="nsched-day-lbl" style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:600;cursor:pointer;padding:6px 10px;border:1px solid var(--bd);border-radius:8px;background:var(--bg3)"><input type="checkbox" class="nsched-day" value="${i}" ${schedDays.includes(i) ? "checked" : ""}> ${d}</label>`
        ).join("");
        setSafeHTML(overlay, `
      <div class="card" style="width:100%;max-width:480px;padding:0;display:flex;flex-direction:column;max-height:85vh;overflow:hidden;background:var(--bg2);border:1px solid var(--bd);">
        <div style="padding:24px 32px 16px;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
          <div style="font-size:20px;font-weight:800;color:var(--tx);display:flex;align-items:center;gap:10px;">
            <span>⏰</span>
            <span id="nsched-title">${isEdit ? "Edit" : "Add"} Focus Schedule</span>
          </div>
          <button id="nsched-close" aria-label="Close Schedule Modal" style="background:none;border:none;color:var(--tx3);cursor:pointer;padding:4px;display:inline-flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div style="padding:24px 32px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:20px;">
          <div><label for="nsched-label" class="slbl" style="margin-bottom:6px;display:block">Label</label><input type="text" id="nsched-label" class="inp" placeholder="e.g. Morning Focus" value="${sanitizeDomain(sched.label || "")}" style="width:100%"/></div>
          <div style="display:flex;gap:12px;align-items:center;">
            <div style="flex:1"><label for="nsched-start" class="slbl" style="margin-bottom:6px;display:block">Start</label><input type="time" id="nsched-start" class="inp" value="${sched.startTime || "09:00"}"/></div>
            <div style="flex:1"><label for="nsched-end" class="slbl" style="margin-bottom:6px;display:block">End</label><input type="time" id="nsched-end" class="inp" value="${sched.endTime || "10:00"}"/></div>
          </div>
          <div>
            <label class="slbl" style="margin-bottom:8px;display:block">Active Days</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${DAY_CBS}</div>
          </div>

          <div class="pb-cats-section" id="nsched-cats-sec">
            <div class="pb-cats-title" style="font-size:13px;font-weight:800;color:var(--tx2);text-transform:uppercase;margin-bottom:12px;">Categories to Block</div>
            <div class="pb-cats" id="nsched-cats" style="display:flex;flex-direction:column;gap:12px;">
              <label style="display:flex;align-items:center;gap:16px;cursor:pointer;padding:12px 16px;border:1px solid var(--bd);border-radius:12px;background:var(--bg3)"><input type="checkbox" value="distraction" ${!sched.blockCats || sched.blockCats.includes("distraction") ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--green)"/><span style="font-weight:700;font-size:14px">⚡ Distraction</span></label>
              <label style="display:flex;align-items:center;gap:16px;cursor:pointer;padding:12px 16px;border:1px solid var(--bd);border-radius:12px;background:var(--bg3)"><input type="checkbox" value="communication" ${!sched.blockCats || sched.blockCats.includes("communication") ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--green)"/><span style="font-weight:700;font-size:14px">💬 Communication</span></label>
              <label style="display:flex;align-items:center;gap:16px;cursor:pointer;padding:12px 16px;border:1px solid var(--bd);border-radius:12px;background:var(--bg3)"><input type="checkbox" value="uncategorized" ${!sched.blockCats || sched.blockCats.includes("uncategorized") ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--green)"/><span style="font-weight:700;font-size:14px">❓ Uncategorized</span></label>
            </div>
          </div>
          <div class="pb-strict-row" style="padding-top:16px;border-top:1px solid var(--bd)">
            <div>
              <label for="nsched-notify-time" class="tlbl" style="font-size:14px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--amber); vertical-align:middle; display:inline-block;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg><span>Pre-Schedule Notification</span></label>
              <div class="tdesc">Get notified before the session starts.</div>
            </div>
            <select id="nsched-notify-time" class="inp" style="width:140px;padding:6px 12px">
              <option value="0" ${sched.notifyMinsBefore === 0 ? "selected" : ""}>Disabled</option>
              <option value="1" ${sched.notifyMinsBefore === 1 ? "selected" : ""}>1 min before</option>
              <option value="5" ${(sched.notifyMinsBefore === undefined || sched.notifyMinsBefore === 5) ? "selected" : ""}>5 mins before</option>
              <option value="10" ${sched.notifyMinsBefore === 10 ? "selected" : ""}>10 mins before</option>
              <option value="15" ${sched.notifyMinsBefore === 15 ? "selected" : ""}>15 mins before</option>
            </select>
          </div>
        </div>
        <div style="padding:16px 32px 24px;border-top:1px solid var(--bd);display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;">
          <button class="bs" id="nsched-cancel">Cancel</button>
          <button class="bp" id="nsched-save">${isEdit ? "Save Changes" : "Add Schedule"}</button>
        </div>
      </div>
    `);
document.body.appendChild(overlay);

        const catsSec = overlay.querySelector("#nsched-cats-sec");
        const catsInputs = catsSec.querySelectorAll("input");

        document.getElementById("nsched-cancel").addEventListener("click", () => overlay.remove());
        document.getElementById("nsched-close").addEventListener("click", () => overlay.remove());
        document.getElementById("nsched-save").addEventListener("click", async () => {
            const label = document.getElementById("nsched-label").value.trim() || "Focus Session";
            const startTime = document.getElementById("nsched-start").value;
            const endTime = document.getElementById("nsched-end").value;
            const days = Array.from(overlay.querySelectorAll(".nsched-day:checked")).map(cb => parseInt(cb.value));
            if (!days.length) { if (typeof toast === "function") toast("Select at least one day", "er"); return; }
            const strict = false;
            const cats = Array.from(overlay.querySelectorAll("#nsched-cats input:checked")).map(cb => cb.value);
            const notify = parseInt(document.getElementById("nsched-notify-time").value) || 0;
            const sv = (await gSync(["settings"])).settings || {};
            const scheds = sv.focusSchedules || [];
            if (isEdit) {
                scheds[editIdx] = { ...scheds[editIdx], label, days, startTime, endTime, strict, blockCats: cats, notifyMinsBefore: notify };
            } else {
                scheds.push({ id: uid(), label, days, startTime, endTime, enabled: true, strict, blockCats: cats, notifyMinsBefore: notify });
            }

            await sSync({ settings: { ...sv, focusSchedules: scheds } });
            overlay.remove();
            renderSchedules(scheds);
            if (typeof toast === "function") toast(isEdit ? "Schedule updated" : "Schedule added", "ok");
        });

    }

    async function init() {
        const sv = (await gSync(["settings"])).settings || {};
        renderSchedules(sv.focusSchedules || []);
        const addBtn = document.getElementById("btn-add-schedule") || document.getElementById("btn-add-sched-shortcut");
        if (addBtn) {
            addBtn.addEventListener("click", async () => {
                if (!(await promptPinIfEnabled("lockFocusScheds"))) return;
                const sv2 = (await gSync(["settings"])).settings || {};
                // FF v6.8: 3-schedule cap
                if ((sv2.focusSchedules || []).length >= 3) { if (typeof toast === "function") toast("You can only have 3 focus schedules.", "er"); return; }
                openScheduleModal(sv2.focusSchedules || []);
            });
        }


    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 200);
    }

    // --- Unified Modal Logic ---
    const addRuleModal = document.getElementById("add-rule-modal");
    const btnOpenAddModal = document.getElementById("btn-open-add-modal");
    const btnOpenTagModal = document.getElementById("btn-open-tag-modal");
    const btnCloseAddModal = document.getElementById("btn-close-add-modal");

    if (addRuleModal && btnOpenAddModal) {
        btnOpenAddModal.addEventListener("click", async () => {
            if (!await promptPinIfEnabled("lockRules")) return;
            const qDomain = $("quick-domain") ? $("quick-domain").value.trim() : "";
            const qRedir = $("quick-redir") ? $("quick-redir").value.trim() : "";
            if ($("m-id")) $("m-id").value = "";
            if ($("cat-inp")) $("cat-inp").value = qDomain;
            if ($("cat-redir")) $("cat-redir").value = qRedir;
            if ($("cd-inp-domain")) $("cd-inp-domain").value = qDomain;
            if ($("mon-inp-domain")) $("mon-inp-domain").value = qDomain;
            if ($("btn-add-block")) $("btn-add-block").textContent = "Add Block Rule";
            if ($("add-rule-modal-title")) $("add-rule-modal-title").textContent = "Add Block Rule";
            if (typeof switchRuleModalTab === "function") switchRuleModalTab("block");
            addRuleModal.classList.remove("hide");

            if ($("quick-domain")) $("quick-domain").value = "";
            if ($("quick-redir")) $("quick-redir").value = "";
        });
    }
    if (addRuleModal && btnOpenTagModal) {
        btnOpenTagModal.addEventListener("click", async () => {
            if (!await promptPinIfEnabled("lockRules")) return;
            if ($("m-id")) $("m-id").value = "";
            if ($("cat-inp")) $("cat-inp").value = "";
            if ($("cat-redir")) $("cat-redir").value = "";
            if ($("cd-inp-domain")) $("cd-inp-domain").value = "";
            if ($("mon-inp-domain")) $("mon-inp-domain").value = "";
            if ($("add-rule-modal-title")) $("add-rule-modal-title").textContent = "Track / Label Site";
            if (typeof switchRuleModalTab === "function") switchRuleModalTab("monitor");
            addRuleModal.classList.remove("hide");
        });
    }
    if (addRuleModal) {
        if (btnCloseAddModal) btnCloseAddModal.addEventListener("click", () => addRuleModal.classList.add("hide"));
        const btnCancelRule = document.getElementById("btn-cancel-rule");
        if (btnCancelRule) btnCancelRule.addEventListener("click", () => addRuleModal.classList.add("hide"));
    }

    document.querySelectorAll(".add-rule-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".add-rule-tab").forEach(b => b.classList.remove("act"));
            document.querySelectorAll(".add-form-pane").forEach(p => p.style.display = "none");
            btn.classList.add("act");
            const type = btn.getAttribute("data-ruletype");
            const pane = document.getElementById(`add-form-${type}`);
            if (pane) pane.style.display = "block";
            if (type === "block") {
                if ($("btn-add-block")) $("btn-add-block").style.display = "block";
                if ($("btn-add-tag-inline")) $("btn-add-tag-inline").style.display = "none";
            } else {
                if ($("btn-add-block")) $("btn-add-block").style.display = "none";
                if ($("btn-add-tag-inline")) $("btn-add-tag-inline").style.display = "block";
            }
        });
    });

    window.openAddOrEditModal = async function(domain) {
        if (await promptPinIfEnabled("lockRules")) {
            const rule = rules.find(r => r.domain === domain);
            if (rule) {
                openModal(rule.id);
            } else {
                if ($("m-id")) $("m-id").value = "";
                if ($("cat-inp")) $("cat-inp").value = domain;
                if ($("btn-add-block")) $("btn-add-block").textContent = "Add Block Rule";
                if ($("add-rule-modal-title")) $("add-rule-modal-title").textContent = "Add Block Rule";
                if (typeof switchRuleModalTab === "function") switchRuleModalTab("block");
                const modal = $("add-rule-modal");
                if (modal) modal.classList.remove("hide");
            }
        }
    };

    // FF v6.7.0: Search wiring for Rules list (Problem 19)
    const _rulesSearchEl = document.getElementById("rules-search");
    if (_rulesSearchEl) {
        let _rsDebounce = null;
        _rulesSearchEl.addEventListener("input", () => {
            clearTimeout(_rsDebounce);
            _rsDebounce = setTimeout(() => {
                const q = _rulesSearchEl.value.toLowerCase().trim();
                const list = document.getElementById("combined-list");
                if (!list) return;
                list.querySelectorAll(".brow").forEach(row => {
                    const dom = row.querySelector(".dom");
                    const text = (dom ? dom.textContent : "").toLowerCase();
                    row.style.display = (!q || text.includes(q)) ? "" : "none";
                });
            }, 150);
        });
    }

    // FF v6.7.0: Search wiring for Top Sites (Problem 19)
    const _tsSearchEl = document.getElementById("top-sites-search");
    if (_tsSearchEl) {
        let _tsDebounce = null;
        _tsSearchEl.addEventListener("input", () => {
            clearTimeout(_tsDebounce);
            _tsDebounce = setTimeout(() => {
                const q = _tsSearchEl.value.toLowerCase().trim();
                const container = document.getElementById("top-sites");
                if (!container) return;
                container.querySelectorAll(".siterow").forEach(row => {
                    const dom = row.querySelector(".dom, .sitedom");
                    const text = (dom ? dom.textContent : "").toLowerCase();
                    row.style.display = (!q || text.includes(q)) ? "" : "none";
                });
            }, 150);
        });
    }

    // Search wiring for Category sites
    const _catSearchEl = document.getElementById("cat-sites-search");
    if (_catSearchEl) {
        let _csDebounce = null;
        _catSearchEl.addEventListener("input", () => {
            clearTimeout(_csDebounce);
            _csDebounce = setTimeout(() => {
                renderCategories();
            }, 150);
        });
    }

    // ---------- Rule Manager Sub-Tabs Wiring ----------
    window.activeRuleTab = "block";
    document.querySelectorAll(".rule-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".rule-tab").forEach(b => b.classList.remove("act"));
            btn.classList.add("act");
            window.activeRuleTab = btn.getAttribute("data-ruletab");
            
            // Toggle form views
            if ($("rule-form-block")) $("rule-form-block").style.display = window.activeRuleTab === "block" ? "flex" : "none";
            if ($("rule-form-allow")) $("rule-form-allow").style.display = window.activeRuleTab === "allow" ? "flex" : "none";
            if ($("rule-form-never")) $("rule-form-never").style.display = window.activeRuleTab === "never" ? "flex" : "none";
            
            // Toggle tip visibility
            const sm = $("tab-sitemanager");
            if (sm) {
                const tipEl = sm.querySelector(".card p[style*='font-weight:600']");
                if (tipEl) {
                    tipEl.style.display = window.activeRuleTab === "block" ? "block" : "none";
                }
            }
            
            // Clear search input and trigger search filter
            const rulesSearchEl = $("rules-search");
            if (rulesSearchEl) {
                rulesSearchEl.value = "";
                rulesSearchEl.placeholder = window.activeRuleTab === "block" ? "Search blocked sites…" : (window.activeRuleTab === "allow" ? "Search allowed sites…" : "Search ignored sites…");
            }
            
            renderCombined();
        });
    });

    // --- Bulk Edit Shared wiring ---
    const triggerBulkEdit = async () => {
        await promptPinIfEnabled("lockRules") && (isBulkMode = !0, bulkSelected.clear(), document.querySelectorAll("#btn-bulk-edit, .btn-bulk-edit-shared").forEach(btn => btn.style.display = "none"), $("bulk-actions").style.display = "flex", renderCombined());
    };
    document.querySelectorAll(".btn-bulk-edit-shared").forEach(btn => btn.addEventListener("click", triggerBulkEdit));

    // --- Allowlist Quick Add ---
    $("btn-add-allow-rule") && $("btn-add-allow-rule").addEventListener("click", async () => {
        if (!await promptPinIfEnabled("lockRules")) return;
        const input = $("allow-domain-input");
        const val = input.value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
        if (!val) {
            toast("Please enter a domain", "warn");
            return;
        }
        if (!val.includes(".") || val.length < 4) {
            toast("Please enter a valid domain", "warn");
            return;
        }
        
        let t = await gLocal(["allowList"]);
        let list = t.allowList || [];
        if (list.includes(val)) {
            toast("Domain already allowed", "warn");
            return;
        }
        list.push(val);
        allowList = list;
        await sLocal({ allowList });
        input.value = "";
        renderCombined();
        toast("Added to Allowlist", "ok");
    });

    // --- Never Track Quick Add ---
    $("never-track-add-btn") && $("never-track-add-btn").addEventListener("click", async () => {
        const input = $("never-track-input");
        const val = input.value.trim();
        if (!val) {
            toast("Please enter a domain", "warn");
            return;
        }
        
        // Split on commas or whitespace/newlines
        const domains = val.split(/[,\s]+/)
            .map(d => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])
            .filter(d => d && d.includes(".") && d.length > 3);
            
        if (domains.length === 0) {
            toast("Please enter valid domain(s)", "warn");
            return;
        }
        
        let t = await gLocal(["neverTrackDomains"]);
        let list = t.neverTrackDomains || [];
        let addedCount = 0;
        domains.forEach(d => {
            if (!list.includes(d)) {
                list.push(d);
                addedCount++;
            }
        });
        
        if (addedCount > 0) {
            neverTrackDomains = list;
            await sLocal({ neverTrackDomains: list });
            input.value = "";
            renderCombined();
            toast(`Added ${addedCount} domain(s) to Never-Track`, "ok");
        } else {
            toast("Domains already in list", "warn");
        }
    });

    // --- Privacy Mode Dashboard Integration ---
    var _dashboardPrivacyCountdownTick = null;

    window.updateDashboardPrivacyUI = async function() {
        const btnPrivacy = $("btn-dashboard-privacy");
        const statusPrivacy = $("dashboard-privacy-status");
        if (!btnPrivacy) return;

        const state = await msg("GET_PRIVACY_STATE");
        const fs = await msg("FOCUS_GET_STATE");
        const focusActive = !!(fs && fs.focusState && fs.focusState.active);

        if (focusActive) {
            btnPrivacy.style.opacity = "0.3";
            btnPrivacy.style.cursor = "not-allowed";
            btnPrivacy.title = "Privacy Mode (disabled during Focus Mode)";
        } else {
            btnPrivacy.style.opacity = "";
            btnPrivacy.style.cursor = "";
            btnPrivacy.title = "Privacy Mode / Pause Tracking";
        }

        if (state && state.active) {
            btnPrivacy.classList.add("active");
            if (statusPrivacy) {
                statusPrivacy.classList.remove("hide");
            }
            
            if (state.until > 0) {
                if (_dashboardPrivacyCountdownTick) clearInterval(_dashboardPrivacyCountdownTick);
                const tick = () => {
                    const diff = state.until - Date.now();
                    if (diff <= 0) {
                        clearInterval(_dashboardPrivacyCountdownTick);
                        _dashboardPrivacyCountdownTick = null;
                        window.updateDashboardPrivacyUI();
                    } else {
                        const m = Math.floor(diff / 60000);
                        const s = Math.floor((diff % 60000) / 1000);
                        if (statusPrivacy) {
                            statusPrivacy.textContent = `Paused: ${m}m ${String(s).padStart(2, '0')}s`;
                        }
                    }
                };
                tick();
                _dashboardPrivacyCountdownTick = setInterval(tick, 1000);
            } else {
                if (_dashboardPrivacyCountdownTick) {
                    clearInterval(_dashboardPrivacyCountdownTick);
                    _dashboardPrivacyCountdownTick = null;
                }
                if (statusPrivacy) {
                    statusPrivacy.textContent = "Paused (Always)";
                }
            }
        } else {
            btnPrivacy.classList.remove("active");
            if (statusPrivacy) {
                statusPrivacy.classList.add("hide");
            }
            if (_dashboardPrivacyCountdownTick) {
                clearInterval(_dashboardPrivacyCountdownTick);
                _dashboardPrivacyCountdownTick = null;
            }
        }
    };

    async function initDashboardPrivacy() {
        const btnPrivacy = $("btn-dashboard-privacy");
        const modal = $("privacy-modal");
        const modalClose = $("privacy-modal-close");
        const modalCancel = $("btn-dash-privacy-cancel");

        if (btnPrivacy) {
            btnPrivacy.addEventListener("click", async () => {
                const fs = await msg("FOCUS_GET_STATE");
                if (fs && fs.focusState && fs.focusState.active) {
                    toast("Privacy Mode cannot be enabled during Focus Mode", "er");
                    return;
                }

                const state = await msg("GET_PRIVACY_STATE");
                if (state && state.active) {
                    if (!await promptPinIfEnabled("lockPrivacy")) return;
                    await msg("STOP_PRIVACY_MODE");
                    window.updateDashboardPrivacyUI();
                    toast("Tracking resumed", "ok");
                } else {
                    if (!await promptPinIfEnabled("lockPrivacy")) return;
                    modal && modal.classList.remove("hide");
                }
            });
        }

        if (modalClose) {
            modalClose.addEventListener("click", () => {
                modal && modal.classList.add("hide");
            });
        }

        if (modalCancel) {
            modalCancel.addEventListener("click", () => {
                modal && modal.classList.add("hide");
            });
        }

        const startPrivacy = async (mins) => {
            await msg("START_PRIVACY_MODE", { duration: mins });
            modal && modal.classList.add("hide");
            window.updateDashboardPrivacyUI();
            toast("Privacy Mode enabled", "ok");
        };

        $("btn-dash-privacy-30") && $("btn-dash-privacy-30").addEventListener("click", () => startPrivacy(30));
        $("btn-dash-privacy-60") && $("btn-dash-privacy-60").addEventListener("click", () => startPrivacy(60));
        $("btn-dash-privacy-always") && $("btn-dash-privacy-always").addEventListener("click", () => startPrivacy(0));

        window.updateDashboardPrivacyUI();
    }

    async function renderLocalBackupsList() {
        const listContainer = $("local-backups-list");
        if (!listContainer) return;
        
        const res = await msg("BACKUP_LIST_GET");
        if (!res || !res.list) {
            listContainer.innerHTML = '<div style="font-size:13px;color:var(--tx3);text-align:center;padding:12px 0;">Failed to load backup list.</div>';
            return;
        }
        
        if (res.list.length === 0) {
            listContainer.innerHTML = '<div style="font-size:13px;color:var(--tx3);text-align:center;padding:24px 0;">No backups created yet.</div>';
            return;
        }
        
        const sorted = res.list.sort((a, b) => b.timestamp - a.timestamp);
        listContainer.innerHTML = "";
        
        sorted.forEach(backup => {
            const row = document.createElement("div");
            row.className = "trow";
            row.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-top:1px solid var(--bd); gap:16px;";
            
            let sizeStr = "0 B";
            if (backup.size > 1024 * 1024) {
                sizeStr = (backup.size / (1024 * 1024)).toFixed(2) + " MB";
            } else if (backup.size > 1024) {
                sizeStr = (backup.size / 1024).toFixed(2) + " KB";
            } else {
                sizeStr = backup.size + " B";
            }
            
            const dateStr = new Date(backup.timestamp).toLocaleString(undefined, {
                month: "short", day: "numeric", year: "numeric",
                hour: "numeric", minute: "2-digit"
            });
            
            setSafeHTML(row, `
                <div style="display:flex; align-items:center; gap:12px;">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green); flex-shrink:0;">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <div>
                        <div style="font-size:14px; font-weight:700; color:var(--tx);">${backup.label}</div>
                        <div style="font-size:12px; color:var(--tx3); margin-top:2px;">${dateStr} &bull; ${sizeStr}</div>
                    </div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="bs btn-restore-backup" data-id="${backup.id}" title="Restore this backup" aria-label="Restore this backup" style="padding:6px 12px; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                        Restore
                    </button>
                    <button class="bs btn-download-backup" data-id="${backup.id}" title="Download JSON file" aria-label="Download JSON file" style="padding:6px; display:inline-flex; align-items:center; justify-content:center;">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                    <button class="bs-danger btn-delete-backup" data-id="${backup.id}" title="Delete this backup" aria-label="Delete this backup" style="padding:6px; display:inline-flex; align-items:center; justify-content:center;">
                        <svg viewBox="0 0 24 24" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `);
listContainer.appendChild(row);
        });
        
        listContainer.querySelectorAll(".btn-restore-backup").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                if (await showConfirm("Restore Backup", "Restoring will REPLACE all current data. Continue?", { isDestructive: true, confirmText: "Restore" })) {
                    const res = await msg("BACKUP_RESTORE_LOCAL", { id });
                    if (res && res.ok) {
                        toast("Backup restored — reloading...", "ok");
                        setTimeout(() => location.reload(), 1000);
                    } else {
                        toast("Restore failed", "er");
                    }
                }
            });
        });
        
        listContainer.querySelectorAll(".btn-download-backup").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const payload = await FFDB.getLocalBackupData(id);
                if (payload) {
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `FocusFlow_Backup_${id}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast("Download started", "ok");
                } else {
                    toast("Failed to download data", "er");
                }
            });
        });
        
        listContainer.querySelectorAll(".btn-delete-backup").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                if (await showConfirm("Delete Backup", "Permanently delete this backup from history?", { isDestructive: true, confirmText: "Delete" })) {
                    const res = await msg("BACKUP_DELETE_LOCAL", { id });
                    if (res && res.ok) {
                        toast("Backup deleted", "ok");
                        renderLocalBackupsList();
                    } else {
                        toast("Delete failed", "er");
                    }
                }
            });
        });
    }

    window.renderLocalBackupsList = renderLocalBackupsList;

    const btnCreateLocalBackup = $("btn-create-local-backup");
    if (btnCreateLocalBackup) {
        btnCreateLocalBackup.addEventListener("click", async () => {
            btnCreateLocalBackup.disabled = true;
            btnCreateLocalBackup.textContent = "Creating...";
            const res = await msg("BACKUP_CREATE_LOCAL", { label: "Manual Backup" });
            btnCreateLocalBackup.disabled = false;
            btnCreateLocalBackup.textContent = "+ Create Local Backup";
            if (res && res.ok) {
                toast("Local backup created", "ok");
                renderLocalBackupsList();
            } else {
                toast("Backup creation failed", "er");
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDashboardPrivacy);
    } else {
        setTimeout(initDashboardPrivacy, 300);
    }

})();

(function initBlockPresets() {
    "use strict";

    const $ = (id) => document.getElementById(id);

    // --- Block Presets Code ---
    let blockPresetsList = [];

    async function loadAndRenderPresets() {
        const local = await gLocal(["blockPresets"]);
        blockPresetsList = local.blockPresets || [];
        renderPresetsList();
        populateApplyDropdown();
    }

    function renderPresetsList() {
        const container = $("quick-presets-container");
        if (!container) return;
        setSafeHTML(container, "");

        for (let i = 0; i < 3; i++) {
            const p = blockPresetsList[i];
            const slot = document.createElement("div");
            if (!p) {
                // Empty slot: render dashed button
                slot.className = "quick-preset-slot empty";
                slot.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    height: 38px;
                    min-width: 140px;
                    background: none;
                    border: 1px dashed var(--bd);
                    border-radius: 8px;
                    padding: 0 12px;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--tx3);
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                    box-sizing: border-box;
                `;
                setSafeHTML(slot, `+ Preset`);
// Add hover style changes
                slot.addEventListener("mouseover", () => {
                    slot.style.borderColor = "var(--green)";
                    slot.style.color = "var(--green)";
                });
                slot.addEventListener("mouseout", () => {
                    slot.style.borderColor = "var(--bd)";
                    slot.style.color = "var(--tx3)";
                });
                
                slot.addEventListener("click", () => {
                    window.__editingSlotIdx = i;
                    openPresetModal(null);
                });
            } else {
                // Filled slot: render preset name, edit and delete buttons
                slot.className = "quick-preset-slot filled";
                slot.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    height: 38px;
                    background: var(--bg3);
                    border: 1px solid var(--bd);
                    border-radius: 8px;
                    padding: 0 10px 0 12px;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--tx);
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                    position: relative;
                    min-width: 140px;
                    box-sizing: border-box;
                `;
                setSafeHTML(slot, `
                    <span class="preset-name-text" style="max-width: 95px; overflow: hidden; text-overflow: ellipsis; display: inline-block;">${escHTML(p.name)}</span>
                    <div class="preset-slot-actions" style="display: flex; gap: 4px; align-items: center;">
                        <button class="edit-preset-slot-btn" title="Edit" aria-label="Edit block preset slot" style="background: none; border: none; color: var(--tx2); cursor: pointer; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; padding: 2px;">✎</button>
                        <button class="delete-preset-slot-btn" title="Delete" aria-label="Delete block preset slot" style="background: none; border: none; color: var(--red); cursor: pointer; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; padding: 2px;">✕</button>
                    </div>
                `);
// Add hover style changes
                slot.addEventListener("mouseover", () => {
                    slot.style.borderColor = "var(--tx2)";
                });
                slot.addEventListener("mouseout", () => {
                    slot.style.borderColor = "var(--bd)";
                });
                
                // Click the slot itself -> Instant Block if Domain input is filled!
                slot.addEventListener("click", async (e) => {
                    if (e.target.closest(".edit-preset-slot-btn") || e.target.closest(".delete-preset-slot-btn")) {
                        return;
                    }
                    
                    const domInput = $("quick-domain");
                    const domainVal = domInput ? domInput.value.trim() : "";
                    if (!domainVal) {
                        toast("Enter a domain name first to block instantly", "er");
                        return;
                    }
                    
                    if (await promptPinIfEnabled("lockRules")) {
                        let { allowList = [] } = await gLocal(["allowList"]);
                        const sanitizedDom = sanitizeDomain(domainVal);
                        if (allowList.includes(sanitizedDom)) {
                            allowList = allowList.filter(x => x !== sanitizedDom);
                            await sLocal({ allowList });
                        }
                        
                        const c = p.config || {};
                        const newRule = {
                            id: Math.random().toString(36).substring(2, 9),
                            domain: sanitizedDom,
                            category: getEffectiveCat(sanitizedDom).cat || "distraction",
                            redirectUrl: c.redirectUrl || null,
                            instantBlock: !!c.instantBlock,
                            focusOnly: !!c.focusOnly,
                            timeLimitEnabled: !!c.timeLimitEnabled,
                            dailyLimitSecs: Number(c.dailyLimitSecs) || 0,
                            scheduleEnabled: !!c.scheduleEnabled,
                            schedules: c.schedules || [],
                            sessionLimitEnabled: !!c.sessionLimitEnabled,
                            sessionLimitSecs: Number(c.sessionLimitSecs) || 300,
                            sessionCooldownSecs: Number(c.sessionCooldownSecs) || 600,
                            cooldownEnabled: !!c.cooldownEnabled,
                            cooldownTimer: Number(c.cooldownTimer) || 10,
                            cooldownFrequency: c.cooldownFrequency || "always",
                            activeDays: c.activeDays !== undefined ? c.activeDays : [0, 1, 2, 3, 4, 5, 6]
                        };
                        
                        let { blockRules = [] } = await gLocal(["blockRules"]);
                        blockRules.push(newRule);
                        await sLocal({ blockRules });
                        await msg("TRIGGER_DNR_UPDATE");
                        
                        domInput.value = "";
                        const redirInput = $("quick-redir");
                        if (redirInput) redirInput.value = "";
                        
                        await loadRules();
                        await renderCombined();
                        toast("Site blocked under " + p.name, "ok");
                    }
                });
                
                // Wire Edit button
                slot.querySelector(".edit-preset-slot-btn").addEventListener("click", (e) => {
                    e.stopPropagation();
                    window.__editingSlotIdx = i;
                    openPresetModal(p.id);
                });
                
                // Wire Delete button
                slot.querySelector(".delete-preset-slot-btn").addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (await showConfirm("Delete Preset", `Are you sure you want to delete preset "${p.name}"?`, { isDestructive: true, confirmText: "Delete" })) {
                        blockPresetsList[i] = null;
                        blockPresetsList = blockPresetsList.filter(x => x !== null);
                        await sLocal({ blockPresets: blockPresetsList });
                        await loadAndRenderPresets();
                        toast("Preset deleted", "ok");
                    }
                });
            }
            container.appendChild(slot);
        }
    }

    function populateApplyDropdown() {
        const select = $("m-apply-preset");
        if (!select) return;
        
        const val = select.value;
        setSafeHTML(select, '<option value="">-- Select a Preset to Apply --</option>');
        blockPresetsList.forEach(p => {
            if (p) {
                const opt = document.createElement("option");
                opt.value = p.id;
                opt.textContent = p.name;
                select.appendChild(opt);
            }
        });
        select.value = val;
    }

    // Modal Helpers
    function openPresetModal(id) {
        const modal = $("add-preset-modal");
        if (!modal) return;

        const p = blockPresetsList.find(x => x.id === id);
        if (p) {
            $("p-id").value = p.id;
            $("p-preset-name").value = p.name;
            $("p-preset-name").disabled = false;
            
            const c = p.config || {};
            $("p-mode-focus").checked = !!c.focusOnly;
            $("p-mode-limit").checked = !!c.timeLimitEnabled || !!c.instantBlock;
            $("p-lim").value = c.instantBlock ? 0 : Math.round((c.dailyLimitSecs || 1800)/60);
            $("p-mode-schedule").checked = !!c.scheduleEnabled;
            $("p-mode-cooldown").checked = !!c.cooldownEnabled;
            $("p-cd-wait").value = c.cooldownTimer || 10;
            $("p-cd-freq").value = c.cooldownFrequency || "always";
            
            $("p-mode-session").checked = !!c.sessionLimitEnabled;
            $("p-session-limit").value = c.sessionLimitSecs ? Math.round(c.sessionLimitSecs / 60) : 5;
            $("p-session-cooldown").value = c.sessionCooldownSecs ? Math.round(c.sessionCooldownSecs / 60) : 10;
            
            $("p-redir").value = c.redirectUrl || "";

            // Render schedule windows
            renderPresetSchedules(c.schedules || []);

            // Active days
            const daysGrid = $("p-days-grid");
            const activeDays = Array.isArray(c.activeDays) ? c.activeDays : [0,1,2,3,4,5,6];
            daysGrid.querySelectorAll(".p-day-cb").forEach(cb => {
                cb.checked = activeDays.includes(parseInt(cb.value));
                updateCheckboxLabelStyle(cb);
            });

            $("add-preset-modal-title").textContent = "Edit Block Preset";
        } else {
            // New preset
            $("p-id").value = "";
            $("p-preset-name").value = "";
            $("p-preset-name").disabled = false;
            $("p-mode-focus").checked = false;
            $("p-mode-limit").checked = false;
            $("p-lim").value = 30;
            $("p-mode-schedule").checked = false;
            $("p-mode-cooldown").checked = false;
            $("p-cd-wait").value = 10;
            $("p-cd-freq").value = "everyVisit";
            $("p-mode-session").checked = false;
            $("p-session-limit").value = 5;
            $("p-session-cooldown").value = 10;
            $("p-redir").value = "";

            renderPresetSchedules([]);

            const daysGrid = $("p-days-grid");
            daysGrid.querySelectorAll(".p-day-cb").forEach(cb => {
                cb.checked = true;
                updateCheckboxLabelStyle(cb);
            });

            $("add-preset-modal-title").textContent = "Create Block Preset";
        }

        // Trigger styles/displays
        triggerModalSubSections();
        modal.classList.remove("hide");
    }

    function updateCheckboxLabelStyle(cb) {
        const lbl = cb.closest('label') || cb.parentElement;
        if (lbl) {
            lbl.style.background = cb.checked ? 'var(--green-bg)' : '';
            lbl.style.borderColor = cb.checked ? 'var(--green-bd)' : '';
            lbl.style.color = cb.checked ? 'var(--green)' : '';
        }
    }

    function triggerModalSubSections() {
        $("pf-tl").style.display = $("p-mode-limit").checked ? "block" : "none";
        $("pf-sc").style.display = $("p-mode-schedule").checked ? "block" : "none";
        $("pf-cd").style.display = $("p-mode-cooldown").checked ? "block" : "none";
        $("pf-session").style.display = $("p-mode-session").checked ? "block" : "none";
    }

    function getPresetSchedules() {
        const slots = [];
        const container = $("p-schedule-slots");
        if (container) {
            container.querySelectorAll(".sched-slot").forEach(slot => {
                const start = slot.querySelector(".sched-start")?.value;
                const end = slot.querySelector(".sched-end")?.value;
                if (start && end) {
                    slots.push({ start, end });
                }
            });
        }
        return slots;
    }

    function renderPresetSchedules(schedules) {
        const container = $("p-schedule-slots");
        if (!container) return;
        setSafeHTML(container, "");

        const items = schedules.length ? schedules : [{ start: "09:00", end: "21:00" }];
        items.forEach((s, idx) => {
            const slot = document.createElement("div");
            slot.className = "sched-slot";
            slot.style.cssText = "display:flex; align-items:center; gap:8px; margin-top:8px;";
            setSafeHTML(slot, `
                <input type="time" class="inp sched-start" value="${s.start}" style="flex:1; padding:8px;" />
                <span style="color:var(--tx3)">to</span>
                <input type="time" class="inp sched-end" value="${s.end}" style="flex:1; padding:8px;" />
                <button class="bs btn-del-p-sched" style="padding:8px 12px; font-size:13px; color:var(--red); font-weight:bold;" aria-label="Delete time window">✕</button>
            `);
slot.querySelector(".btn-del-p-sched").addEventListener("click", () => {
                slot.remove();
            });
            container.appendChild(slot);
        });
    }

    function escHTML(str) {
        if (!str) return "";
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Modal save action
    async function savePreset() {
        const id = $("p-id").value;
        const name = $("p-preset-name").value.trim();
        if (!name) {
            toast("Preset name is required", "er");
            return;
        }

        const isNew = !id;
        
        // Count custom presets (max 3 custom presets allowed)
        const customPresetsCount = blockPresetsList.filter(p => p.id !== id).length;
        if (isNew && customPresetsCount >= 3) {
            toast("You can add up to 3 custom presets", "er");
            return;
        }

        const schedules = getPresetSchedules();
        const activeDays = Array.from(document.querySelectorAll('.p-day-cb')).filter(cb => cb.checked).map(cb => parseInt(cb.value));
        
        const limVal = parseInt($("p-lim").value, 10);
        const dailyLimitSecs = $("p-mode-limit").checked ? limVal * 60 : 0;
        const instantBlock = $("p-mode-limit").checked && dailyLimitSecs === 0;

        const config = {
            instantBlock,
            focusOnly: $("p-mode-focus").checked,
            timeLimitEnabled: $("p-mode-limit").checked && dailyLimitSecs > 0,
            dailyLimitSecs,
            scheduleEnabled: $("p-mode-schedule").checked,
            schedules,
            cooldownEnabled: $("p-mode-cooldown").checked,
            cooldownTimer: parseInt($("p-cd-wait").value, 10) || 10,
            cooldownFrequency: $("p-cd-freq").value || "everyVisit",
            sessionLimitEnabled: $("p-mode-session").checked,
            sessionLimitSecs: ($("p-mode-session").checked ? parseInt($("p-session-limit").value, 10) : 5) * 60,
            sessionCooldownSecs: ($("p-mode-session").checked ? parseInt($("p-session-cooldown").value, 10) : 10) * 60,
            activeDays: activeDays.length === 7 ? [0,1,2,3,4,5,6] : activeDays,
            redirectUrl: $("p-redir").value.trim() || null
        };

        if (isNew) {
            const newPreset = {
                id: "preset_" + Date.now(),
                name,
                isDefault: false,
                config
            };
            if (window.__editingSlotIdx !== undefined && window.__editingSlotIdx >= 0 && window.__editingSlotIdx < 3) {
                blockPresetsList[window.__editingSlotIdx] = newPreset;
            } else {
                blockPresetsList.push(newPreset);
            }
        } else {
            const pIdx = blockPresetsList.findIndex(x => x.id === id);
            if (pIdx !== -1) {
                blockPresetsList[pIdx].name = name;
                blockPresetsList[pIdx].config = config;
            }
        }

        window.__editingSlotIdx = undefined;
        blockPresetsList = blockPresetsList.filter(x => x !== null);

        await sLocal({ blockPresets: blockPresetsList });
        loadAndRenderPresets();
        $("add-preset-modal").classList.add("hide");
        toast(isNew ? "Preset created" : "Preset updated", "ok");
    }

    // Modal events
    function wirePresetEvents() {
        $("add-preset-modal-close")?.addEventListener("click", () => {
            window.__editingSlotIdx = undefined;
            $("add-preset-modal").classList.add("hide");
        });

        $("btn-cancel-preset")?.addEventListener("click", () => {
            window.__editingSlotIdx = undefined;
            $("add-preset-modal").classList.add("hide");
        });

        $("btn-save-preset")?.addEventListener("click", savePreset);

        // Checkbox events
        ["p-mode-focus", "p-mode-limit", "p-mode-schedule", "p-mode-cooldown", "p-mode-session"].forEach(id => {
            $(id)?.addEventListener("change", triggerModalSubSections);
        });

        // Add window button
        $("add-p-sched-slot")?.addEventListener("click", () => {
            const container = $("p-schedule-slots");
            if (!container) return;
            const slot = document.createElement("div");
            slot.className = "sched-slot";
            slot.style.cssText = "display:flex; align-items:center; gap:8px; margin-top:8px;";
            setSafeHTML(slot, `
                <input type="time" class="inp sched-start" value="09:00" style="flex:1; padding:8px;" />
                <span style="color:var(--tx3)">to</span>
                <input type="time" class="inp sched-end" value="17:00" style="flex:1; padding:8px;" />
                <button class="bs btn-del-p-sched" style="padding:8px 12px; font-size:13px; color:var(--red); font-weight:bold;" aria-label="Delete time window">✕</button>
            `);
slot.querySelector(".btn-del-p-sched").addEventListener("click", () => {
                slot.remove();
            });
            container.appendChild(slot);
        });

        // Active day grid change styling
        document.querySelectorAll('.p-day-cb').forEach(cb => {
            cb.addEventListener('change', function () {
                updateCheckboxLabelStyle(this);
            });
        });

        // Apply dropdown selection in Rule Editor Modal
        const applyPresetSelect = $("m-apply-preset");
        if (applyPresetSelect) {
            applyPresetSelect.addEventListener("change", () => {
                const presetId = applyPresetSelect.value;
                if (!presetId) return;

                const p = blockPresetsList.find(x => x.id === presetId);
                if (!p) return;

                const c = p.config || {};
                $("m-mode-focus").checked = !!c.focusOnly;
                
                let isTimeLimit = !!c.timeLimitEnabled || !!c.instantBlock;
                $("m-mode-limit").checked = isTimeLimit;
                $("m-lim").value = c.instantBlock ? 0 : Math.round((c.dailyLimitSecs || 1800)/60);
                
                $("m-mode-schedule").checked = !!c.scheduleEnabled;
                $("m-mode-cooldown").checked = !!c.cooldownEnabled;
                $("m-cd-wait").value = c.cooldownTimer || 10;
                $("m-cd-freq").value = c.cooldownFrequency || "always";

                $("m-mode-session").checked = !!c.sessionLimitEnabled;
                $("m-session-limit").value = c.sessionLimitSecs ? Math.round(c.sessionLimitSecs / 60) : 5;
                $("m-session-cooldown").value = c.sessionCooldownSecs ? Math.round(c.sessionCooldownSecs / 60) : 10;
                
                $("cat-redir").value = c.redirectUrl || "";

                // Populate schedules in the main rule modal
                if (typeof renderScheduleSlots === "function") {
                    renderScheduleSlots(c.schedules || []);
                }

                // Populate active days in the main rule modal
                const activeDays = Array.isArray(c.activeDays) ? c.activeDays : [0,1,2,3,4,5,6];
                document.querySelectorAll('.m-day-cb').forEach(cb => {
                    cb.checked = activeDays.includes(parseInt(cb.value));
                    const lbl = cb.closest('label') || cb.parentElement;
                    if (lbl) {
                        lbl.style.background = cb.checked ? 'var(--green-bg)' : '';
                        lbl.style.borderColor = cb.checked ? 'var(--green-bd)' : '';
                        lbl.style.color = cb.checked ? 'var(--green)' : '';
                    }
                });

                // Update visibility of collapsible rule settings
                $("mf-tl").style.display = isTimeLimit ? "block" : "none";
                $("mf-sc").style.display = c.scheduleEnabled ? "block" : "none";
                $("mf-cd").style.display = c.cooldownEnabled ? "block" : "none";
                $("mf-session").style.display = c.sessionLimitEnabled ? "block" : "none";

                toast("Applied preset: " + p.name, "ok");
            });
        }
    }



    // --- Init ---
    function init() {
        wirePresetEvents();
        loadAndRenderPresets();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 300);
    }
})();
