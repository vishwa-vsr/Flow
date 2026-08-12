# Translating Flow

Thank you for helping to translate Flow! Your contributions make this extension accessible to students, developers, and professionals all around the world.

> 🤖 **Note:** Our current translations are AI-generated! If you're a native speaker of German, Japanese, Chinese, Spanish, or Portuguese, feel free to open a PR or leave a comment in our discussion thread to polish our translations.

There are two ways you can help us translate Flow.

---

## 🌐 Supported Languages

Flow currently supports these languages:

| Language | Code | Keys Translated | Status |
| :--- | :--- | :---: | :--- |
| 🇺🇸 **English** | `en` | 777/777 | ✅ Source Language |
| 🇪🇸 **Spanish** | `es` | 770/777 | ✅ ~99% Translated |
| 🇨🇳 **Simplified Chinese** | `zh_CN` | 776/777 | ✅ ~99% Translated |
| 🇭🇰 **Traditional Chinese (Hong Kong)** | `zh_HK` | 776/777 | ✅ ~99% Translated |
| 🇹🇼 **Traditional Chinese (Taiwan)** | `zh_TW` | 776/777 | ✅ ~99% Translated |
| 🇯🇵 **Japanese** | `ja` | 774/777 | ✅ ~99% Translated |
| 🇩🇪 **German** | `de` | 764/777 | ✅ ~98% Translated |
| 🇧🇷 **Brazilian Portuguese** | `pt_BR` | 770/777 | ✅ ~99% Translated |
| 🇫🇷 **French** | `fr` | 777/777 | ✅ ~99% Translated |
| 🇰🇷 **Korean** | `ko` | 777/777 | ✅ ~99% Translated |
| 🇷🇺 **Russian** | `ru` | 777/777 | ✅ ~99% Translated |

> **Note:** The remaining 1-2% of "untranslated" keys are universal terms (like "Pomodoro", "Flow", "Feedback") that are intentionally the same in every language.

If you want to add a new language, or fix spelling errors in the existing ones, we would love your help!

---

## 📜 Rules for Translators

To make sure your translations display correctly and don't break the user interface:

1. **Do not translate key names:** Only translate the text inside the `"message"` fields. Never change keys like `"extName"` or `"btnStart"`.
2. **Do not translate descriptions:** The `"description"` fields are only reference notes for developers. You can ignore them.
3. **Preserve placeholders:** Keep variables like `$count$`, `$work$`, `$break$`, or `$time$` exactly as they appear in the English file (including the dollar signs). They insert dynamic numbers or words.
4. **Always add a `"placeholders"` block** when your message contains `$variable$` syntax. Chrome will **refuse to load the extension** without it. Example:
   ```json
   "showAllSites": {
     "message": "Show all $count$ sites",
     "placeholders": {
       "count": { "content": "$1", "example": "42" }
     }
   }
   ```
5. **Preserve formatting:** Keep HTML tags (like `<a>` or `<br>`) and line breaks (`\n`) exactly as is.
6. **Keep it concise:** Space is limited on extension widgets and popup menus. Try to make translations roughly the same length as the English version so they fit.

---

## 🛡️ Build Linter (Automatic Safety Checks)

The build script (`node tools/build.js`) runs 3 automatic checks on every build:

| Check | What it catches | Result |
| :--- | :--- | :--- |
| **Key Parity** | A locale is missing keys that exist in English | ⚠️ Warning |
| **Placeholder Validation** | A message uses `$var$` but has no `"placeholders"` block | ❌ Build fails |
| **English Fallback Detection** | A non-English locale still has English text | ⚠️ Warning with count |

This means you'll get instant feedback on any translation errors when you build!

---

## Option A: Using GitHub Discussions (No coding required)

If you do not know how to use Git or write code, you can still help us easily:

1. Open our [Translation Discussion Thread](https://github.com/vishwa-vsr/Flow/discussions/4).
2. Leave a comment letting us know which language you want to help with.
3. You can paste your translations directly into the comment, or suggest corrections for existing translations. We will handle adding them to the code for you!

---

## Option B: Using GitHub Pull Requests (For developers)

If you are comfortable with Git, you can add or improve translation files directly:

1. Fork this repository and clone it to your computer.
2. Navigate to the locales directory: `src/_locales/`
3. Edit or create files:
   - **To improve an existing translation**: Open the `messages.json` file inside the language folder (like `es` for Spanish) and update the text.
   - **To add a new language**: Copy the English folder `src/_locales/en`, rename the new folder to your target language code (like `fr` for French), and translate all `"message"` values.
4. Translate the text inside the `"message"` fields (following our **Rules for Translators** above).
5. Build and verify your translations pass all 3 linter checks:
   ```bash
   node tools/build.js
   ```
   The linter will tell you if any keys are missing, if any `$variable$` placeholders need a `"placeholders"` block, or if any translations are still in English.
6. Commit your changes and submit a Pull Request to our main branch!

Thank you again for your support!
