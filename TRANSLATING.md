# Translating Flow

Thank you for helping to translate Flow! Your contributions make this extension accessible to students, developers, and professionals all around the world.

There are two ways you can help us translate Flow.

---

## 🌐 Supported Languages

Flow currently supports these languages:

| Language | Code | Status |
| :--- | :--- | :--- |
| 🇺🇸 **English** | `en` | Source Language (Reference) |
| 🇪🇸 **Spanish** | `es` | Translated |
| 🇨🇳 **Simplified Chinese** | `zh_CN` | Translated |
| 🇭🇰 **Traditional Chinese (Hong Kong)** | `zh_HK` | Translated |
| 🇹🇼 **Traditional Chinese (Taiwan)** | `zh_TW` | Translated |

If you want to add a new language, or fix spelling errors in the existing ones, we would love your help!

---

## 📜 Simple Rules for Translators

To make sure your translations display correctly and don't break the user interface:
1. **Do not translate key names:** Only translate the text inside the `"message"` fields. Never change keys like `"extName"` or `"btnStart"`.
2. **Do not translate descriptions:** The `"description"` fields are only reference notes for developers. You can ignore them.
3. **Preserve placeholders:** Keep variables like `$count$`, `$1`, or `$LIMIT$` exactly as they appear in the English file (including the dollar signs). They insert dynamic numbers or words.
4. **Preserve formatting:** Keep HTML tags (like `<a>` or `<br>`) and line breaks (`\n`) exactly as is.
5. **Keep it concise:** Space is limited on extension widgets and popup menus. Try to make translations roughly the same length as the English version so they fit.

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
2. Navigate to the locales directory: `_locales/`
3. Edit or create files:
   - **To improve an existing translation**: Open the `messages.json` file inside the language folder (like `es` for Spanish) and update the text.
   - **To add a new language**: Copy the English folder `_locales/en`, rename the new folder to your target language code (like `fr` for French), and open its `messages.json` file.
4. Translate the text inside the `"message"` fields (following our **Rules for Translators** above).
5. Verify your translation keys using our helper script:
   - Run the translation analyzer script in your terminal:
     ```bash
     python tools/languages_analysis.py
     ```
   - Open the generated `tools/languages_analysis.html` file in your browser. It will show you a visual report of any missing or extra keys compared to the English reference.
6. Commit your changes and submit a Pull Request to our main branch!

Thank you again for your support!
