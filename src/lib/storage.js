// FocusFlow shared storage + date helpers — single source of truth.
// Loaded via importScripts() in the service worker AND via <script src> in pages.
// Exposes: gSync, sSync, gLocal, sLocal, todayKey on globalThis.
(function (root) {
  // Polyfill chrome.storage.session with chrome.storage.local if session storage is unsupported (like in Firefox)
  if (typeof chrome !== "undefined" && chrome.storage && !chrome.storage.session) {
    chrome.storage.session = chrome.storage.local;
  }

  function _logErr(label) {
    try {
      const err = chrome.runtime.lastError;
      if (err) console.warn("[FF storage]", label, err.message);
    } catch (_) {}
  }

  // FF v6.18: Smart Memory Cache to prevent 48x redundant disk reads of sync settings
  let _syncCache = null;
  let _syncCachePromise = null;
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && (changes.settings || changes.focusPresets)) {
        _syncCache = null;
      }
    });
  } catch (_) {}

  root.gSync = function (keys) {
    if (_syncCache) {
      if (!keys) return Promise.resolve(_syncCache);
      const resObj = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      let hit = true;
      keysArr.forEach(k => {
        if (_syncCache[k] === undefined) hit = false;
        else resObj[k] = _syncCache[k];
      });
      if (hit) return Promise.resolve(resObj);
    }

    if (_syncCachePromise) {
      return _syncCachePromise.then(() => {
        if (_syncCache) {
          if (!keys) return _syncCache;
          const resObj = {};
          const keysArr = Array.isArray(keys) ? keys : [keys];
          let hit = true;
          keysArr.forEach(k => {
            if (_syncCache[k] === undefined) hit = false;
            else resObj[k] = _syncCache[k];
          });
          if (hit) return resObj;
        }
        return root.gSync(keys);
      });
    }

    const p = new Promise((res) =>
      chrome.storage.sync.get(keys, (r) => {
        _logErr("gSync");
        const data = r || {};
        
        // Data Guard: Sanitize settings shape and types
        if (data.settings !== undefined) {
          let s = data.settings;
          if (typeof s !== "object" || s === null || Array.isArray(s)) {
            s = {};
          }
          s.idleTimeout = typeof s.idleTimeout === "number" ? s.idleTimeout : 30;
          s.customNewTab = typeof s.customNewTab === "boolean" ? s.customNewTab : false;
          s.passcodeEnabled = typeof s.passcodeEnabled === "boolean" ? s.passcodeEnabled : false;
          s.passcodeHash = typeof s.passcodeHash === "string" ? s.passcodeHash : "";
          s.freeTimeHours = Array.isArray(s.freeTimeHours) ? s.freeTimeHours : [];
          
          const lockFlags = [
            "lockDash", "lockSettings", "lockStop", "lockRules", 
            "lockFreetime", "lockDanger", "lockTweaks", 
            "lockFocusScheds", "lockFocusPresets"
          ];
          lockFlags.forEach(f => {
            s[f] = typeof s[f] === "boolean" ? s[f] : (f !== "lockDash" && f !== "lockSettings");
          });
          data.settings = s;
        }

        _syncCache = { ...(_syncCache || {}), ...data };
        res(data);
      })
    );
    
    _syncCachePromise = p;
    p.finally(() => { _syncCachePromise = null; });
    return p;
  };
  root.sSync = function (obj) {
    // FF v6.18: Synchronously invalidate local cache the millisecond we write to avoid stale tab reads
    if (obj && (obj.settings !== undefined || obj.focusPresets !== undefined)) {
      _syncCache = null;
    }
    return new Promise((res) =>
      chrome.storage.sync.set(obj, (r) => {
        _logErr("sSync");
        res(r);
      })
    );
  };
  root.gLocal = function (keys) {
    return new Promise((res) =>
      chrome.storage.local.get(keys, (r) => {
        _logErr("gLocal");
        const data = r || {};
        
        // Data Guard: Sanitize cooldownConfig shape and types
        if (data.cooldownConfig !== undefined) {
          let cc = data.cooldownConfig;
          if (typeof cc !== "object" || cc === null || Array.isArray(cc)) {
            cc = {};
          }
          cc.domains = Array.isArray(cc.domains) ? cc.domains : [];
          cc.settings = (typeof cc.settings === "object" && cc.settings !== null && !Array.isArray(cc.settings)) ? cc.settings : {};
          cc.reasons = (typeof cc.reasons === "object" && cc.reasons !== null && !Array.isArray(cc.reasons)) ? cc.reasons : {};
          data.cooldownConfig = cc;
        }
        res(data);
      })
    );
  };
  root.sLocal = function (obj) {
    return new Promise((res) =>
      chrome.storage.local.set(obj, (r) => {
        _logErr("sLocal");
        res(r);
      })
    );
  };

  // FF v6.6: session storage helpers — data cleared automatically when browser closes.
  // Use for transient runtime state (activeSession, wentIdleAt, lastMediaPing).
  root.gSession = function (keys) {
    return new Promise((res) =>
      chrome.storage.session.get(keys, (r) => {
        _logErr("gSession");
        res(r || {});
      })
    );
  };
  root.sSession = function (obj) {
    return new Promise((res) =>
      chrome.storage.session.set(obj, (r) => {
        _logErr("sSession");
        res(r);
      })
    );
  };

  root.todayKey = function () {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  };
})(typeof self !== "undefined" ? self : this);
