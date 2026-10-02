/**
 * Category and Preset Helper Utilities for Flow Dashboard
 * Handles category accent colors, emojis, labels, and timer preset names.
 */

export function getPresetName(id, name) {
    if (typeof self !== "undefined" && typeof self.getPresetName === "function") {
        return self.getPresetName(id, name);
    }
    const normId = id === "deep_work" ? "deep-work" : (id === "sprint" ? "short-sprint" : id);
    if (name) {
        if (normId === "pomodoro" && name !== "Pomodoro") return name;
        if (normId === "deep-work" && name !== "Deep Work") return name;
        if (normId === "short-sprint" && name !== "Short Sprint") return name;
        if (normId === "custom" && name !== "Flow") return name;
        if (normId !== "pomodoro" && normId !== "deep-work" && normId !== "short-sprint" && normId !== "custom") return name;
    }
    const t = (typeof t_ === "function") ? t_ : (k => k);
    if (normId === "pomodoro") return t("presetPomodoro") || name || "Pomodoro";
    if (normId === "deep-work") return t("presetDeepWork") || name || "Deep Work";
    if (normId === "short-sprint") return t("presetShortSprint") || name || "Short Sprint";
    if (normId === "custom") return t("presetFlow") || name || "Flow";
    return name || id;
}

export function catColor(e) {
    if (typeof getCatColor === "function") return getCatColor(e);
    const colors = (typeof CAT_COLORS !== "undefined" && CAT_COLORS) ? CAT_COLORS : null;
    const meta = (typeof CAT_META !== "undefined" && CAT_META) ? CAT_META : {};
    if (colors && colors[e]) return colors[e];
    return (meta[e] || { color: "#555555" }).color || "#555555";
}

export function catEmoji(e) {
    if (typeof getCatEmoji === "function") return getCatEmoji(e);
    const emojis = (typeof CAT_EMOJI !== "undefined" && CAT_EMOJI) ? CAT_EMOJI : null;
    const meta = (typeof CAT_META !== "undefined" && CAT_META) ? CAT_META : {};
    if (emojis && emojis[e]) return emojis[e];
    return (meta[e] || { emoji: "🏷️" }).emoji || "🏷️";
}

export function catLabel(e, t) {
    if (typeof getCatLabel === "function") {
        const lbl = getCatLabel(e);
        return t ? lbl + " ✨" : lbl;
    }
    const tr = (typeof t_ === "function") ? t_ : (k => k);
    var key = "cat" + e.charAt(0).toUpperCase() + e.slice(1);
    var trans = tr(key);
    var label = (trans && trans !== key) ? trans : null;
    if (!label) {
        const labels = (typeof CAT_LABELS !== "undefined" && CAT_LABELS) ? CAT_LABELS : null;
        if (labels && labels[e]) label = labels[e];
    }
    if (!label) {
        const meta = (typeof CAT_META !== "undefined" && CAT_META) ? CAT_META : {};
        label = (meta[e] || { label: e }).label;
    }
    return t ? label + " ✨" : label;
}

export function allCats() {
    return (typeof DEFAULT_CATS !== "undefined" && Array.isArray(DEFAULT_CATS))
        ? DEFAULT_CATS
        : ["productivity", "learning", "distraction", "communication", "uncategorized"];
}

export function isDefaultSiteHidden(d, hiddenList) {
    if (typeof self !== "undefined" && typeof self.isDefaultSiteHidden === "function") {
        return self.isDefaultSiteHidden(d, hiddenList);
    }
    const list = Array.isArray(hiddenList)
        ? hiddenList
        : (typeof window !== "undefined" && Array.isArray(window.hiddenDefaultSites) ? window.hiddenDefaultSites : []);
    if (!list.length || !d) return false;
    if (list.includes(d)) return true;
    const parts = d.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
        if (list.includes(parts.slice(i).join("."))) return true;
    }
    return false;
}

