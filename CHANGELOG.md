# Changelog

All notable changes to **Flow** (formerly FocusFlow) will be documented in this file.

## [6.9.8] - 2026-06-14

- Fixed infinite loading/redirect loop when opening blocked sites (e.g. reddit.com) by base64 obfuscating domain parameters in the URL
- Updated the "Manage block rules" button on the blocked page to redirect directly to the Site Manager section rather than general Analytics
- Fixed active tracking sessions falsely going idle by ignoring browser idle transitions if tab interactions were detected within the last 20 seconds
- Restored missing warning and explanation descriptions for all Settings 'Danger Zone' options

## [6.9.7] - 2026-06-13

- Configured official new tab override in manifest to load the custom page natively and reliably
- Cleaned up the URL bar so that it is blank and hidden, removing the messy `chrome-extension://...` link
- Removed programmatic new tab redirect listeners from the background script to fix tab hijacking issues
- Implemented a gorgeous glassmorphic fallback Google Search page with quick shortcuts (Web, YouTube, GitHub, Gmail) that displays when the Custom New Tab setting is toggled OFF
- Set up automatic text cursor focus on the search input and smart domain detection for direct site navigation
- Implemented a quick settings gear button and slide-out glassmorphic panel directly on the custom New Tab page
- Allowed instant page element toggling (Clock, Greeting, Productivity Stats, Focus Buttons, Quotes) and direct wallpaper upload/clear from inside the new tab settings drawer
- Synchronized settings edits made inside the new tab quick settings drawer instantly to sync storage
- Programmed settings drawer to automatically slide closed if user clicks anywhere outside of it
- Increased width of Domain Name and Redirect To (Optional) inputs to 260px in Rule Manager to utilize available space
- Swapped list headers negative margins and added 16px column gaps to align list column headers and cell rows precisely
- Configured fixed column widths for Domain (220px), Type (100px), Mode (180px), and Daily Limit (120px) to shift elements left, making Schedule (1fr) flexible to fill the remaining space
- Swapped fields order in Add/Edit Rule and Add/Edit Preset modals, displaying Per-Session Limit directly beneath Daily time limit
- Centered the Add Rule and Add Preset modals vertically and horizontally on the screen by removing absolute top-margin offsets
- Replaced emojis with styled SVG icons (🔔 in Focus Schedules, and ⏱️ in Adjust Time popups)
- Appended the "Adjust Time in Top Sites" feature idea to IDEAS.md

## [6.9.6] - 2026-06-10

- Audited and deleted duplicate styles to clean up the stylesheet
- Added design colors for glass panels and dark/light modes
- Swapped plain text emojis (play, pause, stop, skip, warning, settings, and shields) with crisp SVG icons in the focus panel, lists, and managers
- Redesigned empty states for lists with clean dashed borders, title text, and descriptions
- Added accessibility support including keyboard navigation labels, proper tab focus elements, and form labels
- Removed overriding inline color styles from Top Sites action buttons (pin, visit, rule) and moved them to the stylesheet to fix hover glow highlights
- Added a beautiful animated "Ethereal Shadow" background option for dark mode

## [6.9.5] - 2026-06-06

- Undid the left-shifted text centering of the main circular donut chart in the popup
- Shifted the right-aligned category and website time text inside the popup slightly to the left to avoid touching the borders
- Added dynamic hover states to category legend rows in the popup to show category-specific times and label titles with matching colors inside the circular chart
- Restructured the popup timer settings panel to group inputs side-by-side (Work + Short Break, and Long Break + Cycles)
- Added the active preset name dynamically as a subtitle in the popup Timer Settings header (e.g. "Timer Settings · Pomodoro")
- Placed the "Save Settings" and "Advanced Settings" options side-by-side as primary and secondary buttons on a single horizontal line in the popup settings panel
- Added an "Advanced Settings" navigation button in the popup settings panel that redirects to the Focus tab in the dashboard and triggers a pulsing glow on the edit icon of the active preset
- Fixed contrast ratio for dark mode text variables (`--tx3` and `--tx4`) on dark backgrounds, meeting WCAG AA accessibility requirements
- Fixed keyboard accessibility on settings file inputs by replacing `display: none` with a focusable visually hidden CSS utility (`.sr-only`)
- Added explicit labeling and programmatically linked labels to inputs/select elements across popup and dashboard forms
- Linked toggle switch checkboxes programmatically to their text titles using `aria-labelledby`
- Added text alternative descriptions (aria-labels) to symbol/icon buttons like Settings gear, Close settings '✕', and Delete '⌫'
- Added main content skip links for quick keyboard navigation on the dashboard
- Fixed dashboard `.focus-layout` grid columns configuration so it collapses properly into a single column on mobile/smaller screens
- Replaced classic Georgia serif font on blocked and quote page elements with the official brand font (Manrope)
- Consolidated monospace font-family declarations across all stylesheets, HTML documents, and dynamic JS templates to use the new `--font-mono` design token
- Cleaned up informal "e.g. " prefixes from text input placeholders in the dashboard layout and JS configuration templates


## [6.9.2] - 2026-06-02

- Fixed Firefox custom new tab hijack bug: resolved issues with genuine new tabs not redirecting and programmatic extension pages (like dashboard/settings) getting hijacked.

## [6.9.1] - 2026-06-02

- (Includes all version 6.9.0 features including history migration uploaders and visual refinements)

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
