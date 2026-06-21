// FF v6.16: msg() now lives in utils.js (shared with dashboard). Removed the
// duplicate that used to live here and silently shadow it.
var FR_C = 2 * Math.PI * 34,
    currentView = "today",
    siteCats = {},
    AUTO_CATEGORIES = {};
var hiddenDefaultSites = [];

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
            $("pcerr") && $("pcerr").classList.remove("hide");
            pcBuf = "";
            updDots();
        }
    }
});
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
    if (e.theme === "dark") t = "light";
    else if (e.theme === "light") t = "cinematic";
    else if (e.theme === "cinematic") t = "custom";
    else t = "dark";
    await sLocal({
        theme: t
    });
    applyTheme("theme-icon");
});
document.querySelectorAll(".ttab").forEach(function (e) {
    e.addEventListener("click", function () {
        document.querySelectorAll(".ttab").forEach(e => e.classList.remove("act")), e.classList.add("act"), currentView = e.getAttribute("data-view");
        var t = $("dynamic-list"),
            s = $("today-widgets"),
            leg = $("donut-legend");
        t && t.classList.remove("fade-in"), s && s.classList.remove("fade-in"), t && t.offsetWidth;
        const spinnerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 0;color:var(--tx3);gap:10px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5; animation:spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg><span style="font-size:13px;font-weight:600">Loading data...</span></div>';
        if (t) setSafeHTML(t, spinnerHTML);
        if (leg) setSafeHTML(leg, '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--tx3);gap:8px;">' + spinnerHTML + '</div>');
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
        let cleanDom = displayName.trim().toLowerCase().replace(/^www\./, "");
        let iconUrl = FALLBACK_ICON;

        if (shouldFetchFavicon(cleanDom)) {
            const apex = getApexDomain(cleanDom);
            let cachedUrl = window.savedFavicons ? (window.savedFavicons[cleanDom] || window.savedFavicons[apex]) : null;
            if (cachedUrl) {
                iconUrl = cachedUrl;
            } else {
                const isFirefox = chrome.runtime.getURL("").startsWith("moz-extension://");
                iconUrl = isFirefox 
                    ? FALLBACK_ICON 
                    : chrome.runtime.getURL(`_favicon/?pageUrl=http://${apex}&size=32`);
            }
        }
        $("current-site-card") && ($("current-site-card").style.display = "block"), $("current-site-name") && ($("current-site-name").textContent = displayName), $("current-site-icon") && ($("current-site-icon").src = iconUrl);

        let { blockRules = [] } = await gLocal(["blockRules"]);
        let existingRule = blockRules.find(r => s === r.domain || s.endsWith("." + r.domain));
        let isBlocked = !!existingRule;

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

        $("current-site-toggles") && setSafeHTML($("current-site-toggles"), sHTML);

        const actionContainer = $("current-site-action");
        const dropdownMenu = $("popup-preset-dropdown");

        if (isBlocked) {
            if (dropdownMenu) {
                dropdownMenu.style.display = "none";
                dropdownMenu.textContent = "";
            }
            if (actionContainer) {
                setSafeHTML(actionContainer, `
                    <button id="btn-popup-block" class="bs-danger-sm">
                      Unblock
                    </button>
                `);
            }
            const blockBtn = $("btn-popup-block");
            if (blockBtn) {
                blockBtn.addEventListener("click", async () => {
                    if (await promptPinIfEnabled("lockRules")) {
                        let { blockRules = [] } = await gLocal(["blockRules"]);
                        blockRules = blockRules.filter(r => r.id !== existingRule.id);
                        await sLocal({ blockRules });
                        await msg("TRIGGER_DNR_UPDATE");
                        chrome.tabs.reload(e[0].id);
                        window.close();
                    }
                });
            }
        } else {
            if (dropdownMenu) {
                dropdownMenu.style.display = "none";
                dropdownMenu.textContent = "";
            }
            if (actionContainer) {
                setSafeHTML(actionContainer, `
                    <button id="btn-popup-block" class="bp-sm">
                      Block Site
                    </button>
                `);
            }
            
            // Build preset options
            let { blockPresets = [] } = await gLocal(["blockPresets"]);
            blockPresets = (blockPresets || []).filter(p => p && p.id && p.name);
            
            // Prepare items array
            const items = [
                { id: "default_block", name: "Default (Instant)", config: { instantBlock: true } }
            ];
            blockPresets.forEach(p => {
                items.push(p);
            });

            if (dropdownMenu) {
                dropdownMenu.addEventListener("click", (evt) => {
                    evt.stopPropagation();
                });
                setSafeHTML(dropdownMenu, items.map(item => `
                    <button class="preset-dropdown-item" data-id="${item.id}" style="width:100%; text-align:left; background:none; border:none; color:var(--tx); padding:8px 12px; font-size:13px; font-weight:600; cursor:pointer; display:block; transition: all 0.2s; border-radius:8px;">
                      ${escHTML(item.name)}
                    </button>
                `).join(""));

                dropdownMenu.querySelectorAll(".preset-dropdown-item").forEach(btn => {
                    btn.addEventListener("mouseenter", () => btn.style.background = "rgba(255,255,255,0.06)");
                    btn.addEventListener("mouseleave", () => btn.style.background = "none");
                    btn.addEventListener("click", async () => {
                        const confirmed = confirm(`Are you sure you want to block ${s}? This will reload the tab and block access to this site.`);
                        if (!confirmed) return;

                        let { allowList = [] } = await gLocal(["allowList"]);
                        if (allowList.includes(s)) {
                            allowList = allowList.filter(item => item !== s);
                            await sLocal({ allowList });
                        }

                        const selectedId = btn.getAttribute("data-id");
                        const selectedPreset = items.find(p => p.id === selectedId);
                        const presetConfig = selectedPreset ? selectedPreset.config : { instantBlock: true };

                        const newRule = {
                            id: Math.random().toString(36).substring(2, 9),
                            domain: s,
                            category: getEffectiveCat(s).cat || "distraction",
                            redirectUrl: presetConfig.redirectUrl || null,
                            instantBlock: !!presetConfig.instantBlock,
                            focusOnly: !!presetConfig.focusOnly,
                            timeLimitEnabled: !!presetConfig.timeLimitEnabled,
                            dailyLimitSecs: Number(presetConfig.dailyLimitSecs) || 0,
                            scheduleEnabled: !!presetConfig.scheduleEnabled,
                            schedules: presetConfig.schedules || [],
                            sessionLimitEnabled: !!presetConfig.sessionLimitEnabled,
                            sessionLimitSecs: Number(presetConfig.sessionLimitSecs) || 300,
                            sessionCooldownSecs: Number(presetConfig.sessionCooldownSecs) || 600,
                            cooldownEnabled: !!presetConfig.cooldownEnabled,
                            cooldownTimer: Number(presetConfig.cooldownTimer) || 10,
                            cooldownFrequency: presetConfig.cooldownFrequency || "always",
                            activeDays: presetConfig.activeDays !== undefined ? presetConfig.activeDays : [0, 1, 2, 3, 4, 5, 6]
                        };

                        let { blockRules = [] } = await gLocal(["blockRules"]);
                        blockRules.push(newRule);
                        await sLocal({ blockRules });
                        await msg("TRIGGER_DNR_UPDATE");
                        chrome.tabs.reload(e[0].id);
                        window.close();
                    });
                });
            }

            const blockBtn = $("btn-popup-block");
            if (blockBtn) {
                blockBtn.addEventListener("click", (evt) => {
                    evt.stopPropagation();
                    if (dropdownMenu) {
                        const isHidden = dropdownMenu.style.display === "none" || !dropdownMenu.style.display;
                        dropdownMenu.style.display = isHidden ? "flex" : "none";
                    }
                });
            }

            document.addEventListener("click", () => {
                if (dropdownMenu) {
                    dropdownMenu.style.display = "none";
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
function recalculateDayStats(entry) {
    if (entry && entry.sites) {
        entry.productivity = 0;
        entry.learning = 0;
        entry.communication = 0;
        entry.distraction = 0;
        entry.uncategorized = 0;
        Object.entries(entry.sites).forEach(([dom, secs]) => {
            const cat = getEffectiveCat(dom).cat;
            entry[cat] = (entry[cat] || 0) + secs;
        });
    }
}
async function loadViewData() {
    $("donut-sublbl") && ($("donut-sublbl").textContent = "total" === currentView ? "all time" : "today");
    
    // Load hiddenDefaultSites
    const storageData = await gLocal(["hiddenDefaultSites"]);
    hiddenDefaultSites = storageData.hiddenDefaultSites || [];
    
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
        let rawData = n && n.data || {};
        recalculateDayStats(rawData);
        s = rawData, a = rawData.sites || {}
    } else {
        $("today-widgets") && ($("today-widgets").style.display = "none");
        $("total-widgets") && ($("total-widgets").style.display = "block");
        // FF v6.17: O(1) read of running totals instead of scanning every IDB day.
        var o = await msg("STATS_GET_ALLTIME_TOTALS");
        a = (o && o.allTimeTotals) || {};
        // Synthesize a category breakdown for the donut from the per-site totals.
        s = {};
        Object.entries(a).forEach(([dom, secs]) => {
            var c = getEffectiveCat(dom).cat;
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
                color: "var(--green)"
            }, {
                cat: "learning",
                color: "var(--purple)"
            }, {
                cat: "communication",
                color: "var(--blue)"
            }, {
                cat: "distraction",
                color: "var(--red)"
            }, {
                cat: "uncategorized",
                color: "var(--tx3)"
            }].filter(t => (e[t.cat] || 0) > 0),
            o = 0;
        n.forEach(n => {
            var c = (e[n.cat] || 0) / (t.total || 1),
                i = t.total ? Math.max(c * a, 3) : 0,
                r = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            r.setAttribute("cx", 65), r.setAttribute("cy", 65), r.setAttribute("r", 50), r.setAttribute("fill", "none"), r.setAttribute("stroke", n.color), r.setAttribute("stroke-width", 16), r.setAttribute("stroke-dasharray", i.toFixed(2) + " " + (a - i + .5).toFixed(2)), r.setAttribute("stroke-dashoffset", (-o).toFixed(2)), s.appendChild(r), o += i
        }), $("donut-total") && ($("donut-total").textContent = fmt(t.total));
        var c = $("donut-legend");
        if (c) {
            c.textContent = "";
            if (t.total) {
                [{
                    label: "Productivity",
                    secs: t.prod,
                    color: "var(--green)"
                }, {
                    label: "Learning",
                    secs: t.lrn,
                    color: "var(--purple)"
                }, {
                    label: "Communication",
                    secs: t.comms,
                    color: "var(--blue)"
                }, {
                    label: "Distraction",
                    secs: t.dist,
                    color: "var(--red)"
                }, {
                    label: "Uncategorized",
                    secs: t.other,
                    color: "var(--tx3)"
                }].filter(e => e.secs > 0).forEach(e => {
                    var row = document.createElement("div");
                    row.className = "legend-row";
                    
                    var dot = document.createElement("div");
                    dot.className = "leg-dot";
                    dot.style.background = e.color;
                    dot.style.boxShadow = "0 0 6px " + e.color;
                    
                    var info = document.createElement("div");
                    info.className = "leg-info";
                    
                    var nameSpan = document.createElement("span");
                    nameSpan.className = "leg-name";
                    nameSpan.textContent = e.label;
                    
                    var timeSpan = document.createElement("span");
                    timeSpan.className = "leg-time num";
                    timeSpan.textContent = fmt(e.secs);
                    
                    info.appendChild(nameSpan);
                    info.appendChild(timeSpan);
                    row.appendChild(dot);
                    row.appendChild(info);
                    
                    row.addEventListener("mouseenter", function() {
                        var totalEl = $("donut-total");
                        var sublblEl = $("donut-sublbl");
                        if (totalEl) {
                            totalEl.textContent = fmt(e.secs);
                            totalEl.style.color = e.color;
                        }
                        if (sublblEl) {
                            sublblEl.textContent = e.label.toLowerCase();
                            sublblEl.style.color = e.color;
                        }
                    });
                    
                    row.addEventListener("mouseleave", function() {
                        var totalEl = $("donut-total");
                        var sublblEl = $("donut-sublbl");
                        if (totalEl) {
                            totalEl.textContent = fmt(t.total);
                            totalEl.style.color = "";
                        }
                        if (sublblEl) {
                            sublblEl.textContent = "total" === currentView ? "all time" : "today";
                            sublblEl.style.color = "";
                        }
                    });
                    
                    c.appendChild(row);
                });
            } else {
                setSafeHTML(c, '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--tx3);gap:8px;"><span style="font-size:13px;font-weight:600">No data yet.</span></div>');
            }
        }
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
    if (s && (s.textContent = "", t.total)) {
        var a = Object.entries(e).sort((e, t) => t[1] - e[1]);
        var n = s._showAll || !1;
        var isToday = "today" === currentView;
        
        let htmlParts = [];
        htmlParts.push('<div class="list-hdr">' + (isToday ? "All Sites Today" : "All Time Site Usage") + ' (Click Tag to Edit)</div>');
        
        (n ? a : a.slice(0, 10)).forEach(([e, t]) => {
            var a = getEffectiveCat(e).cat,
                n = CAT_COLORS[a] || "#555555";
            htmlParts.push(`<div class="siterow"><span class="sitedom">${getFav(e)}${escHTML(e)}</span>${buildCatSelector(e, a, n)}<span class="sitetm num">${fmt(t)}</span></div>`);
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
            htmlParts.push(`
            <div style="text-align:center;padding:12px;display:flex;justify-content:center;">
              <div id="feedback-overlay-container" style="width:100%;">${overlayHtml}</div>
              <button id="show-all-btn" class="bs bs-sm" style="display:none;">Show all ${a.length} sites</button>
            </div>
            `);
            
            setSafeHTML(s, htmlParts.join(""));
            
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
        } else {
            setSafeHTML(s, htmlParts.join(""));
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
async function updatePresetNameInSettings() {
    var pres = await msg("PRESETS_GET");
    if (pres && pres.presets) {
        var ap = pres.presets.find(p => p.id === pres.activeId) || pres.presets[0];
        var nameEl = $("p-settings-preset-name");
        if (nameEl && ap) {
            nameEl.textContent = " · " + ap.name;
        }
    }
}
$("btn-focus-set") && $("btn-focus-set").addEventListener("click", async () => {
    await updatePresetNameInSettings();
    $("p-sw") && ($("p-sw").value = window._focusWorkMins), $("p-sb") && ($("p-sb").value = window._focusBreakMins), $("p-sl") && ($("p-sl").value = window._focusLongBreakMins), $("p-sc") && ($("p-sc").value = window._focusCycles), $("focus-set-panel") && ($("focus-set-panel").style.display = "flex"), $("focus-card") && ($("focus-card").style.minHeight = "280px")
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
    // CSP-compliant global fallback for broken favicon images
    document.addEventListener("error", function (e) {
        if (e.target && e.target.tagName === "IMG") {
            if (e.target.dataset.domain || e.target.id === "current-site-icon" || e.target.src.includes("icons.duckduckgo.com") || e.target.src.includes("google.com/s2/favicons")) {
                if (e.target.src !== window.FALLBACK_ICON) {
                    e.target.src = window.FALLBACK_ICON;
                }
            }
        }
    }, true);

    var pres = await msg("PRESETS_GET");
    var ap = null;
    if (pres && pres.presets) ap = pres.presets.find(p => p.id === pres.activeId) || pres.presets[0];
    var nameEl = $("p-settings-preset-name");
    if (nameEl && ap) {
        nameEl.textContent = " · " + ap.name;
    }
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
    $("p-adv-focus") && $("p-adv-focus").addEventListener("click", async (e) => {
        e.preventDefault();
        var pres = await msg("PRESETS_GET");
        var activeId = (pres && pres.activeId) || "pomodoro";
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html#focus?preset=" + activeId) });
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

    // --- Privacy Mode / Pause Tracking UI ---
    const btnPrivacy = document.getElementById("btn-privacy");
    const privacyPanel = document.getElementById("privacy-panel");
    const btnClosePrivacy = document.getElementById("btn-close-privacy");
    const privacyStatusCard = document.getElementById("privacy-status-card");
    const privacyStatusDesc = document.getElementById("privacy-status-desc");
    const btnResumeTracking = document.getElementById("btn-resume-tracking");
    const btnPrivacy30 = document.getElementById("btn-privacy-30");
    const btnPrivacy60 = document.getElementById("btn-privacy-60");
    const btnPrivacyAlways = document.getElementById("btn-privacy-always");

    const updatePrivacyUI = async () => {
        const state = await msg("GET_PRIVACY_STATE");
        const fs = await msg("FOCUS_GET_STATE");
        const focusActive = !!(fs && fs.focusState && fs.focusState.active);

        if (focusActive) {
            if (btnPrivacy) {
                btnPrivacy.style.opacity = "0.3";
                btnPrivacy.style.cursor = "not-allowed";
                btnPrivacy.title = "Privacy Mode (disabled during Focus Mode)";
            }
        } else {
            if (btnPrivacy) {
                btnPrivacy.style.opacity = "";
                btnPrivacy.style.cursor = "";
                btnPrivacy.title = "Privacy Mode / Pause Tracking";
            }
        }

        if (state && state.active) {
            if (privacyStatusCard) privacyStatusCard.style.display = "block";
            if (privacyPanel) privacyPanel.style.display = "none";
            
            if (state.until > 0) {
                if (window._privacyCountdownTick) clearInterval(window._privacyCountdownTick);
                const tick = () => {
                    const diff = state.until - Date.now();
                    if (diff <= 0) {
                        clearInterval(window._privacyCountdownTick);
                        updatePrivacyUI();
                    } else {
                        const m = Math.floor(diff / 60000);
                        const s = Math.floor((diff % 60000) / 1000);
                        if (privacyStatusDesc) {
                            privacyStatusDesc.textContent = `Tracking & blocking paused for ${m}m ${String(s).padStart(2, '0')}s`;
                        }
                    }
                };
                tick();
                window._privacyCountdownTick = setInterval(tick, 1000);
            } else {
                if (privacyStatusDesc) {
                    privacyStatusDesc.textContent = "Tracking & blocking paused indefinitely";
                }
            }
        } else {
            if (privacyStatusCard) privacyStatusCard.style.display = "none";
            if (window._privacyCountdownTick) clearInterval(window._privacyCountdownTick);
        }
    };

    if (btnPrivacy) {
        btnPrivacy.addEventListener("click", async () => {
            const fs = await msg("FOCUS_GET_STATE");
            if (fs && fs.focusState && fs.focusState.active) {
                return;
            }
            if (privacyPanel) {
                const isOpening = privacyPanel.style.display !== "block";
                if (isOpening) {
                    if (!await promptPinIfEnabled("lockPrivacy")) return;
                }
                privacyPanel.style.display = isOpening ? "block" : "none";
            }
        });
    }

    if (btnClosePrivacy && privacyPanel) {
        btnClosePrivacy.addEventListener("click", () => {
            privacyPanel.style.display = "none";
        });
    }

    if (btnPrivacy30) {
        btnPrivacy30.addEventListener("click", async () => {
            await msg("START_PRIVACY_MODE", { duration: 30 });
            if (privacyPanel) privacyPanel.style.display = "none";
            updatePrivacyUI();
        });
    }

    if (btnPrivacy60) {
        btnPrivacy60.addEventListener("click", async () => {
            await msg("START_PRIVACY_MODE", { duration: 60 });
            if (privacyPanel) privacyPanel.style.display = "none";
            updatePrivacyUI();
        });
    }

    if (btnPrivacyAlways) {
        btnPrivacyAlways.addEventListener("click", async () => {
            await msg("START_PRIVACY_MODE", { duration: 0 });
            if (privacyPanel) privacyPanel.style.display = "none";
            updatePrivacyUI();
        });
    }

    if (btnResumeTracking) {
        btnResumeTracking.addEventListener("click", async () => {
            if (!await promptPinIfEnabled("lockPrivacy")) return;
            await msg("STOP_PRIVACY_MODE");
            updatePrivacyUI();
        });
    }

    updatePrivacyUI();

}

initPopup();
// FF v6.16: track interval so we can clear it when the popup closes — otherwise
// it fires one extra time after unload and triggers a dead message send.
const _popupRefreshInterval = setInterval(loadViewData, 6e4);
window.addEventListener("unload", () => {
    clearInterval(_popupRefreshInterval);
    if (window._pauseCountdownTick) clearInterval(window._pauseCountdownTick);
    if (window._privacyCountdownTick) clearInterval(window._privacyCountdownTick);
    if (window._focusTick) clearInterval(window._focusTick);
});

// FF v5.0: emoji preset rail. Clicking switches active preset (disabled while focus is running).
async function renderPresetRail(pres) {
    var rail = $("preset-rail");
    if (!rail || !pres || !pres.presets) return;
    var active = pres.activeId;
    var fs = await msg("FOCUS_GET_STATE");
    var locked = !!(fs && fs.focusState && fs.focusState.active);
    setSafeHTML(rail, pres.presets.map(p => {
        var isAct = p.id === active;
        return '<button title="' + escHTML(p.name || '') + (locked ? ' (locked while focus is running)' : '') +
            '" data-pid="' + escHTML(p.id || '') + '" ' + (locked ? 'disabled' : '') +
            ' style="background:' + (isAct ? 'var(--bg3)' : 'transparent') +
            ';border:1px solid ' + (isAct ? 'var(--bd2)' : 'transparent') +
            ';border-radius:8px;width:26px;height:26px;font-size:14px;cursor:' +
            (locked ? 'not-allowed' : 'pointer') + ';opacity:' + (locked ? '0.4' : '1') +
            ';display:inline-flex;align-items:center;justify-content:center;padding:0;line-height:1;">' +
            escHTML(p.emoji || '') + '</button>';
    }).join(""));
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
            updatePresetNameInSettings();
        });
    });
}

