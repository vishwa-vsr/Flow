# 🌊 FocusFlow

**A premium, gorgeous productivity companion that helps you reclaim your time, build deep focus habits, and block digital noise.**

![FocusFlow Preview](focusflow_preview.jpg)

---

## ✨ What is FocusFlow?

FocusFlow is a high-end web assistant designed for people who want to work smarter, not longer. It blends a state-of-the-art **Pomodoro Focus Timer** with **Visual Site Analytics** and a **Smart Distraction Blocker** to create the ultimate distraction-free environment. 

Whether you are studying, coding, writing, or designing, FocusFlow keeps you in "the zone" while gently helping you build healthier screen-time habits.

---

## 🚀 Key Features

* **⏱️ Premium Pomodoro Timer**  
  Fully customizable work sessions, short breaks, and long breaks. Features a gorgeous glowing ring that slowly fills as your session progresses.
  
* **📊 Visual Time Tracking**  
  A beautiful, modern circular donut chart displays your top-visited websites and shows you exactly where your minutes went today vs. all-time.
  
* **🚫 Instantly Toggle Distractions**  
  See a site that is eating up your focus? Flip a single switch directly inside the popup to immediately block access to it.
  
* **🔒 Self-Control PIN Lock**  
  Keep yourself honest (or secure your settings) with a 4-digit PIN lock screen that blocks tampering or accidental session skips.
  
* **🎯 Weekly Goals & Milestones**  
  Set your focus targets for the week, track your progress with a clean visual bar, and earn a glowing orange streak badge for consecutive days.
  
* **🌗 Premium Dark & Light Themes**  
  Switch instantly between an ultra-modern glassmorphic dark mode (with deep grays and vibrant neon greens) and a clean, high-contrast light mode.

---

## 🛠️ How to Install & Use

1. **Download the project files** to your computer.
2. Open your web browser (Chrome, Edge, or Brave) and go to your **Extensions** page (or type `chrome://extensions` in your address bar).
3. Turn on **Developer mode** (usually a toggle switch in the top right corner).
4. Click **Load unpacked** (top left) and select this folder (`Focusflow 4.1`).
5. **Pin FocusFlow** to your browser toolbar for quick access!

---

## 💡 How It Works under the Hood
* FocusFlow monitors the active tab to calculate time spent on each website.
* When Focus Mode is on, it instantly redirects blocked websites to a calming, custom "Blocked" screen.
* All your settings and stats are saved locally on your computer, meaning **your browsing data never leaves your device**.

---

*Made with 💖 for focused minds.*

---

## 💻 Source Code & Build Instructions

This directory contains the original, un-minified source code for FocusFlow.

### Build Instructions

To generate the exact minified code submitted to the Mozilla Add-ons store, please follow these steps:

1. Ensure Python 3 is installed on your system.
2. Open a terminal or command prompt and navigate into this `focusflow-source` directory.
3. Run the following command:
   ```bash
   python build.py
   ```
4. The script will execute and automatically create a `focusflow-firefox` directory (and a `focusflow-dist` directory for Chromium) containing the final, minified extension code.

### Notes on the Build Process
* The `build.py` script does not use complex bundlers like Webpack, Rollup, or Vite.
* It uses basic Regular Expressions to cleanly strip whitespace, newlines, and comments to improve extension performance and load times.
* The code is not obfuscated.

If you have any questions or require further information, please refer to the support email provided in the extension listing. Thank you!
