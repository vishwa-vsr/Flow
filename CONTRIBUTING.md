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
If you want to modify the code or fix a bug:
1. Fork this repository and clone it to your computer.
2. Navigate to the `flow-source` folder and install the build tools:
   ```bash
   npm install
   ```
3. Load the extension in your browser in Developer Mode:
   - For Chromium browsers: Go to `chrome://extensions/` and click "Load unpacked". Select the `flow-source` folder.
   - For Firefox: Go to `about:debugging#/runtime/this-firefox` and click "Load Temporary Add-on...". Select the `manifest.json` file inside the `flow-source` folder.
4. Make your changes and test them thoroughly.
5. Compile your changes to verify the build script runs successfully:
   ```bash
   python build.py --skip-prompt --zip
   ```
6. Commit your changes and submit a Pull Request to our main branch!

---

## Development Guidelines

To keep Flow clean, fast, and privacy-first, please follow these guidelines:
- **No data collection**: Flow is strictly local-first. Do not add any code that tracks users or sends data to external servers.
- **Keep dependencies minimal**: Avoid adding heavy external libraries. Standard web APIs are preferred.
- **Write clean CSS**: Use the global styles defined in `global.css` for consistency.

Thank you again for your support!
