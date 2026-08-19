/**
 * Category and Preset Helper Utilities for Flow Dashboard
 * Handles category accent colors, emojis, labels, and timer preset names.
 */

export function getPresetName(id, name) {
    if (name) {
        if (id === "pomodoro" && name !== "Pomodoro") return name;
        if (id === "deep-work" && name !== "Deep Work") return name;
        if (id === "short-sprint" && name !== "Short Sprint") return name;
        if (id === "custom" && name !== "Flow") return name;
        if (id !== "pomodoro" && id !== "deep-work" && id !== "short-sprint" && id !== "custom") return name;
    }
    const t = (typeof t_ === "function") ? t_ : (k => k);
    if (id === "pomodoro") return t("presetPomodoro") || name || "Pomodoro";
    if (id === "deep-work") return t("presetDeepWork") || name || "Deep Work";
    if (id === "short-sprint") return t("presetShortSprint") || name || "Short Sprint";
    if (id === "custom") return t("presetFlow") || name || "Flow";
    return name || id;
}

export function catColor(e) {
    const colors = (typeof CAT_COLORS !== "undefined" && CAT_COLORS) ? CAT_COLORS : null;
    const meta = (typeof CAT_META !== "undefined" && CAT_META) ? CAT_META : {};
    if (colors && colors[e]) return colors[e];
    return (meta[e] || { color: "#555555" }).color || "#555555";
}

export function catEmoji(e) {
    const emojis = (typeof CAT_EMOJI !== "undefined" && CAT_EMOJI) ? CAT_EMOJI : null;
    const meta = (typeof CAT_META !== "undefined" && CAT_META) ? CAT_META : {};
    if (emojis && emojis[e]) return emojis[e];
    return (meta[e] || { emoji: "🏷️" }).emoji || "🏷️";
}

export function catLabel(e, t) {
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
    return ["productivity", "learning", "distraction", "communication", "uncategorized"];
}
