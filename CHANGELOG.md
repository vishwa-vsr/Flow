# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [10.0.5] - 2026-07-26

### Fixed
- **Firefox Bookmark & Search Bar Navigation Redirection:** Fixed an issue in Mozilla Firefox where clicking a blocked site from the bookmark bar or address/search bar failed to open the custom Block Screen page (`blocked/index.html`). Updated declarativeNetRequest rules from hard-blocking network requests (`type: "block"`) to native extension redirects (`type: "redirect"` with `extensionPath`), enabling instant network-level redirection directly to the blocked page across all navigation sources in Firefox.
- **Focus Mode Action Button Alignment:** Fixed vertical misalignment between SVG icons and text labels on Focus action buttons ("Stop" and "Skip") by enforcing flexbox centering (`display: inline-flex`, `align-items: center`, `gap: 8px`) across global button styles and preserving SVG elements during state updates.
- **Focus Timer Cycle Completion & Auto-Restart Fix:** Fixed an issue where completing focus cycles caused the timer to endlessly restart from 0 cycles. Synchronized `FOCUS_GET_STATE` in the background service worker to evaluate phase completion synchronously, prevented background schedule alarms from resetting active sessions, and added explicit `Cycle X of Y` progress indicators across the Dashboard and Extension Popup.

## [10.0.4] - 2026-07-26

### Fixed
- **Dynamic Category Color Propagation in Timeline & Charts:** Fixed custom category color updates (e.g. changing Learning/Study accent color) to dynamically recalculate and repaint timeline blocks, card stat numbers, glow indicators, and legend dots in the 24-Hour Active Timeline and Daily Breakdown views.
- **Comparison Tab Dynamic Category Styling:** Updated Comparison tab line and bar chart gradient fills, dataset border colors, and top chart toggle dots (`chart-tog-dot`) to dynamically render active custom category accent colors instead of fallback hardcoded styles.
- **Extension Popup SVG Donut & Live Storage Sync:** Fixed popup SVG donut chart arc segments to dynamically pull custom category accent colors, and added a live `chrome.storage.onChanged` listener to instantly reflect category edits made in the dashboard without manual popup re-opens.
- **Comparison Chart Horizontal Wheel Scrolling:** Fixed an issue where rotating the mouse wheel over the wide comparison charts scrolled the web page vertically up and down instead of sliding the chart horizontally. Added smart wheel listener that converts wheel scroll into horizontal chart sliding, and smoothly hands control back to normal web page scrolling once the chart boundary is reached.
- **Custom Focus Preset Name Sync:** Fixed an issue where editing a focus preset's name (e.g., renaming "Pomodoro" to "Study Sprint") was overridden by localized default fallback strings. Custom preset names now persist across the Dashboard, preset selection rail, and Extension Popup.
- **Extension Popup Syntax Error Resolution:** Resolved a JavaScript syntax error in `popup.js` (`Uncaught SyntaxError: Unexpected token ';'`) when retrieving localized preset names.

## [10.0.3] - 2026-07-25

### Added
- **Custom Editable Categories:** Added full customization for Category Name, Emoji, and Accent Color across core categories (Productivity, Learning, Distraction, Communication) in Smart Presets & Categories tab, featuring an instant "Reset to Default" option.
- **Cross-Context Category Sync:** Added real-time category storage sync so custom category names, emojis, and accent colors propagate automatically across the Extension Popup, Background Service Worker, and Dashboard.
- **Expanded Global Translations (Japanese, German, Brazilian Portuguese):** Added 3 new native languages (`ja`, `de`, `pt_BR`) with 100% key parity across all 777 translation keys, expanding settings language dropdown options.
- **Complete Popup Localization:** Translated all popup interface elements (Today/All Time tabs, Focus Timer labels, Start/Stop/Pause/Skip buttons, Weekly Goal, Site Tweaks, Privacy Mode, Block/Unblock buttons, Category labels) across all 8 supported languages.
- **Full Extension-Wide Translation Coverage:** Translated all remaining 777 keys across all 8 locales including blocked page messages, analytics descriptions, site manager labels, focus presets, rule confirmations, backup/import toasts, day names, and schedule notifications.

### Changed
- **Flat Modern UI (Green Glow Removal):** Removed green `box-shadow` glows from active Quick Preset cards, Count Towards Goals checkboxes, play button hovers, logo animations, day dots, and popup category selection pills for a clean, modern aesthetic.
- **Dynamic Category Rendering:** Updated Analytics Overview cards, Donut Chart & Legend, Heatmap Settings modal, Daily Breakdown tab, Count Towards Goals checkboxes, and Popup dropdowns to render custom category names, emojis, and accent colors dynamically.
- **Theme Cycling Optimization:** Streamlined popup theme switching to transition directly from `cinematic` to `dark` theme, skipping deprecated custom theme states.
- **Site Name Typography (Manrope Font):** Updated site domain names across Top Sites, Daily Breakdown, and Site Manager lists to use the embedded `Manrope` font (`manrope.woff2`) for clean typography consistency.
- **Search Input Glow Removal:** Removed green focus `box-shadow` glows and outlines from all search bars (`.ff-search`) and text input fields across Top Sites, Site Manager, and modals.
- **Dead Code & Legacy Cleanups:** Cleaned up unused legacy comments, obsolete function references, and redundant declarations across `service-worker.js` and `dashboard.js`.

