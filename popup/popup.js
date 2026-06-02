// FF v6.16: msg() now lives in utils.js (shared with dashboard). Removed the
// duplicate that used to live here and silently shadow it.
var FR_C = 2 * Math.PI * 34,
    currentView = "today",
    siteCats = {},
    AUTO_CATEGORIES = {};

var pcRes = null,
    pcBuf = "";

function showPass() {
    if (pcRes) { pcRes(false); pcRes = null; } // Bug#5 fix: resolve dangling promise
    return new Promise(e => {
        pcRes = e, pcBuf = "", updDots(), $("pcerr") && $("pcerr").classList.add("hide"), $("pccancel") && $("pccancel").classList.remove("hide"), $("pcOverlay") && $("pcOverlay").classList.remove("hide")
    })
}

function updDots() {
    $("pdots").querySelectorAll("span").forEach((e, t) => e.classList.toggle("on", t < pcBuf.length))
}
async function promptPinIfEnabled(e) {
    var t = await gSync(["settings"]);
    return !t.settings?.passcodeHash || !1 === t.settings[e] || await showPass()
}

document.addEventListener("keydown", e => {
    const t = $("pcOverlay");
    t && !t.classList.contains("hide") && (e.key >= "0" && e.key <= "9" ? (e.preventDefault(), e.stopPropagation(), pcBuf.length < 6 && (pcBuf += e.key, updDots())) : "Backspace" === e.key ? (e.preventDefault(), e.stopPropagation(), pcBuf = pcBuf.slice(0, -1), updDots()) : "Enter" === e.key ? (e.preventDefault(), e.stopPropagation(), pcBuf.length >= 4 && $("pcok").click()) : "Escape" === e.key && $("pccancel") && !$("pccancel").classList.contains("hide") && (e.preventDefault(), e.stopPropagation(), $("pccancel").click()))
}, !0);
$("pccancel") && $("pccancel").addEventListener("click", () => {
    $("pcOverlay").classList.add("hide"), pcRes && pcRes(!1)
});
document.querySelectorAll(".pk[data-n]").forEach(e => e.addEventListener("click", () => {
    pcBuf.length >= 6 || (pcBuf += e.getAttribute("data-n"), updDots())
}));
$("pclr") && $("pclr").addEventListener("click", () => {
    pcBuf = pcBuf.slice(0, -1), updDots()
});
$("pcok") && $("pcok").addEventListener("click", async () => {
    if (pcBuf.length >= 4) {
        var e = await gSync(["settings"]);
        await hashPin(pcBuf) === (e.settings || {}).passcodeHash ? ($("pcOverlay").classList.add("hide"), pcRes && pcRes(!0)) : ($("pcerr") && $("pcerr").classList.remove("hide"), pcBuf = "", updDots())
    }
});

