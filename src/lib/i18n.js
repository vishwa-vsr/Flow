// Flow i18n helper — translates strings via chrome.i18n and auto-translates
// HTML elements that use data-i18n attributes.
//
// Loaded the same way as constants.js:
//   - Service worker:  importScripts('src/lib/i18n.js')
//   - HTML pages:      <script src="src/lib/i18n.js"></script>
//
// ── Usage ──────────────────────────────────────────────────────────────
//
// 1) In JavaScript — get a translated string:
//
//      t_("btnStart")                       => "▶ Start"
//      t_("showAllSites", ["42"])            => "Show all 42 sites"
//      t_("minWorkBreak", ["25", "5"])       => "25 min work · 5 min break"
//
//    If the key has no translation, t_() returns the key itself as a
//    fallback so your UI never shows a blank string.
//
// 2) In HTML — mark elements for automatic translation:
//
//      <span data-i18n="btnStart"></span>         => sets textContent
//      <button data-i18n-title="settings"></button> => sets title attribute
//      <input data-i18n-placeholder="enterPin">   => sets placeholder attribute
//
//    Then call translatePage() once the DOM is ready:
//
//      document.addEventListener("DOMContentLoaded", translatePage);
//
// ───────────────────────────────────────────────────────────────────────

(function (root) {

  root.customMessages = null;

  /**
   * replacePlaceholders(messageObj, subs) — helper to substitute placeholders ($1, $2, ...)
   * in messages.json with arguments when customMessages is active.
   */
  function replacePlaceholders(messageObj, subs) {
    var message = messageObj.message;
    if (!subs) return message;
    if (typeof subs === "string") {
      subs = [subs];
    }
    if (!messageObj.placeholders) return message;

    var keys = Object.keys(messageObj.placeholders);
    for (var i = 0; i < keys.length; i++) {
      var pKey = keys[i];
      var pVal = messageObj.placeholders[pKey];
      if (pVal && pVal.content) {
        var idxMatch = pVal.content.match(/\$(\d+)/);
        if (idxMatch) {
          var idx = parseInt(idxMatch[1], 10) - 1;
          if (idx >= 0 && idx < subs.length) {
            message = message.split("$" + pKey + "$").join(subs[idx]);
          }
        }
      }
    }
    return message;
  }

  /**
   * initI18n() — loads saved language override preference and caches custom translations.
   */
  root.initI18n = async function () {
    try {
      if (typeof gSync === "function") {
        var res = await gSync(["settings"]);
        var settings = res && res.settings ? res.settings : {};
        var lang = settings.language || "default";

        if (lang !== "default") {
          var url = chrome.runtime.getURL("_locales/" + lang + "/messages.json");
          var response = await fetch(url);
          root.customMessages = await response.json();
        }
      }
    } catch (e) {
      console.warn("[Flow i18n] Failed to load custom override language:", e);
    }
  };

  /**
   * t_(key, subs) — look up a translated string.
   *
   * @param {string} key   - The message key from messages.json (e.g. "btnStart").
   * @param {string|string[]} [subs] - Optional substitution string or array of strings for
   *                            placeholders ($1, $2, …) defined in messages.json.
   * @returns {string} The translated message, or the raw key if no translation
   *                   is found (so the UI never shows blank text).
   */
  root.t_ = function (key, subs) {
    // If a manual language override has loaded localizations, use it
    if (root.customMessages && root.customMessages[key]) {
      return replacePlaceholders(root.customMessages[key], subs);
    }

    // Otherwise, fall back to default chrome.i18n behavior
    var msg = "";
    try {
      msg = chrome.i18n.getMessage(key, subs);
    } catch (e) {
      // chrome.i18n may not exist outside extension contexts (e.g. tests).
    }
    return msg || key;
  };

  // Expose as t as well for standard cases where it does not conflict
  root.t = root.t_;

  /**
   * translatePage() — walk the DOM and translate every element that has
   * a data-i18n, data-i18n-title, or data-i18n-placeholder attribute.
   *
   * Call this once after the DOM is loaded:
   *   document.addEventListener("DOMContentLoaded", translatePage);
   *
   * Attribute reference:
   *   data-i18n="key"             → sets element.textContent
   *   data-i18n-title="key"       → sets element.title
   *   data-i18n-placeholder="key" → sets element.placeholder
   */
  root.translatePage = function () {
    // --- textContent ---
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      if (key) {
        nodes[i].textContent = root.t_(key);
      }
    }

    // --- title attribute ---
    var titleNodes = document.querySelectorAll("[data-i18n-title]");
    for (var j = 0; j < titleNodes.length; j++) {
      var titleKey = titleNodes[j].getAttribute("data-i18n-title");
      if (titleKey) {
        titleNodes[j].title = root.t_(titleKey);
      }
    }

    // --- placeholder attribute ---
    var phNodes = document.querySelectorAll("[data-i18n-placeholder]");
    for (var k = 0; k < phNodes.length; k++) {
      var phKey = phNodes[k].getAttribute("data-i18n-placeholder");
      if (phKey) {
        phNodes[k].placeholder = root.t_(phKey);
      }
    }
  };

})(typeof self !== "undefined" ? self : this);
