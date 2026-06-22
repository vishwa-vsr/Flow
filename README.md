# 🌊 Flow

**A premium, zero-distraction productivity companion that helps you reclaim your time, build deep focus habits, and block digital noise.**

*Formerly known as FocusFlow.*

<p>
  <a href="https://microsoftedge.microsoft.com/addons/detail/jlcdkibfogehgkbhkkkglifbanenkmic"><img src="https://developer.microsoft.com/store/badges/images/English_get-it-from-MS.png" alt="Get it from Microsoft" height="48"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/flow-website-manager/"><img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get the add-on" height="48"></a>
</p>

---

## ✨ What is Flow?

Flow is a high-end web assistant designed for people who want to work smarter, not longer. It blends a state-of-the-art **Pomodoro Focus Timer** with **Visual Site Analytics**, a **Smart Distraction Blocker**, and a **365-Day Consistency Heatmap** to create the ultimate distraction-free environment.

Whether you are studying, coding, writing, or designing, Flow keeps you in "the zone" while gently helping you build healthier screen-time habits.

**🔒 Privacy first** — All your data is stored locally on your device. Zero tracking, zero data collection.

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| ⏱️ **Premium Pomodoro Timer** | Fully customizable work sessions, short breaks, and long breaks with a glowing ring that fills as your session progresses. |
| 📊 **Visual Time Tracking** | Circular donut chart displays your top-visited websites and shows exactly where your minutes went. |
| 🚫 **Smart Site Blocker** | Network-level blocking with daily time limits, focus schedules, per-session limits, and custom redirects. |
| 🔒 **6-Digit PIN Lock** | Granular locks for Timer Stop, Rule Editing, Free-time Hours, Focus Presets, Schedules, and Settings Danger Zone. |
| 🎯 **Weekly Goals & Streaks** | Set focus targets, track your progress, and earn a glowing streak badge for consecutive days. |
| 🗺️ **365-Day Heatmap** | GitHub-style consistency heatmap with customizable thresholds. Green = focused. Red = wasted. |
| 📈 **Study vs Distraction Trends** | Color-coded trend charts with per-category toggles (Productivity, Learning, Communication, Distraction). |
| 🏷️ **Site Categorization** | Tag every website as Productivity, Learning, Communication, Distraction, or Uncategorized. |
| ⏰ **Focus Schedules** | Set recurring daily/weekly focus sessions that auto-start. |
| 🌗 **Dark, Light & Cinematic Themes** | Three premium themes including a glassmorphic cinematic mode with animated gradient blurs. |
| 🆕 **Custom New Tab Page** | Replace your browser's default blank new tab page with a clean clock, daily widgets, and quick-access stats. |
| 💾 **Data Backup & Import** | Export your rules and history as a JSON file, or import past logs from Webtime Tracker, Time Tracker, and Web Activity Tracker. |

---

## 📸 Screenshots

![Flow Preview](flow_preview.jpg)

---

## 📥 Download