function getEffectiveCat(e) {
    if (siteCats[e]) return siteCats[e];
    for (var t = e.split("."), s = 1; s < t.length - 1; s++) {
        var a = t.slice(s).join(".");
        if (siteCats[a]) return siteCats[a]
    }
    if (AUTO_CATEGORIES[e]) return AUTO_CATEGORIES[e];
    var n = t.length > 2 ? t.slice(1).join(".") : e;
    return AUTO_CATEGORIES[n] ? AUTO_CATEGORIES[n] : "uncategorized"
}
$("btn-analytics") && $("btn-analytics").addEventListener("click", () => chrome.tabs.create({
    url: chrome.runtime.getURL("dashboard/index.html#analytics")
}));
$("btn-settings") && $("btn-settings").addEventListener("click", () => chrome.tabs.create({
    url: chrome.runtime.getURL("dashboard/index.html#settings")
}));
applyTheme("theme-icon");
$("btn-theme") && $("btn-theme").addEventListener("click", async function () {
    const e = await gLocal(["theme"]);
    let t = "dark";
    "dark" !== e.theme && e.theme ? "light" === e.theme && (t = "cinematic") : t = "light", await sLocal({
        theme: t
    }), applyTheme("theme-icon")
});
document.querySelectorAll(".ttab").forEach(function (e) {
    e.addEventListener("click", function () {
        document.querySelectorAll(".ttab").forEach(e => e.classList.remove("act")), e.classList.add("act"), currentView = e.getAttribute("data-view");
        var t = $("dynamic-list"),
            s = $("today-widgets"),
            leg = $("donut-legend");
        t && t.classList.remove("fade-in"), s && s.classList.remove("fade-in"), t && t.offsetWidth;
        const spinnerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 0;color:var(--tx3);gap:10px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5; animation:spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg><span style="font-size:13px;font-weight:600">Loading data...</span></div>';
        if (t) t.innerHTML = spinnerHTML;
        if (leg) leg.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--tx3);gap:8px;">' + spinnerHTML + '</div>';
        if ($("donut-total")) $("donut-total").textContent = "—";
        loadViewData().then(() => {
            t && t.classList.add("fade-in");
            s && "today" === currentView && s.classList.add("fade-in");
            const totWid = $("total-widgets");
            totWid && "total" === currentView && totWid.classList.add("fade-in");
        });
    })
});
// FF v6.16: GRANULAR_SITES (incl. B&W universal append) now lives in
// src/lib/constants.js and is shared with dashboard.js. Local alias for brevity.
const GRANULAR_SITES = self.GRANULAR_SITES || {};
async function checkCurrentTabForGranularRules() {
    try {
        const e = await chrome.tabs.query({
            active: !0,
            currentWindow: !0
        });
        if (!e || !e.length || !e[0].url) return;
        let t = e[0].url;
        if (!["http:", "https:"].includes(new URL(t).protocol)) return;
        let s = new URL(t).hostname.replace(/^www\./, ""),
            a = Object.keys(GRANULAR_SITES).find(e => s === e || s.endsWith("." + e));

        let displayName = a || s;
        $("current-site-card") && ($("current-site-card").style.display = "block"), $("current-site-name") && ($("current-site-name").textContent = displayName), $("current-site-icon") && ($("current-site-icon").src = `https://www.google.com/s2/favicons?sz=32&domain=${displayName.trim().toLowerCase().replace(/^www\./, "")}`);

        let { blockRules = [] } = await gLocal(["blockRules"]);
        let existingRule = blockRules.find(r => s === r.domain || s.endsWith("." + r.domain));
        let isBlocked = !!existingRule;

        let btnClass = isBlocked ? "bs-danger-sm" : "bp-sm";
        let btnText = isBlocked ? "Unblock" : "Block Site";

        // FF v6.7.0: use .bp-sm and .bs-danger-sm classes instead of raw inline styles (Problem 3)
        let btnHTML = `
            <button id="btn-popup-block" class="${btnClass}">
              ${btnText}
            </button>
        `;
        const actionContainer = $("current-site-action");
        if (actionContainer) {
            actionContainer.innerHTML = btnHTML;
        }

        const siteHeader = $("current-site-header");
        if (siteHeader) {
            if (a) {
                siteHeader.style.borderBottom = "1px solid var(--bd)";
                siteHeader.style.paddingBottom = "12px";
                siteHeader.style.marginBottom = "12px";
            } else {
                siteHeader.style.borderBottom = "none";
                siteHeader.style.paddingBottom = "0";
                siteHeader.style.marginBottom = "0";
            }
        }

        let sHTML = "";

        if (a) {
            let t = ((await gLocal(["granularRules"])).granularRules || {})[a] || {};
            GRANULAR_SITES[a].forEach(e => {
                let n = !0 === t[e.id] ? "checked" : "";
                sHTML += `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:4px 0;">
              <span style="font-size:13px;font-weight:600;color:var(--tx2);flex:1;">${escHTML(e.label)}</span>
              <label class="tog"><input type="checkbox" class="g-cb" data-d="${escHTML(a)}" data-r="${escHTML(e.id)}" ${n}><span class="ttrack"></span></label>
            </div>
          `;
            });
        }

        $("current-site-toggles") && ($("current-site-toggles").innerHTML = sHTML);

        const blockBtn = $("btn-popup-block");
        if (blockBtn) {
            blockBtn.addEventListener("click", async () => {
                let { blockRules = [] } = await gLocal(["blockRules"]);
                let ruleToToggle = blockRules.find(r => s === r.domain || s.endsWith("." + r.domain));

                if (ruleToToggle) {
                    if (await promptPinIfEnabled("lockRules")) {
                        blockRules = blockRules.filter(r => r.id !== ruleToToggle.id);
                        await sLocal({ blockRules });
                        await msg("TRIGGER_DNR_UPDATE");
                        chrome.tabs.reload(e[0].id);
                        window.close();
                    }
                } else {
                    const confirmed = confirm(`Are you sure you want to block ${s}? This will reload the tab and block access to this site.`);
                    if (!confirmed) return;

                    let { allowList = [] } = await gLocal(["allowList"]);
                    if (allowList.includes(s)) {
                        allowList = allowList.filter(item => item !== s);
                        await sLocal({ allowList });
                    }

                    const newRule = {
                        id: Math.random().toString(36).substring(2, 9),
                        domain: s,
                        category: getEffectiveCat(s) || "distraction",
                        redirectUrl: null,
                        instantBlock: true,
                        focusOnly: false,
                        timeLimitEnabled: false,
                        dailyLimitSecs: 0,
                        scheduleEnabled: false,
                        schedules: []
                    };
                    blockRules.push(newRule);
                    await sLocal({ blockRules });
                    await msg("TRIGGER_DNR_UPDATE");
                    chrome.tabs.reload(e[0].id);
                    window.close();
                }
            });
        }

        document.querySelectorAll(".g-cb").forEach(t => {
            t.addEventListener("change", async t => {
                const turningOff = !t.target.checked;
                if (turningOff && !(await promptPinIfEnabled("lockTweaks"))) {
                    t.target.checked = true;
                    return;
                }
                let s = t.target.getAttribute("data-d"),
                    a = t.target.getAttribute("data-r"),
                    n = t.target.checked,
                    o = (await gLocal(["granularRules"])).granularRules || {};
                o[s] || (o[s] = {}), o[s][a] = n, await sLocal({
                    granularRules: o
                }), await msg("INJECT_GRANULAR_CSS", {
                    tabId: e[0].id,
                    ruleId: a,
                    enabled: n
                })
            })
        });
    } catch (e) {
        console.error("[FF checkCurrentTabForGranularRules]", e);
    }
}
async function loadViewData() {
    $("donut-sublbl") && ($("donut-sublbl").textContent = "total" === currentView ? "all time" : "today");
    var e = await msg("GET_SITE_CATEGORIES");
    siteCats = e && e.siteCategories || {};
    var t = await msg("GET_AUTO_CATEGORIES");
    AUTO_CATEGORIES = t && t.autoCategories || {};
    var s = {},
        a = {};
    if ("today" === currentView) {
        $("today-widgets") && ($("today-widgets").style.display = "block");
        $("total-widgets") && ($("total-widgets").style.display = "none");
        var n = await msg("STATS_GET_DAY", {
            day: todayKey()
        });
        s = n && n.data || {}, a = s.sites || {}
    } else {
        $("today-widgets") && ($("today-widgets").style.display = "none");
        $("total-widgets") && ($("total-widgets").style.display = "block");
        // FF v6.17: O(1) read of running totals instead of scanning every IDB day.
        var o = await msg("STATS_GET_ALLTIME_TOTALS");
        a = (o && o.allTimeTotals) || {};
        // Synthesize a category breakdown for the donut from the per-site totals.
        s = {};
        Object.entries(a).forEach(([dom, secs]) => {
            var c = getEffectiveCat(dom);
            s[c] = (s[c] || 0) + secs;
        });
    }
    var i = computeTotals(s);
    renderDonut(s, i), renderDynamicList(a, i), "total" === currentView && loadWeeklyGoal()
}



