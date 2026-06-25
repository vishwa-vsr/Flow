# Flow — Privacy Policy

**Effective Date:** May 21, 2026
**Last Updated:** June 25, 2026

Flow ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how our browser extension collects, uses, and safeguards your information.

Our core philosophy is simple: **Your data belongs to you.**

---

## 1. Data Collection and Storage

Flow operates entirely on your local device. We do not use external servers, and we do not transmit, sell, or rent your personal data to any third parties.

**What we track locally:**
- **Website URLs & Time Spent:** To provide you with analytics on how you spend your time online.
- **User Activity:** To determine if you are actively browsing or if your computer is idle (so we can pause the timer accurately).
- **Settings & Preferences:** Your blocking rules, focus schedules, goals, PIN configuration, and site categories.
- **Focus Session History:** Records of your completed Pomodoro sessions for the History tab.

**Where it is stored:**
All of the data mentioned above is stored locally within your browser's built-in storage (`chrome.storage`) on your own computer. We do not have access to this data.

---

## 2. Browser Permissions

To function properly, Flow requires certain browser permissions. We only request permissions that are absolutely necessary for the core features of the extension:

- **Storage / Unlimited Storage:** To save your settings, rules, and daily time-tracking statistics locally on your device.
- **Alarms / Idle:** To run focus timers and schedules accurately, and automatically pause tracking when your computer goes idle.
- **Notifications:** To show you reminders when a focus session ends or warning/cooldown nudges when approaching time limits.
- **Declarative Net Request:** To instantly block access to distracting websites at the network level, based on your rules.
- **Scripting:** To inject custom CSS styles to apply advanced user-defined site tweaks (such as hiding specific distracting page elements).
- **Favicon (Chrome/Edge only):** To retrieve and display site icons next to tracked websites in the popup and dashboard.
- **Host Permissions (`<all_urls>`):** Required to apply blocking rules and run the content script across websites to track active time spent for productivity analytics.

---

## 3. Third-Party Services

We do not integrate with any third-party analytics services (such as Google Analytics) or advertising networks. No data is ever sent outside of your browser.

---

## 4. Changes to This Policy

We may update this Privacy Policy from time to time as we add new features. If we make significant changes, we will notify you through an update note within the extension's changelog.

---

## 5. Contact Us

If you have any questions or concerns about this Privacy Policy or how Flow handles your data, please open an issue on our [GitHub repository](https://github.com/vishwa-vsr/Flow/issues).