### Fixed
- **Rule Unique ID Queue:** Implemented task queuing for `declarativeNetRequest` dynamic rule updates to serialize background rule modifications and eliminate duplicate rule ID errors.
- **Heatmap Thresholds Modal Stacking:** Fixed duplicate event listener registration and overlay stacking when switching tabs, ensuring the Cancel button, Cross (✕) button, and backdrop click close the modal immediately.
- **Instant Category Edit Re-rendering:** Fixed delayed UI updates when saving or resetting category edits, triggering immediate live re-renders across Focus Mode and Analytics tabs.
- **Analytics Header Localization Fix:** Fixed a bug in `hideAnalyticsHeader()` where the top title header was hardcoded to match English `"Analytics"`, causing localized headers like `"Analíticas"` in Spanish to remain visible.
- **Edit Category Modal Localization:** Added full multi-language translations across all 8 supported locales (`en`, `es`, `zh_CN`, `zh_HK`, `zh_TW`, `ja`, `de`, `pt_BR`) for the Edit Category modal (title, input labels, color swatch headers, and reset/cancel/save buttons).
- **PIN Security Modal Localization:** Added full multi-language translations across all 8 supported locales for the PIN Security verification popup header and instruction text.
- **Site Manager Sub-Tabs & Form Localization:** Added full multi-language translations across all 8 supported locales for Site Manager sub-tabs (Site List, Smart Presets & Categories, Advanced Tweaks), rule search placeholders, and the "+ Preset" form button.
- **Advanced Site Tweaks Localization:** Added full multi-language translations across all 8 supported locales for the Advanced Site Tweaks panel header, subtitle description, and all 23 individual site tweak option labels (YouTube, Reddit, Instagram, X/Twitter, LinkedIn, Netflix, and B&W Mode).
- **Dashboard Hardcoded Pause/Resume Detection:** Fixed a language-breaking bug in `dashboard.js` where clicking the Focus timer button checked for English and Spanish button text ("Resume", "Start", "Reanudar", "Iniciar"), causing resume actions to fail for German, Japanese, Portuguese, and Chinese users. Updated to use language-independent `data-state="paused"` attributes.
- **Popup `[object Promise]` Bug:** Fixed a critical bug where YouTube/site tweak toggle labels displayed `[object Promise]` instead of translated text because `msg()` (async background message sender) was incorrectly used instead of `t_()` (synchronous translation helper).
- **Hardcoded Pause/Resume Detection:** Fixed a language-breaking bug where the focus timer's Pause/Resume button relied on checking for English text "Resume" or Spanish "Reanudar" in the button label, which failed for all other languages. Now uses a language-independent `data-state` attribute.
- **Hardcoded "Work" Phase Label:** Fixed the focus phase label rendering a raw English string `"Work"` instead of using the `t_("work")` translation function.
- **Chrome Placeholder Crash Prevention:** Fixed `"Variable $count$ used but not defined"` errors that prevented the extension from loading by adding required `"placeholders"` blocks to all keys using `$variable$` syntax across all 8 locales.
- **Build Linter Upgrade:** Upgraded the i18n build linter from a simple key-parity check to a comprehensive 3-check validation system: (1) key parity across locales, (2) Chrome placeholder validation that fails the build if `$var$` is used without a matching `"placeholders"` block, (3) English fallback detection that warns when non-English locales still have untranslated keys.

## [10.0.2] - 2026-07-12

### Added
- **Uninstall Feedback Form:** Added a redirect to a Google Form questionnaire that opens automatically when the user uninstalls the extension, helping us gather insights to improve the app.

### Changed
- **Folder Restructuring:** Cleaned up the repository layout by putting all extension source files (including popup, dashboard, blocked, assets, global.css, and utils.js) inside a unified `src/` folder.
- **Build Tool Location:** Moved `build.js` inside the `tools/` folder.
- **Documentation:** Updated the README.md and CONTRIBUTING.md to reflect the new directory structure, and added instructions on how to bypass PowerShell script execution policy issues on Windows.
- **Chart.js Compression:** Created a custom version of Chart.js to remove unused charts (like Radar and Scatter charts), shrinking the file size by 18 KB (a 9% reduction) to make the extension lighter, and added a simple command (`npm run bundle-chart`) to rebuild it easily.
- **Top Websites List:** Increased the Top 5 Websites list to Top 6 Websites in the analytics dashboard overview to utilize empty space and balance the layout.
- **Database Footprint Optimization:** Optimized how website visits are recorded in the database by replacing 13-digit millisecond timestamps with seconds-since-midnight and session duration formats, saving 20% to 30% of database space and making charts load faster, with an automatic background migration script for existing data.
- **Support links:** Added direct links to the product website, the Chrome Web Store rating page, the online changelog, and updated the translation guide link inside the Support & Feedback settings panel, replacing all raw emojis with clean, inline SVG icons.
- **Active Timeline Redesign:** Increased the 24-hour active timeline visual height from 12px to 18px to match the thickness, rounded corners, and premium styling of the productivity category cylinder.