| Store | Version | Rating | User Count |
|---|---|---|---|
| [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/flow-website-manager/) | [![](https://img.shields.io/amo/v/flow-website-manager?color=orange&label=latest)](https://addons.mozilla.org/en-US/firefox/addon/flow-website-manager/) | [![](https://img.shields.io/amo/rating/flow-website-manager?color=orange)](https://addons.mozilla.org/en-US/firefox/addon/flow-website-manager/) | [![](https://img.shields.io/amo/users/flow-website-manager?color=orange)](https://addons.mozilla.org/en-US/firefox/addon/flow-website-manager/) |
| [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/jlcdkibfogehgkbhkkkglifbanenkmic) | [![](https://img.shields.io/badge/dynamic/json?label=latest&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fjlcdkibfogehgkbhkkkglifbanenkmic)](https://microsoftedge.microsoft.com/addons/detail/jlcdkibfogehgkbhkkkglifbanenkmic) | [![](https://img.shields.io/badge/dynamic/json?label=rating&suffix=/5&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fjlcdkibfogehgkbhkkkglifbanenkmic)](https://microsoftedge.microsoft.com/addons/detail/jlcdkibfogehgkbhkkkglifbanenkmic) | [![](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fjlcdkibfogehgkbhkkkglifbanenkmic)](https://microsoftedge.microsoft.com/addons/detail/jlcdkibfogehgkbhkkkglifbanenkmic) |
| Chrome Web Store | [![](https://img.shields.io/badge/Download_ZIP-6.9.9-blue?logo=googlechrome&logoColor=white)](https://github.com/vishwa-vsr/Flow/releases/latest) | 🔜 Pending Approval | [Download ZIP (Manual)](https://github.com/vishwa-vsr/Flow/releases/latest) |

---

## 🛠️ Manual Installation (Developer Mode)

1. **Download** or clone this repository to your computer.
2. Open your browser and go to the **Extensions** page (`chrome://extensions` or `edge://extensions`).
3. Turn on **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked** and select the `flow-source` folder.
5. **Pin Flow** to your browser toolbar for quick access!

---

## 💻 Source Code & Build Instructions

This repository contains the original, un-minified source code for Flow.

### Build Instructions

To generate the minified code submitted to browser add-on stores:

1. Ensure **Python 3** and **Node.js (npm)** are installed on your system.
2. Open a terminal and navigate into the `flow-source` directory.
3. Install the dependencies (like `esbuild`) by running:
   ```bash
   npm install
   ```
4. Run the build script:
   ```bash
   python build.py
   ```
   *(Note: The script is interactive by default and will ask you if you want to bump the version number and build the Chrome/Firefox folders. You can pass the `-y` or `--skip-prompt` flag to bypass these prompts. You can also pass the `--zip` flag to package the distribution folders into `.zip` archives for store upload.)*
5. The script will create a `flow-firefox` directory (and a `flow-dist` directory for Chromium) containing the final, minified extension code.

### Notes on the Build Process
* The `build.py` script does **not** use complex bundlers like Webpack, Rollup, or Vite.
* It primarily uses `esbuild` to optimize and minify the JavaScript files.
* If `esbuild` (or the `node_modules` folder) is not found, the script gracefully falls back to basic Regular Expressions to strip whitespace, newlines, and comments.
* The code is **not** obfuscated.

---

## 💡 How It Works Under the Hood

* Flow monitors the active tab to calculate time spent on each website.
* When a site is blocked, it uses the `declarativeNetRequest` API for **network-level blocking** — the site never even loads.
* The blocked page shows a cinematic, motivational screen with the specific reason for the block.
* All settings and stats are saved locally using `chrome.storage`, meaning **your browsing data never leaves your device**.

---

## 📋 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full list of changes across all versions.

---

## 🤝 Contributing

There are several ways to contribute to Flow:

#### 1. Report Bugs & Request Features
Describe your problem or idea in [GitHub Issues](https://github.com/vishwa-vsr/Flow/issues).

#### 2. Help Translate
We plan to add multi-language support in the future. If you want to help translate Flow into your native language, please start a thread in the [Discussions](https://github.com/vishwa-vsr/Flow/discussions) tab!

#### 3. Rate 5 Stars ⭐
Leave a review on [Firefox](https://addons.mozilla.org/en-US/firefox/addon/flow-website-manager/) or [Edge](https://microsoftedge.microsoft.com/addons/detail/jlcdkibfogehgkbhkkkglifbanenkmic). It's simple and incredibly helpful!

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

## 🔗 Links

* [Product Website](https://vishwa-vsr.github.io/flow-website/)
* [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/jlcdkibfogehgkbhkkkglifbanenkmic)
* [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/flow-website-manager/)
* [Privacy Policy](./PRIVACY.md)

---

*Made with 💖 by [vishwa-vsr](https://github.com/vishwa-vsr) — Student and indie developer from India.*
