# Contributing to Flow

Thank you for your interest in contributing to Flow! Whether you are fixing a bug, suggesting a feature, or writing translations, your help makes this project better for everyone.

Here is a guide on how to get started.

---

## Code of Conduct

This is a solo project built by a student, and I want everyone who contributes to feel welcome. Please:
- Be kind and respectful in issues, pull requests, and discussions.
- Give constructive feedback, not harsh criticism.
- Remember that everyone is volunteering their time.

If someone is being disrespectful or disruptive, I'll step in. That's it — no complicated legal document needed.

---

## How You Can Contribute

### 1. Report Bugs or Suggest Features
If you find a bug or have an idea to improve Flow, please open a [GitHub Issue](https://github.com/vishwa-vsr/Flow/issues). When reporting a bug, please include:
- A clear description of the problem.
- Steps to reproduce the issue.
- Your browser and operating system details.

### 2. Help Translate
Flow is localized into multiple languages, but our translations are currently AI-generated! If you're a native speaker of German, Japanese, Chinese, Spanish, or Portuguese, feel free to open a PR or join our [Translation Discussion](https://github.com/vishwa-vsr/Flow/discussions/4) to help us polish them. For step-by-step instructions, check out our [Translation Guide](./TRANSLATING.md).

### 3. Code Contributions (Pull Requests)
*Note: To build and contribute to the project, you need **Node.js** (for compiling and minifying files) and **Python** (only if you want to run the translation analysis scripts inside `tools/`).*

If you want to modify the code or fix a bug:
1. Fork this repository and clone it to your computer.
2. Navigate to the root folder of the repository and install the developer tools:
   ```bash
   npm install
   ```
3. Load the extension in your browser in Developer Mode:
   - For Chromium browsers (Chrome, Edge, Brave): Go to `chrome://extensions/` and click "Load unpacked". Select the **`src/`** folder (to run raw code) or the compiled **`dist/chrome/`** folder (after running the build script).
   - For Firefox: Go to `about:debugging#/runtime/this-firefox` and click "Load Temporary Add-on...". Select the `manifest.json` file inside the **`src/`** folder or the **`dist/firefox/`** folder.
4. Make your changes and test them thoroughly.
5. Compile your changes to verify the build script runs successfully.

#### 🛠️ Available Build Commands
You can run the following commands in your terminal:

| Command | Description |
|---|---|
| `npm run build` | Compiles source files and outputs optimized builds into `dist/chrome/`, `dist/edge/`, and `dist/firefox/`. |
| `npm run zip` | Compiles source files, optimizes assets, and packages store-ready `.zip` archives into `release/`. |

*(Note: To run these commands automatically without interactive prompts, pass `-- --yes` like so: `npm run build -- --yes`. On Windows, if PowerShell blocks running the npm command due to script policies, run the build script directly with node: `node tools/build.js --yes`, or bypass execution policies with `powershell -ExecutionPolicy Bypass -Command "npm run build"`.)*

#### 📋 Pull Request Checklist
Before opening a Pull Request, please check that:
- [ ] You tested the changes locally in Developer Mode on your browser.
- [ ] The build script compiles successfully by running `npm run build` (passing all 3 i18n linter checks).
- [ ] You did not add any heavy external libraries (we prefer standard web APIs).
- [ ] Your code is local-first and does not track users or collect data (privacy-first).
- [ ] You documented your changes if needed.

6. Commit your changes and submit a Pull Request to our main branch!

---

## 🎯 What Should I Work On?

Not sure where to start? Here are some ideas:

### Good First Issues (Beginner-Friendly)
Check our [issues labeled "good first issue"](https://github.com/vishwa-vsr/Flow/labels/good%20first%20issue) for tasks that are small, well-scoped, and great for new contributors.

### Translation Help (No Coding Required)
Our translations are currently AI-generated and can always use native speaker polish. See our [Translation Guide](./TRANSLATING.md) for details.

### Ideas We'd Love Help With
- Improving accessibility (keyboard shortcuts, screen reader support, ARIA labels).
- Adding new site tweaks (hiding distracting feeds on popular websites).
- Writing automated test suites.
- Performance optimization for the analytics dashboard with large datasets.
- UI polish and micro-animation enhancements.

If you want to work on something bigger, feel free to open a [GitHub Discussion](https://github.com/vishwa-vsr/Flow/discussions) or Issue first so we don't duplicate effort!

---

## 🏗️ How the Code Works (Architecture Guide)

Flow is a Manifest V3 browser extension with these core parts:

```text
User clicks extension icon
        ↓
   popup/           → Toolbar dropdown timer card and quick stats
        ↓
   background/      → Service worker running in the background:
                        • Tracks active tabs and idle state
                        • Enforces blocking rules via declarativeNetRequest
                        • Manages Pomodoro timers and alarms
        ↓
   content/         → Content scripts injected into web pages:
                        • Reports active browsing time back to service worker
                        • Applies site tweaks (hiding feeds, distraction removal)
        ↓
   dashboard/       → Full-page analytics dashboard & options:
                        • Charts, heatmaps, site manager, settings
        ↓
   blocked/         → The blocked page overlay shown when a rule triggers
        ↓
   lib/             → Shared modules:
                        • db.js — IndexedDB storage wrapper
                        • constants.js — Shared default configuration
                        • icons.js — Central icon/SVG rendering engine
```

**Key principle:** All data lives strictly in `chrome.storage.local` and IndexedDB on your device. Zero external server calls, ever.

---

## Development Guidelines

To keep Flow clean, fast, and privacy-first, please follow these guidelines:
- **No data collection**: Flow is strictly local-first. Do not add any code that tracks users or sends data to external servers.
- **Keep dependencies minimal**: Avoid adding heavy external libraries. Standard web APIs are preferred.
- **Universal Icon & Emoji Manager**: Avoid inserting raw inline `<svg>` elements in HTML or JavaScript templates. Use `<span data-icon="iconName"></span>` in HTML or `FlowIcons.get("iconName")` in JavaScript modules via `src/lib/icons.js` for zero-bloat rendering and 100% visual consistency.
- **Write clean CSS**: Use the global styles defined in `global.css` for consistency.

Thank you again for your support!
