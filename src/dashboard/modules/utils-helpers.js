/**
 * Pure Utility Helpers for Flow Dashboard
 * Zero UI dependency - standalone helper functions.
 */

export function uid() {
    return (typeof crypto !== "undefined" && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : (Math.random().toString(36).slice(2) + Date.now().toString(36));
}

export function sanitizeDomain(d) {
    return String(d).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatTime12(time24) {
    if (!time24) return "—";
    const parts = time24.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    if (isNaN(h)) return "—";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}