function computeTotals(e) {
    var t = e.productivity || 0,
        s = e.learning || 0,
        a = e.distraction || 0,
        n = e.communication || 0,
        o = ["productivity", "learning", "distraction", "communication", "uncategorized", "sites"],
        c = Object.keys(e).reduce(function (t, s) {
            return o.indexOf(s) >= 0 || "number" != typeof e[s] ? t : t + (e[s] || 0)
        }, e.uncategorized || 0);
    return {
        prod: t,
        lrn: s,
        dist: a,
        comms: n,
        other: c,
        total: t + s + a + n + c
    }
}

function renderDonut(e, t) {
    var s = $("donut-svg");
    if (s) {
        for (; s.children.length > 1;) s.removeChild(s.lastChild);
        var a = 2 * Math.PI * 50,
            n = [{
                cat: "productivity",
                color: "#05D581"
            }, {
                cat: "learning",
                color: "#a855f7"
            }, {
                cat: "communication",
                color: "#5C9CFC"
            }, {
                cat: "distraction",
                color: "#F46B7A"
            }, {
                cat: "uncategorized",
                color: "#555555"
            }].filter(t => (e[t.cat] || 0) > 0),
            o = 0;
        n.forEach(n => {
            var c = (e[n.cat] || 0) / (t.total || 1),
                i = t.total ? Math.max(c * a, 3) : 0,
                r = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            r.setAttribute("cx", 65), r.setAttribute("cy", 65), r.setAttribute("r", 50), r.setAttribute("fill", "none"), r.setAttribute("stroke", n.color), r.setAttribute("stroke-width", 16), r.setAttribute("stroke-dasharray", i.toFixed(2) + " " + (a - i + .5).toFixed(2)), r.setAttribute("stroke-dashoffset", (-o).toFixed(2)), s.appendChild(r), o += i
        }), $("donut-total") && ($("donut-total").textContent = fmt(t.total));
        var c = $("donut-legend");
        if (c)
            if (c.innerHTML = "", t.total) [{
                label: "Productivity",
                secs: t.prod,
                color: "#05D581"
            }, {
                label: "Learning",
                secs: t.lrn,
                color: "#a855f7"
            }, {
                label: "Communication",
                secs: t.comms,
                color: "#5C9CFC"
            }, {
                label: "Distraction",
                secs: t.dist,
                color: "#F46B7A"
            }, {
                label: "Uncategorized",
                secs: t.other,
                color: "#555555"
            }].filter(e => e.secs > 0).forEach(e => {
                c.innerHTML += `<div class="legend-row">\n      <div class="leg-dot" style="background:${e.color};box-shadow:0 0 6px ${e.color}"></div>\n      <div class="leg-info"><span class="leg-name">${e.label}</span><span class="leg-time num">${fmt(e.secs)}</span></div>\n    </div>`
            });
            else c.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--tx3);gap:8px;"><span style="font-size:13px;font-weight:600">No data yet.</span></div>'
    }
}

