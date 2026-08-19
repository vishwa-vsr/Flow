# Chrome Web Store Listing — Flow: Site Blocker & Focus Timer

> Last Updated: 2026-08-19

## Store Listing

**Extension Name** [REQUIRED]
Flow: Website Blocker & Screen Time Tracker

**Short Description** [REQUIRED]
Block distracting sites, track active screen time, study with Pomodoro timers, and build habits. Private, free & open source.

**Detailed Description** [REQUIRED]
Take back your focus and screen time with Flow — a private, lightweight website blocker and productivity timer.

Flow gives you the tools you need to break digital distractions, build steady study habits, and stay in control of your online time.

KEY FEATURES

• Smart Website Blocker
Block distracting websites instantly, set daily time limits per site, or limit browsing time per session with automatic cooldowns.

• Automated Focus Schedules
Create recurring schedules that automatically start focus sessions during study or work hours.

• Pomodoro & Deep Work Timer
Built-in customizable timers with work intervals, short breaks, and long breaks to keep your energy high.

• Daily & Long-Term Analytics
Track your screen time categorized into Productivity, Learning, Communication, and Distraction without sending any data off your machine.

• Streak & Heatmap Habit Tracking
Visualize your daily progress with an activity heatmap and maintain productivity streaks.

• PIN Protection
Lock your settings, focus schedules, or blocking rules with a 6-digit PIN to prevent impulsive overrides.

100% PRIVATE & LOCAL

Your data belongs entirely to you. Flow runs 100% locally on your computer using your browser's internal storage. No tracking servers, no third-party analytics, and no accounts required.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Blocks distracting websites and tracks active screen time to help users focus and manage their online productivity.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---|---|---|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `src/assets/icons/icon128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | ✅ Ready | `media/flow_preview1.jpg` |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ✅ Ready | `media/flow_preview2.png` |
| Screenshot 3 [RECOMMENDED] | 1280×800 | ✅ Ready | `media/flow_preview3.png` |
| Screenshot 4 | 1280×800 | ✅ Ready | `media/flow_preview4.png` |
| Screenshot 5 | 1280×800 | ✅ Ready | `media/flow_preview5.png` |
| Small Promo Tile [RECOMMENDED] | 440×280 | 🟡 Needs update | `media/promo_small.png` |
| Marquee Promo Tile | 1400×560 | 🟡 Needs update | `media/promo_marquee.png` |

---

## Permissions Justification

| Permission | Type | Justification |
|---|---|---|
| `storage` | permissions | Saves user blocking rules, focus schedules, time limits, and settings locally in browser storage. |
| `unlimitedStorage` | permissions | Stores long-term daily screen time history and session logs locally in IndexedDB without running out of quota. |
| `alarms` | permissions | Powers recurring focus schedules, Pomodoro interval timers, and background sync heartbeats. |
| `idle` | permissions | Detects when the user is away from their computer so active time tracking automatically pauses. |
| `notifications` | permissions | Sends desktop alerts when a Pomodoro focus or break interval completes, or before scheduled focus begins. |
| `declarativeNetRequest` | permissions | Instantly blocks and redirects navigation to user-specified distracting sites at the network layer. |
| `scripting` | permissions | Applies user-customized CSS tweaks to hide distracting page elements on selected sites. |
| `favicon` | permissions | Retrieves and displays website icons next to domain names in the popup and analytics dashboard. |
| `<all_urls>` | host_permissions | Allows the time-tracking content script to measure active tab duration across visited websites and apply blocking rules. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes (Stored locally only)

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|---|---|---|---|---|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | Yes (Local only) | No | Active time tracking and productivity categorization | No |
| User activity | Yes (Local only) | No | Detecting idle state to pause timers accurately | No |
| Website content | No | No | N/A | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
https://vishwa-vsr.github.io/flow-website/privacy.html

---

## Distribution

**Visibility**: Public  
**Regions**: All regions  
**Pricing**: Free  

---

## Developer Info

**Publisher Name** [REQUIRED]
Vishwa VSR

**Contact Email** [REQUIRED]
283413563+vishwa-vsr@users.noreply.github.com

**Support URL / Email** [RECOMMENDED]
https://github.com/vishwa-vsr/Flow/issues

**Homepage URL** [RECOMMENDED]
https://vishwa-vsr.github.io/flow-website/

---

## Version History

| Version | Date | Changes | Status |
|---|---|---|---|
| 10.1.0 | 2026-08-19 | Polished PIN lock keypad in Spanish, upgraded all native dropdowns to custom animated style, resolved transparent modal overlays, and enhanced category grids to 2-column layout. | Draft |
| 10.0.8 | 2026-07-15 | Performance optimizations, memory cache for daily stats, and database migration fixes. | Published |
