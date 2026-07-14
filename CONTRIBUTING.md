# Contributing to Flow

Thank you for your interest in contributing to Flow! Whether you are fixing a bug, suggesting a feature, or writing translations, your help makes this project better for everyone.

Here is a guide on how to get started.

---

## Code of Conduct

Flow is a friendly, supportive project. Please be respectful and helpful when interacting with others in issues, pull requests, and discussions.

---

## How You Can Contribute

### 1. Report Bugs or Suggest Features
If you find a bug or have an idea to improve Flow, please open a [GitHub Issue](https://github.com/vishwa-vsr/Flow/issues). When reporting a bug, please include:
- A clear description of the problem.
- Steps to reproduce the issue.
- Your browser and operating system details.

### 2. Help Translate
Flow is localized into multiple languages. If you want to help translate the extension, please check out our [Translation Guide](./TRANSLATING.md) or join the discussion in our [GitHub Discussions](https://github.com/vishwa-vsr/Flow/discussions/4).

### 3. Code Contributions (Pull Requests)
*Note: To build and contribute to the project, you need **Node.js** (for compiling and minifying files) and **Python** (only if you want to run the translation analysis scripts inside `tools/`).*

If you want to modify the code or fix a bug:
1. Fork this repository and clone it to your computer.
2. Navigate to the root folder of the repository and install the developer tools:
   ```bash
   npm install
   ```
3. Load the extension in your browser in Developer Mode:
   - For Chromium browsers (Chrome, Edge, Brave): Go to `chrome://extensions/` and click "Load unpacked". Select the **`src/`** folder (to run raw code) or the compiled **`flow-dist/`** folder (created in the parent directory after running the build script).
   - For Firefox: Go to `about:debugging#/runtime/this-firefox` and click "Load Temporary Add-on...". Select the `manifest.json` file inside the **`src/`** folder or the compiled **`flow-firefox/`** folder.
4. Make your changes and test them thoroughly.
5. Compile your changes to verify the build script runs successfully.

#### 🛠️ Available Build Commands
You can run the following commands in your terminal:

| Command | Description |
|---|---|
| `npm run build` | Compiles your source files and minifies JavaScript and CSS into target folders (`flow-dist`, `flow-firefox`, `flow-edge`). |
| `npm run zip` | Compiles and packages target directories into store-ready `.zip` archives. |

*(Note: To run these commands automatically without interactive prompts, pass `-- --yes` like so: `npm run build -- --yes`. On Windows, if PowerShell blocks running the npm command due to script policies, run the build script directly with node: `node tools/build.js --yes`, or bypass execution policies with `powershell -ExecutionPolicy Bypass -Command "npm run build"`.)*

#### 📋 Pull Request Checklist
Before opening a Pull Request, please check that:
- [ ] You tested the changes locally in Developer Mode on your browser.
- [ ] The build script compiles successfully by running `npm run build`.
- [ ] You did not add any heavy external libraries (we prefer standard web APIs).
- [ ] Your code is local-first and does not track users or collect data (privacy-first).

6. Commit your changes and submit a Pull Request to our main branch!

---

## Development Guidelines

To keep Flow clean, fast, and privacy-first, please follow these guidelines:
- **No data collection**: Flow is strictly local-first. Do not add any code that tracks users or sends data to external servers.
- **Keep dependencies minimal**: Avoid adding heavy external libraries. Standard web APIs are preferred.
- **Write clean CSS**: Use the global styles defined in `global.css` for consistency.

Thank you again for your support!