function buildCatSelector(e, t, s) {
    var a = `<select class="sel-cat" data-domain="${escHTML(e)}" style="font-size:10px; padding:4px 8px; border-radius:999px; background:${s}22; color:${s}; border:1px solid ${s}55; outline:none; cursor:pointer; font-weight:800; text-transform:uppercase; appearance:none; text-align:center;">`;
    return ["productivity", "learning", "distraction", "communication", "uncategorized"].forEach(e => {
        a += `<option value="${e}" ${e === t ? "selected" : ""} style="background:var(--bg2); color:var(--tx); text-transform:capitalize;">${CAT_LABELS[e]}</option>`
    }), a += "</select>"
}

function renderDynamicList(e, t) {
    var s = $("dynamic-list");
    if (s && (s.innerHTML = "", t.total)) {
        var a = Object.entries(e).sort((e, t) => t[1] - e[1]);
        var n = s._showAll || !1;
        var isToday = "today" === currentView;
        s.innerHTML = '<div class="list-hdr">' + (isToday ? "All Sites Today" : "All Time Site Usage") + ' (Click Tag to Edit)</div>';
        
        (n ? a : a.slice(0, 10)).forEach(([e, t]) => {
            var a = getEffectiveCat(e),
                n = CAT_COLORS[a] || "#555555";
            s.innerHTML += `<div class="siterow"><span class="sitedom">${getFav(e)}${escHTML(e)}</span>${buildCatSelector(e, a, n)}<span class="sitetm num">${fmt(t)}</span></div>`
        });
        if (a.length > 10 && !n) {
            const isFirefox = navigator.userAgent.includes("Firefox") || chrome.runtime.getURL("").startsWith("moz-extension:");
            const rateUrl = isFirefox 
                ? "https://addons.mozilla.org/en-US/firefox/addon/flow-website-manager/" 
                : "https://microsoftedge.microsoft.com/addons/detail/jlcdkibfogehgkbhkkkglifbanenkmic";
            let overlayHtml = `
              <div id="feedback-overlay" style="display:flex; justify-content:center; gap:8px; align-items:center; width:100%; background:var(--bg2); border-radius:12px; padding:4px;">
                <a href="${rateUrl}" target="_blank" class="bs bs-sm" style="color:var(--amber); border-color:var(--amber-bd); background:var(--amber-bg); text-decoration:none; padding:8px; font-size:11px; white-space:nowrap; flex:1; justify-content:center;">⭐ Rate Us</a>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSdWc7nYA3D1BqFtqtphDzdJ8UKa4DVw5WteEaAJsQlYAT1Rfg/viewform?usp=dialog" target="_blank" class="bs bs-sm" style="color:var(--blue); border-color:var(--bd); background:var(--bg3); text-decoration:none; padding:8px; font-size:11px; white-space:nowrap; flex:1; justify-content:center;">💬 Feedback</a>
                <button id="feedback-close-btn" class="icon-btn" style="width:24px;height:24px;border:none;flex-shrink:0;">✕</button>
              </div>
            `;
            s.innerHTML += `
            <div style="text-align:center;padding:12px;display:flex;justify-content:center;">
              <div id="feedback-overlay-container" style="width:100%;">${overlayHtml}</div>
              <button id="show-all-btn" class="bs bs-sm" style="display:none;">Show all ${a.length} sites</button>
            </div>
            `;
            setTimeout(() => {
                var btn = document.getElementById("show-all-btn");
                if (btn) btn.addEventListener("click", () => {
                    s._showAll = !0, loadViewData()
                });
                var closeBtn = document.getElementById("feedback-close-btn");
                var overlay = document.getElementById("feedback-overlay-container");
                if (closeBtn && overlay && btn) {
                    closeBtn.addEventListener("click", () => {
                        overlay.style.display = 'none';
                        btn.style.display = 'inline-flex';
                    });
                }
            }, 0);
        }
        
        s.querySelectorAll(".sel-cat").forEach(e => {
            e.addEventListener("change", async e => {
                var t = e.target.getAttribute("data-domain"),
                    s = e.target.value;
                siteCats[t] = s, await msg("CATEGORIZE_SITE", {
                    domain: t,
                    category: s
                }), loadViewData()
            })
        });
    }
}
async function loadWeeklyGoal() {
    var e = await msg("STATS_GET_WEEK"),
        t = e && e.studySecs || 0,
        s = e && e.goalSecs || 0;
    if (e && e.goalHours || 0) {
        $("goal-section") && ($("goal-section").style.display = "block");
        var a = Math.min(1, s > 0 ? t / s : 0);
        $("goal-fill") && ($("goal-fill").style.width = Math.round(100 * a) + "%", $("goal-fill").style.background = a >= 1 ? "var(--amber)" : "var(--green)"), $("goal-pct") && ($("goal-pct").textContent = a >= 1 ? "🏆" : Math.round(100 * a) + "%", $("goal-pct").style.color = a >= 1 ? "var(--amber)" : "var(--green)"), $("goal-done") && ($("goal-done").textContent = Math.floor(t / 3600) + "h " + Math.floor(t % 3600 / 60) + "m done");
        var n = Math.max(0, s - t);
        $("goal-target") && ($("goal-target").textContent = a >= 1 ? "Goal hit! ✓" : Math.floor(n / 3600) + "h " + Math.floor(n % 3600 / 60) + "m left")
    } else $("goal-section") && ($("goal-section").style.display = "none");
}

