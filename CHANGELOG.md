# Changelog

All notable changes to **Flow** (formerly FocusFlow) will be documented in this file.

## [6.9.0] - 2026-06-02

- Added history migration uploader row for **Webtime Tracker** CSV exports with its authentic multicolored doughnut chart SVG logo
- Added history migration uploader row for **Time Tracker - Web Habit Builder** JSON exports with its authentic circular hourglass SVG logo
- Added history migration uploader row for **Web Activity Time Tracker** CSV exports with its authentic dark-teal stopwatch SVG logo
- Programmed dynamic column parsing for Webtime Tracker CSV to map time spent on websites over multiple dates
- Programmed JSON parsing for Time Tracker format (converting milliseconds `focus` to standard tracking seconds and formatting YYYYMMDD date strings)
- Automatically filtered out blank `newtab` page statistics from the imported logs
- Added automatic date format guessing (Month/Day/Year vs Day/Month/Year) for Web Activity CSV
- Added automatic mapping of local file URLs (e.g. `file:///` links) into Flow's tracking format (`local:`)
- Programmed asynchronous batch database merging (50 days at a time) to prevent browser freezes
- Added automatic categorization/re-indexing of imported history logs using active tag rules
- Replaced 3D lock emojis with custom, high-resolution SVG lock icons in settings, status badges, and passcode overlays
- Fixed the "Show funny blocked page" setting toggle so disabling it correctly falls back to a standard block notice
- Removed the deprecated and non-functional "Custom blocked message" text input from settings
- Replaced the refresh/recycle emoji `🔄` in quick presets with a clean inline SVG icon
- Fixed double PIN verification prompts in the Rule Manager; users are now only prompted once when opening the edit/tag modals
- Converted focus indicator dots in popup and dashboard into clickable Flow brand logos that redirect users to the Flow product website

## [6.8.6] - 2026-05-29

- Updated Firefox Add-on URL to the new slug (`flow-website-manager`) across README, popup, and project links
- Fixed incorrect GitHub repository link in the dashboard settings page

## [6.8.5] - 2026-05-29

- Added sleep lockout auto-unblock checking on computer wake-up
- Added support for midnight wrap-around schedules and free-time windows
- Added in-memory styling cache to prevent duplicate styles injection on dynamic pages
- Refined YouTube Shorts blocker styling to avoid hiding normal links in text
- Added "Start Week On" dropdown setting and aligned dashboard heatmap grid layout
- Decoupled site blocking from category tagging (no more silent category overwrites)
- Fixed double-counting totals math in heatmap stats rendering
- Fixed daily averages statistics to compute true elapsed calendar days
- Cleaned up dead "+ Add Window" button from dashboard layout
- Preset highlight now clears during scheduled focus, displaying "Schedule" label in popup

## [6.8.4] - 2026-05-28

- Rebranded to Flow (bye FocusFlow 👋)
- Fixed ghost function crash in the service worker
- Cleaned up input and select styling across popup and dashboard
- Fixed accent-color overrides on checkboxes

## [6.8.3] - 2026-05-26

- Added Cinematic background mode with animated gradient blurs
- Built a proper design system in `global.css` using CSS variables
- Unified all input, select, and textarea styles with smooth hover/focus transitions
- Fixed light mode contrast issues and inconsistent border-radius values

## [6.8.2] - 2026-05-24

- Added 365-Day Consistency Heatmap to the Insights tab
- Heatmap legend is now clickable to customize "good day" and "wasted day" thresholds
- Added Good Days, Wasted Days, Weekday vs Weekend, and Most Productive Day stats

## [6.8.1] - 2026-05-22

- Added Study vs Distraction trend chart with 5-category color-coded toggles
- Added custom date range picker on Overview, Daily Breakdown, and Trend tabs
- Added search box for filtering Top Sites and blocking rules

## [6.8.0] - 2026-05-20

- Redesigned dashboard with 4-tab navigation: Analytics, Focus Mode, Site Manager, Settings
- Added Focus Schedules — set recurring sessions that auto-start
- Added Quick Preset Cards for one-click timer switching
- Granular PIN Locks — individually lock Timer Stop, Rules, Free-time Hours, Presets, Schedules, Tweaks, and Danger Zone
- Added Tab Limiter per domain
- Added Time Limit Warning — shows alert N seconds before a site gets blocked
- Added Custom Blocked Page Message
- Added productive site suggestion on the blocked page
- Added Idle Timeout Settings (30s / 1m / 2m / 5m)
- Added Always-track whitelist for sites like pw.live
- Added Custom New Tab Page (Beta)
- Added Bulk Edit mode for deleting multiple rules at once
- Blocked page now shows the specific reason: Time Limit, Schedule, or Instant block
- PIN upgraded from 4-digit to 6-digit

## [6.7.0] - 2026-05-10

- Initial public release on Firefox and Edge 🎉
- Source code published on GitHub under MIT License
- Pomodoro Focus Timer with customizable work, short break, and long break durations
- Visual time tracking with circular donut chart (Today and All-time views)
- Network-level site blocker using the `declarativeNetRequest` API
- Site categorization — tag sites as Productivity, Learning, Communication, Distraction, or Uncategorized
- Weekly Goals with visual progress bar and streak tracking
- Daily Streak Badge with configurable minimum focus minutes
- 6-digit PIN Lock for securing settings
- Dark and Light themes
- Full Analytics Dashboard with Overview, Daily Breakdown, and Top Sites tabs
- Privacy-first — all data stored locally, zero tracking, zero data collection

---

*Made with 💖 by vishwa-vsr*
