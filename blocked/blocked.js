// Flow v6.5 — Blocked Page
// New: show rule that fired, "unblock for 5 min" (PIN-gated), last productive site, rotating quotes.



const MSGS = [
  { e: "🧱", h: "Not today, champ.", s: "Your future self said NO. They were very firm about it." },
  { e: "🤖", h: "ACCESS DENIED.", s: "The productivity bot has spoken. Resistance is futile." },
  { e: "🧠", h: "Big Brain Move.", s: "You blocked this. Past-you was smarter than you right now." },
  { e: "🚪", h: "The door is locked.", s: "You put the lock there. You gave me the key. Not giving it back." },
  { e: "🏋️", h: "Your discipline called.", s: "It wants you back. It misses you. Go do the thing." },
  { e: "⛔", h: "NOPE. Absolutely not.", s: "Come back when you earned it. You know what to do." },
  { e: "🦾", h: "Stay hard.", s: "The work does not do itself. Go back to it." },
  { e: "🐤", h: "Bock bock bock!", s: "That is the sound of procrastination. Don't be a chicken." },
];

const RULE_LABELS = {
  instant: "Instant Block Active",
  schedule: "Schedule Block Active",
  time_limit: "Daily Limit Reached",
  session_limit: "Session Limit Reached",
  manual: "Manually Blocked",
  tweak: "Distracting Section Blocked",
};

const RULE_DETAIL = {
  instant: "This site is set to always block.",
  schedule: "This site is blocked during your scheduled block hours.",
  time_limit: "You have hit your daily time limit for this site.",
  session_limit: "You have hit your per-session limit for this site. Take a break!",
  manual: "You added this site to your block list.",
  tweak: "Access to this specific section is blocked by your Advanced Site Tweaks.",
};

// ── Parse params ──────────────────────────────────────────────────────────────
function safeAtob(str) {
  try {
    return atob(str);
  } catch (e) {
    return str;
  }
}
var qs = new URLSearchParams(window.location.search || "");
var hs = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
function P(k1, k2) { return qs.get(k1) || qs.get(k2) || hs.get(k1) || hs.get(k2) || ""; }
var rawDomain = P("domain", "d") || "this site";
var blockedDomain = rawDomain;
if (rawDomain && rawDomain !== "this site") {
  var decoded = safeAtob(rawDomain);
  if (decoded && decoded.includes(".")) {
    blockedDomain = decoded;
  }
}
var reason = P("reason", "r") || "rule";
var limit = Number(P("limit", "l") || 0);

// ── Randomise message (Funny vs. Neutral) ─────────────────────────────────────
gSync(["settings"]).then(function (res) {
  var settings = res.settings || {};
  var funnyBlocked = settings.funnyBlocked !== false;
  if (funnyBlocked) {
    var m = MSGS[Math.floor(Math.random() * MSGS.length)];
    document.getElementById("emoji").textContent = m.e;
    document.getElementById("headline").textContent = m.h;
    document.getElementById("sub").textContent = m.s;
  } else {
    document.getElementById("emoji").textContent = "⛔";
    document.getElementById("headline").innerHTML = "This site is <em>blocked</em>";
    document.getElementById("sub").textContent = "Access is restricted by your Flow rules.";
  }
});
document.querySelector(".quote").textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ── Domain pill & bar reason ──────────────────────────────────────────────────
document.getElementById("domain-pill").textContent = blockedDomain;
document.getElementById("bar-reason").textContent = RULE_LABELS[reason] || "Block Rule Active";

// ── Badge — shows which rule fired + any detail ───────────────────────────────
function formatTime12(timeStr) {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return displayH + ":" + mStr + " " + ampm;
}

var badge = document.getElementById("badge");
var schedEnd = P("sched_end");
var cooldownEnds = Number(P("cooldown_ends") || 0);

if (reason === "time_limit" && limit > 0) {
  badge.textContent = "Daily limit · " + Math.round(limit / 60) + " min spent";
} else if (reason === "schedule" && schedEnd) {
  badge.textContent = "Blocked until " + formatTime12(schedEnd);
} else if (reason === "session_limit" && cooldownEnds > 0) {
  function tickCooldown() {
    var diff = Math.max(0, Math.round((cooldownEnds - Date.now()) / 1000));
    if (diff <= 0) {
      badge.textContent = "Cooldown over! Refresh page to visit.";
      badge.style.color = "var(--green)";
    } else {
      var m = Math.floor(diff / 60);
      var s = diff % 60;
      badge.textContent = "Take a break · unblocking in " + m + "m " + String(s).padStart(2, "0") + "s";
      setTimeout(tickCooldown, 1000);
    }
  }
  tickCooldown();
} else {
  badge.textContent = RULE_LABELS[reason] || "Blocked by Flow";
}
badge.className = "badge " + (RULE_LABELS[reason] ? reason : "");

// ── Rule detail ───────────────────────────────────────────────────────────────
var ruleDetail = document.getElementById("rule-detail");
if (ruleDetail) {
  if (reason === "schedule" && schedEnd) {
    ruleDetail.textContent = "This site is blocked until " + formatTime12(schedEnd) + " by your schedule.";
  } else {
    ruleDetail.textContent = RULE_DETAIL[reason] || "This site has been blocked by one of your rules.";
  }
}

// ── Last productive site suggestion ──────────────────────────────────────────
try {
  msg("GET_LAST_PRODUCTIVE").then(function (res) {
    if (!res || !res.domain) return;
    var el = document.getElementById("productive-suggestion");
    if (!el) return;
    var safeDom = escHTML(res.domain);
    el.innerHTML = 'Go do something useful: <a href="https://' + safeDom + '" class="prod-link">' + safeDom + ' →</a>';
    el.style.display = "block";
  });
} catch (_) { }




// ── Back button ───────────────────────────────────────────────────────────────
document.getElementById("btn-back").addEventListener("click", function () {
  if (window.history.length > 2) {
      window.history.back();
  } else if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.update({ url: "chrome://newtab/" });
  } else {
      window.location.href = "https://www.google.com";
  }
});

document.getElementById("btn-set").addEventListener("click", function () {
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ url: chrome.runtime.getURL("dashboard/index.html*") }, function (tabs) {
      if (tabs && tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { url: chrome.runtime.getURL("dashboard/index.html#sitemanager"), active: true });
        if (tabs[0].windowId) {
          chrome.windows.update(tabs[0].windowId, { focused: true });
        }
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html#sitemanager") });
      }
    });
  } else {
    chrome.runtime.openOptionsPage();
  }
});