function renderFocus(e) {
    if (!e || !e.active) return $("focus-card") && ($("focus-card").className = "focus-section"), $("fr-fill") && ($("fr-fill").className = "fr-fill work", $("fr-fill").setAttribute("stroke-dashoffset", FR_C)), $("fr-time") && ($("fr-time").textContent = window._focusWorkMins + ":00"), $("fr-cycles") && ($("fr-cycles").textContent = "0 done"), $("focus-title") && ($("focus-title").textContent = "Ready to focus?"), $("focus-sub") && ($("focus-sub").textContent = window._focusWorkMins + " min work · " + window._focusBreakMins + " min break"), $("focus-phase") && ($("focus-phase").textContent = "Pomodoro", $("focus-phase").className = "focus-phase"), $("logo-img") && ($("logo-img").className = ""), $("btn-start") && ($("btn-start").style.display = ""), $("btn-stop") && ($("btn-stop").style.display = "none"), $("btn-pause") && ($("btn-pause").style.display = "none"), $("btn-skip") && ($("btn-skip").style.display = "none"), void ($("btn-focus-set") && ($("btn-focus-set").style.display = "flex"));
    $("logo-img") && ($("logo-img").className = "focus-on");
    var t = "work" === e.phase,
        s = $("focus-card");
    s && void 0 !== s._lastPhase && s._lastPhase !== e.phase && (s.classList.add("phase-change"), setTimeout(() => s.classList.remove("phase-change"), 600)), s && (s._lastPhase = e.phase), s && (s.className = "focus-section " + (t ? "work-active" : "break-active")), $("fr-fill") && ($("fr-fill").className = "fr-fill " + (t ? "work" : "brk"));
    var a = t ? 60 * window._focusWorkMins : "long_break" === e.phase ? 60 * window._focusLongBreakMins : 60 * window._focusBreakMins;
    $("fr-fill") && $("fr-fill").setAttribute("stroke-dashoffset", (FR_C * Math.max(0, 1 - Math.min(1, (e.remaining || 0) / a))).toFixed(1)), $("fr-time") && ($("fr-time").textContent = fmtTimer(e.remaining || 0)), $("fr-cycles") && ($("fr-cycles").textContent = e.isSchedule ? "Active" : ((e.cyclesCompleted || 0) + " done")), $("focus-phase") && ($("focus-phase").textContent = e.isSchedule ? "Schedule" : (t ? "Work" : "long_break" === e.phase ? "Long Break" : "Short Break"), $("focus-phase").className = "focus-phase " + (e.isSchedule ? "work" : (t ? "work" : "brk"))), $("focus-title") && ($("focus-title").textContent = e.isSchedule ? "Deep work." : (t ? "Deep work." : "long_break" === e.phase ? "Long break!" : "Short break.")), $("focus-sub") && ($("focus-sub").textContent = e.isSchedule ? "Scheduled Session" : ((e.cyclesCompleted || 0) + " cycle" + (1 !== e.cyclesCompleted ? "s" : "") + " completed")), $("btn-start") && ($("btn-start").style.display = "none"), $("btn-stop") && ($("btn-stop").style.display = ""), $("btn-pause") && ($("btn-pause").style.display = "", $("btn-pause").textContent = e.paused ? "▶ Resume" : "⏸ Pause"), $("btn-skip") && ($("btn-skip").style.display = t ? "none" : ""), $("btn-focus-set") && ($("btn-focus-set").style.display = "none"), $("focus-set-panel") && ($("focus-set-panel").style.display = "none");
    var n = $("pause-warning");
    if (n)
        if (e.paused && e.active) {
            if (n.style.display = "block", !window._pauseCountdownTick) {
                var o = e.pausedAt || Date.now();
                window._pauseCountdownTick = setInterval(function () {
                    var e = Math.floor((Date.now() - o) / 1e3),
                        t = Math.max(0, 300 - e),
                        s = Math.floor(t / 60),
                        a = t % 60,
                        n = $("pause-countdown");
                    n && (n.textContent = s + "m " + String(a).padStart(2, "0") + "s"), t <= 0 && (clearInterval(window._pauseCountdownTick), window._pauseCountdownTick = null)
                }, 1e3)
            }
        } else n.style.display = "none", window._pauseCountdownTick && (clearInterval(window._pauseCountdownTick), window._pauseCountdownTick = null)
}

