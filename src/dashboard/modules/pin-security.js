/**
 * PIN Security Modal Manager for Flow Dashboard
 * Manages 6-digit PIN verification overlay, dot indicators, and security gate checks.
 */

let pcRes = null;
let pcBuf = "";

const $ = (e) => document.getElementById(e);

export function updDots() {
    const dotsEl = $("pdots");
    if (dotsEl) {
        dotsEl.querySelectorAll("span").forEach((e, t) => e.classList.toggle("on", t < pcBuf.length));
    }
}

export function showPass(cancelable = false, titleText, descText) {
    const tr = (typeof t_ === "function") ? t_ : (k => k);
    const title = titleText || tr("settingsLocked") || "Settings Locked";
    const desc = descText || tr("enterPin") || "Enter your 6-digit PIN to continue";
    return new Promise(n => {
        pcRes = n;
        pcBuf = "";
        updDots();
        if ($("pc-title")) $("pc-title").textContent = title;
        if ($("pc-desc")) $("pc-desc").textContent = desc;
        if ($("pcerr")) $("pcerr").classList.add("hide");
        if ($("pccancel")) {
            if (cancelable) $("pccancel").classList.remove("hide");
            else $("pccancel").classList.add("hide");
        }
        if ($("pcOverlay")) $("pcOverlay").classList.remove("hide");
    });
}

export async function checkGate() {
    const tr = (typeof t_ === "function") ? t_ : (k => k);
    const fetchSync = (typeof gSync === "function") ? gSync : (async () => ({}));
    var e = (await fetchSync(["settings"])).settings || {};
    if (!e.passcodeHash || !1 === e.lockSettings) return !0;
    for (;;) {
        if (await showPass(!1, tr("settingsLocked") || "Settings Locked", tr("enterPinToAccessSettings") || "Enter your 6-digit PIN to access settings.")) return !0;
    }
}

export async function promptPinIfEnabled(key) {
    const tr = (typeof t_ === "function") ? t_ : (k => k);
    const fetchSync = (typeof gSync === "function") ? gSync : (async () => ({}));
    var t = (await fetchSync(["settings"])).settings || {};
    return !t.passcodeHash || !1 === t[key] || await showPass(!0, tr("verificationRequired") || "Verification Required", tr("enterPinToPerformAction") || "Enter your PIN to perform this action.");
}

export function initPinEventListeners() {
    const pccancel = $("pccancel");
    if (pccancel) {
        pccancel.onclick = () => {
            if ($("pcOverlay")) $("pcOverlay").classList.add("hide");
            if (pcRes) pcRes(false);
        };
    }

    document.querySelectorAll(".pk[data-n]").forEach(e => {
        e.onclick = () => {
            if (pcBuf.length < 6) {
                pcBuf += e.getAttribute("data-n");
                updDots();
            }
        };
    });

    const pclr = $("pclr");
    if (pclr) {
        pclr.onclick = () => {
            pcBuf = pcBuf.slice(0, -1);
            updDots();
        };
    }

    const pcok = $("pcok");
    if (pcok) {
        pcok.onclick = async () => {
            if (pcBuf.length >= 4) {
                const fetchSync = (typeof gSync === "function") ? gSync : (async () => ({}));
                const saveSync = (typeof sSync === "function") ? sSync : (async () => ({}));
                const verifyPin = (typeof verifyAndMigratePin === "function") ? verifyAndMigratePin : (async () => ({ success: false }));

                var e = await fetchSync(["settings"]);
                const settings = e.settings || {};
                const res = await verifyPin(pcBuf, settings.passcodeHash);
                if (res.success) {
                    if (res.migratedHash) {
                        settings.passcodeHash = res.migratedHash;
                        await saveSync({ settings });
                    }
                    if ($("pcOverlay")) $("pcOverlay").classList.add("hide");
                    if (pcRes) pcRes(true);
                } else {
                    if ($("pcerr")) $("pcerr").classList.remove("hide");
                    pcBuf = "";
                    updDots();
                }
            }
        };
    }

    document.addEventListener("keydown", e => {
        const overlay = $("pcOverlay");
        if (overlay && !overlay.classList.contains("hide")) {
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
                if (pcBuf.length >= 4 && pcok) {
                    pcok.click();
                }
            } else if ("Escape" === e.key && pccancel && !pccancel.classList.contains("hide")) {
                e.preventDefault();
                e.stopPropagation();
                pccancel.click();
            }
        }
    }, true);
}
