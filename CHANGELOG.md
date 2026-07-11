# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