function loadFocus() {
    return msg("FOCUS_GET_STATE").then(e => renderFocus(e && e.focusState))
}
// Bug 7 fix: debounce guard to prevent double-clicks on focus buttons
var _focusBusy = false;
$("btn-start") && $("btn-start").addEventListener("click", async () => {
    if (_focusBusy) return; _focusBusy = true;
    try { renderFocus((await msg("FOCUS_START", { unstoppable: !1 }))?.focusState); }
    finally { _focusBusy = false; }
});
$("btn-stop") && $("btn-stop").addEventListener("click", async () => {
    if (_focusBusy) return; _focusBusy = true;
    try { await promptPinIfEnabled("lockStop") && renderFocus((await msg("FOCUS_STOP"))?.focusState); }
    finally { _focusBusy = false; }
});
$("btn-pause") && $("btn-pause").addEventListener("click", async () => {
    if (_focusBusy) return; _focusBusy = true;
    try { renderFocus((await msg($("btn-pause").textContent.includes("Resume") ? "FOCUS_RESUME" : "FOCUS_PAUSE"))?.focusState); }
    finally { _focusBusy = false; }
});
$("btn-skip") && $("btn-skip").addEventListener("click", async () => {
    if (_focusBusy) return; _focusBusy = true;
    try { renderFocus((await msg("FOCUS_SKIP"))?.focusState); }
    finally { _focusBusy = false; }
});
$("btn-focus-set") && $("btn-focus-set").addEventListener("click", () => {
    $("p-sw") && ($("p-sw").value = window._focusWorkMins), $("p-sb") && ($("p-sb").value = window._focusBreakMins), $("p-sl") && ($("p-sl").value = window._focusLongBreakMins), $("p-sc") && ($("p-sc").value = window._focusCycles), $("focus-set-panel") && ($("focus-set-panel").style.display = "flex"), $("focus-card") && ($("focus-card").style.minHeight = "360px")
});
$("p-close-focus") && $("p-close-focus").addEventListener("click", () => {
    $("focus-set-panel") && ($("focus-set-panel").style.display = "none"), $("focus-card") && ($("focus-card").style.minHeight = "")
});
$("p-save-focus") && $("p-save-focus").addEventListener("click", async () => {
    var t = parseInt($("p-sw").value);
    var workVal = !isNaN(t) && t >= 1 ? t : 25;
    var s = parseInt($("p-sb").value);
    var breakVal = !isNaN(s) && s >= 0 ? s : 5;
    var a = parseInt($("p-sl").value);
    var longVal = !isNaN(a) && a >= 0 ? a : 15;
    var n = parseInt($("p-sc").value);
    var cyclesVal = !isNaN(n) && n >= 1 ? n : 4;

    var pres = await msg("PRESETS_GET");
    if (pres && pres.presets) {
        var ap = pres.presets.find(p => p.id === pres.activeId) || pres.presets[0];
        if (ap) {
            ap.work = workVal;
            ap.brk = breakVal;
            ap.longBrk = longVal;
            ap.cycles = cyclesVal;
            await msg("PRESETS_SAVE", { presets: pres.presets });
        }
    }
    window._focusWorkMins = workVal, window._focusBreakMins = breakVal, window._focusLongBreakMins = longVal, window._focusCycles = cyclesVal, $("focus-set-panel") && ($("focus-set-panel").style.display = "none"), $("focus-card") && ($("focus-card").style.minHeight = ""), loadFocus()
});
chrome.runtime.onMessage.addListener(e => {
    "FOCUS_TICK" === e.type && renderFocus(e.focusState)
});
chrome.runtime.connect({ name: "flow-tracker" });
var _origRF = renderFocus,
    _focusTick = null;