### Fixed
- **Storage usage indicator:** Updated the Local Storage Usage visual indicator on the settings page to calculate the combined size of the IndexedDB history database and the basic local settings storage, making it fully accurate, and updated descriptions across all languages.
- **Access Control UI:** Fixed the PIN Active badge overlapping/colliding with settings buttons by enabling flex wrapping and spacing on its container.

## [10.0.1] - 2026-07-10

### Fixed
- **SSO login exclusions:** Exempted essential Single Sign-On (SSO) subdomains (`accounts.google.com`, `accounts.youtube.com`, `login.live.com`, `login.microsoftonline.com`, and `appleid.apple.com`) from being blocked, and automatically seeded them into the user's visible Allowlist in the dashboard settings on startup.
- **YouTube player height fix:** Fixed a bug where hiding related videos cut off the bottom of the video player by targeting the recommendations container `ytd-watch-next-secondary-results-renderer`, keeping the player at its correct size in both default and theater modes.
- **Focus vs. Distraction placeholders fix:** Fixed a bug in all 5 locale files where `$1` and `$2` placeholders in the "Focus vs. Distraction" chart breakdown were displayed literally instead of being replaced by actual numbers, by correctly defining `"placeholders"` metadata blocks.
- **Tracking state on refresh:** Fixed a bug where refreshing any website would put the tracking status to "idle" until a window focus or tab change occurred.
- **Double icons on dashboard buttons:** Removed redundant Unicode prefix symbols from localized translation messages for the Stop, Pause, and Skip buttons to prevent double icons next to inline SVGs.
- **Feedback button aesthetics:** Removed drop shadows and hover glows from the GitHub, Submit Feedback, and Help Translate buttons in the settings page to make them look flat and clean.

### Removed
- **Month-over-Month comparison card:** Removed the redundant card from the analytics comparison tab.

## [10.0.0] - 2026-07-09 ("Flow Rebirth")

This is a major milestone release marking the transition from "Website Manager" to "Website Blocker", and celebrating the official submission to the Chrome Web Store!

*Note: The version has been bumped directly from 7.0.8 to 10.0.0 to celebrate this launch, establish unified version numbering across Chrome, Firefox, and Edge stores, and ensure that all existing users receive the update automatically.*

### Added
- **Official Chrome Web Store support:** Initial release package for Google Chrome.
- **Multi-language support:** Fully localized user interface in English, Spanish, Simplified Chinese, and Traditional Chinese (HK/TW).
- **Standardized build tools:** Replaced the old Python compiler script (`build.py`) with a modern JavaScript build script (`build.js`) running on the official Node.js `esbuild` API.
- **NPM terminal shortcuts:** Added `npm run build` and `npm run zip` commands inside `package.json` to simplify compiling.
- **Portable developer tools:** Moved translation helper tools inside the main directory and changed hardcoded folders to relative paths so they work on any computer.
- **Expanded core features:**
  - **Premium Pomodoro Timer:** Fully customizable focus blocks, short breaks, and long breaks with an animated glowing ring that fills up as you work.
  - **Visual Site Analytics:** Interactive circular donut chart displaying your top-visited websites and showing exactly where your minutes went.
  - **Advanced Website Blocker:** Granular, network-level blocking rules supporting focus schedules, daily time limits, per-session cooldowns, and custom redirect pages.
  - **Secure 6-Digit Passcode:** PIN lock protection for editing rules, stopping timers, changing presets, or unlocking options to prevent self-cheating.
  - **365-Day Consistency Heatmap:** GitHub-style calendar heatmap tracking focus days (green) vs. wasted days (red) based on customizable ratios.
  - **Study vs. Distraction Trends:** Color-coded graphs showing comparisons between productive time, learning, communication, and distractions over 7-day or 30-day ranges.
  - **Customizable Themes:** Three clean, premium look options: Light theme, Dark theme, and a glassmorphic Cinematic theme with animated background blurs.
  - **Privacy-First Backups:** Export settings and history to a JSON file or import logs from other popular tracking tools without any online data tracking.

### Changed
- **Renamed extension:** Renamed the extension from **Flow - Website Manager & Habit Tracker** to **Flow - Website Blocker & Habit Tracker** across all localized languages.
- **Developer documentation:** Rewrote `README.md`, `CONTRIBUTING.md`, and `TRANSLATING.md` to guide contributors on using the new Node.js workflow and translator rules.
