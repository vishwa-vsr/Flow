# Translating Flow

Thank you for helping to translate Flow! Your contributions make this extension accessible to students, developers, and professionals all around the world.

There are two ways you can help us translate Flow.

---

## Option A: Using GitHub Discussions (No coding required)

If you do not know how to use Git or code, you can still help us easily:

1. Open our [Translation Discussion Thread](https://github.com/vishwa-vsr/Flow/discussions/4).
2. Leave a comment letting us know which language you want to help with.
3. You can paste your translations directly into the comment, or suggest corrections for existing translations. We will handle adding them to the code for you!

---

## Option B: Using GitHub Pull Requests (For developers)

If you are comfortable with Git, you can add or improve translation files directly:

1. Fork this repository and clone it to your computer.
2. Navigate to the locales directory: `flow-source/_locales/`
3. Edit or create files:
   - **To improve an existing translation**: Open the `messages.json` file inside the language folder (like `es` for Spanish) and update the text.
   - **To add a new language**: Copy the English folder `_locales/en`, rename the new folder to your target language code (like `fr` for French), and open its `messages.json` file.
4. Translate the text inside the `"message"` fields:
   - **Do not** change the key names (like `"extName"` or `"extDescription"`).
   - **Do not** translate the `"description"` fields (they are only for developer reference).
   - Make sure you preserve any placeholder variables (like `$count$`) exactly as they appear in the English file.
5. Verify your translation keys:
   - Run the translation analyzer tool in your terminal: `python tools/languages_analysis.py`
   - Open the generated `tools/languages_analysis.html` file in your browser to ensure there are no missing or extra keys.
6. Commit your changes and submit a Pull Request to our main branch!

Thank you again for your support!