function startSmoothFocusTick(e) {
    _focusTick && clearInterval(_focusTick), e && e.active && !e.paused && e.phaseEndsAt && (_focusTick = setInterval(function () {
        var t = Math.max(0, Math.round((e.phaseEndsAt - Date.now()) / 1e3)),
            s = "work" === e.phase ? 60 * window._focusWorkMins : "long_break" === e.phase ? 60 * window._focusLongBreakMins : 60 * window._focusBreakMins;
        $("fr-fill") && $("fr-fill").setAttribute("stroke-dashoffset", (FR_C * Math.max(0, 1 - t / s)).toFixed(1)), $("fr-time") && ($("fr-time").textContent = fmtTimer(t)), t <= 0 && (clearInterval(_focusTick), _focusTick = null, setTimeout(loadFocus, 1e3))
    }, 1e3))
}
renderFocus = function (e) {
    _origRF(e), e && e.active && !e.paused && e.phaseEndsAt ? startSmoothFocusTick(e) : _focusTick && (clearInterval(_focusTick), _focusTick = null)
};

async function initPopup() {
    var pres = await msg("PRESETS_GET");
    var ap = null;
    if (pres && pres.presets) ap = pres.presets.find(p => p.id === pres.activeId) || pres.presets[0];
    window._focusWorkMins = ap ? ap.work : 25;
    window._focusBreakMins = ap ? ap.brk : 5;
    window._focusLongBreakMins = ap ? ap.longBrk : 15;
    window._focusCycles = ap ? ap.cycles : 4;
    renderPresetRail(pres);
    await Promise.all([loadViewData(), loadFocus(), checkCurrentTabForGranularRules()]);
    $("logo-img") && $("logo-img").addEventListener("click", () => {
        chrome.tabs.create({ url: "https://vishwa-vsr.github.io/flow-website/" });
        window.close();
    });

    // The Streak Badge Fix
    try {
        var t = await msg("STATS_GET_STREAK"),
            s = t && t.streak,
            a = $("streak-badge");
        if (a && s) {
            a.style.display = "inline-flex";
            if (s.currentStreak > 0) {
                a.textContent = "🔥 " + s.currentStreak + "d";
                a.style.background = "var(--amber-bg)";
                a.style.color = "var(--amber)";
                a.style.borderColor = "rgba(246,184,70,.3)";
            } else {
                a.textContent = "🧊 " + s.currentStreak + "d";
                a.style.background = "var(--bg4)";
                a.style.color = "var(--tx3)";
                a.style.borderColor = "var(--bd2)";
            }
        }
    } catch (e) { }

}

