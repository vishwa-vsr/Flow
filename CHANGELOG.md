# Changelog

All notable updates and improvements to **Flow** are documented below.

## [7.0.0] - 2026-06-25
- **Removed "Downloads" Permission**: Completely removed the weekly auto-backup feature and its associated `"downloads"` browser permission to protect user privacy and avoid scary browser warnings. Manual backups can still be downloaded instantly without any permissions.
- **Internationalization (i18n) Support**: Added a robust translation framework for localizing the main popup, options dashboard, blocked pages, and extension metadata.
- **Spanish Language Translation**: Added direct, informal, and blunt Spanish translations for all options dashboard screens, status panels, configuration sliders, daily limit badges, and rotating motivational quotes.
- **Fixed CPU Usage Spike**: Optimized the Reddit layout-hiding code to stop scanning every single element on the webpage. This fixes browser freezing on infinite-scroll pages and drastically reduces CPU usage.
- **Fixed Brave Redirection Bug**: Resolved an issue where Brave browser hung indefinitely on blocked websites by using declarativeNetRequest block actions combined with a tab-level redirect fallback.

## [6.9.9] - 2026-06-18
- **New Dashboard Design**: Redesigned analytics cards with a premium look, bold typography, and interactive animations.
- **Trend Indicators**: Added color-coded badges that show if your productivity is improving or if distractions are increasing.
- **Access Control Unified**: Merged passcode locks and safety checklists into a single "Access Control & Safety" card.
- **Simplified Settings**: Cleaned up the settings page by removing clutter and focusing on clean cards.

## [6.9.8] - 2026-06-14
- **Fixed Redirect Bugs**: Resolved an infinite loading loop that occurred when visiting blocked sites.
- **Smart Idle Detection**: Improved tracking so it won't mark you as idle if you are actively clicking or typing.

## [6.9.7] - 2026-06-13
- **SVG Icon Upgrades**: Replaced generic emojis with custom icons in schedules and popups.

## [6.9.6] - 2026-06-10
- **SVG Icon Redesign**: Swapped emojis with crisp vector icons across all lists, settings, and status indicators.
- **Ethereal Shadow Theme**: Added a new background option for dark mode.
- **Dashed Empty States**: Redesigned empty lists to look cleaner with descriptive hints.

## [6.9.5] - 2026-06-06
- **Legend Hover Stats**: Hovering over categories in the popup chart now highlights their specific duration.
- **Refined Timer Panel**: Grouped timer inputs side-by-side (Work/Break times) and added a direct link to advanced settings.
- **Mobile Friendly**: Improved the dashboard grid layout for smaller laptop and mobile screens.

## [6.9.2] - 2026-06-02
- **Firefox Custom Tab Fix**: Fixed a bug where Firefox custom tab features conflicted with normal browsing.

## [6.9.1] - 2026-06-02
- **Import History**: Added uploader support to import data from other popular trackers (Webtime Tracker, Time Tracker, etc.).
- **Passcode Upgrades**: Replaced emoji locks with high-res SVG padlock icons.

## [6.8.6] - 2026-05-29
- **Link Fixes**: Updated the Firefox store link and GitHub repository URL on the dashboard.

## [6.8.5] - 2026-05-29
- **Midnight Schedules**: Added support for block schedules and free-time windows that wrap around midnight.
- **Flexible Weeks**: Added a setting to start your calendar week on Sunday or Monday.
- **Smarter Categorization**: Decoupled site blocking from category tagging to prevent overlapping rules.

## [6.8.4] - 2026-05-28
- **Rebranding**: Officially renamed the extension to **Flow**!
- **Cleaner Styling**: Refined input boxes, select dropdowns, and checkboxes.

## [6.8.3] - 2026-05-26
- **Cinematic Mode**: Added an animated gradient background option.
- **Unified Design**: Standardized colors, borders, and shadows using a global design system.

## [6.8.2] - 2026-05-24
- **365-Day Heatmap**: Added a visual habit calendar to track your focus history over the year.
- **Behavior Analytics**: Added insights showing your weekday vs. weekend productivity.

## [6.8.1] - 2026-05-22
- **Comparison Tab**: Added a trend chart showing study times vs. distraction times side-by-side.
- **Date Range Picker**: Added custom date filters for charts and analytics.

## [6.8.0] - 2026-05-20
- **New Dashboard Tabs**: Organized the workspace into 4 tabs: Analytics, Focus Mode, Site Manager, and Settings.
- **Focus Schedules**: Set recurring blocks of time that start automatically.
- **Granular Passcodes**: Lock specific areas (Timer stop, Rules, Settings, etc.) instead of locking the whole app.
- **Head-up Warnings**: Receive alerts a few seconds before a site gets blocked.

## [6.7.0] - 2026-05-10
- **Initial Release**: First public release on Firefox and Edge.
- **Core Features**: Pomodoro timer, visual donut chart, domain blocker, weekly goals, and light/dark mode options.