initPopup();
// FF v6.16: track interval so we can clear it when the popup closes — otherwise
// it fires one extra time after unload and triggers a dead message send.
const _popupRefreshInterval = setInterval(loadViewData, 6e4);
window.addEventListener("unload", () => {
    clearInterval(_popupRefreshInterval);
    if (window._pauseCountdownTick) clearInterval(window._pauseCountdownTick);
    if (window._focusTick) clearInterval(window._focusTick);
});

// FF v5.0: emoji preset rail. Clicking switches active preset (disabled while focus is running).
async function renderPresetRail(pres) {
    var rail = $("preset-rail");
    if (!rail || !pres || !pres.presets) return;
    var active = pres.activeId;
    var fs = await msg("FOCUS_GET_STATE");
    var locked = !!(fs && fs.focusState && fs.focusState.active);
    rail.innerHTML = pres.presets.map(p => {
        var isAct = p.id === active;
        return '<button title="' + p.name + (locked ? ' (locked while focus is running)' : '') +
            '" data-pid="' + p.id + '" ' + (locked ? 'disabled' : '') +
            ' style="background:' + (isAct ? 'var(--bg3)' : 'transparent') +
            ';border:1px solid ' + (isAct ? 'var(--bd2)' : 'transparent') +
            ';border-radius:8px;width:26px;height:26px;font-size:14px;cursor:' +
            (locked ? 'not-allowed' : 'pointer') + ';opacity:' + (locked ? '0.4' : '1') +
            ';display:inline-flex;align-items:center;justify-content:center;padding:0;line-height:1;">' +
            p.emoji + '</button>';
    }).join("");
    rail.querySelectorAll("button[data-pid]").forEach(b => {
        b.addEventListener("click", async () => {
            if (b.disabled) return;
            await msg("PRESETS_SET_ACTIVE", { id: b.getAttribute("data-pid") });
            var pres2 = await msg("PRESETS_GET");
            var ap = pres2.presets.find(p => p.id === pres2.activeId) || pres2.presets[0];
            if (ap) {
                window._focusWorkMins = ap.work;
                window._focusBreakMins = ap.brk;
                window._focusLongBreakMins = ap.longBrk;
                window._focusCycles = ap.cycles;
            }
            renderPresetRail(pres2);
            loadFocus();
        });
    });
}
