import os
import json
import urllib.request
import urllib.parse
import time
import re

# Use relative paths for portability
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.dirname(SCRIPT_DIR)
LOCALES_DIR = os.path.join(SOURCE_DIR, "_locales")
EN_PATH = os.path.join(LOCALES_DIR, "en", "messages.json")

TARGET_LANGS = {
    "zh_CN": "zh-CN",  # Simplified Chinese
    "zh_TW": "zh-TW",  # Traditional Chinese (Taiwan)
    "zh_HK": "zh-HK"   # Traditional Chinese (Hong Kong)
}

def translate_api(text, target_lang):
    if not text.strip():
        return text

    # Protect placeholders like $1, $LIMIT$, etc.
    # We find things like $1 or $LIMIT$ and replace them with [[0]], [[1]], etc.
    placeholders = re.findall(r'\$\w+\$|\$\d+', text)
    temp_text = text
    for idx, ph in enumerate(placeholders):
        temp_text = temp_text.replace(ph, f"[[{idx}]]")

    # URL encode the text
    encoded_text = urllib.parse.quote(temp_text)
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target_lang}&dt=t&q={encoded_text}"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            translated_parts = []
            for part in data[0]:
                if part[0]:
                    translated_parts.append(part[0])
            translated_text = "".join(translated_parts)
            
            # Restore placeholders, removing any accidental spaces around them introduced by translation
            for idx, ph in enumerate(placeholders):
                # Search for [[idx]] with optional spaces
                pattern = rf'\[\s*\[\s*{idx}\s*\]\s*\]'
                translated_text = re.sub(pattern, ph, translated_text)
                
            return translated_text
    except Exception as e:
        print(f"Error translating '{text}' to {target_lang}: {e}")
        return None

def run_translation():
    if not os.path.exists(EN_PATH):
        print(f"Error: English source file not found at {EN_PATH}")
        return

    with open(EN_PATH, "r", encoding="utf-8") as f:
        en_data = json.load(f)

    print(f"Loaded English messages: {len(en_data)} keys.")

    for folder_name, lang_code in TARGET_LANGS.items():
        lang_dir = os.path.join(LOCALES_DIR, folder_name)
        os.makedirs(lang_dir, exist_ok=True)
        dest_path = os.path.join(lang_dir, "messages.json")

        # Load existing translations if they exist to avoid re-translating (and save API calls)
        existing_data = {}
        if os.path.exists(dest_path):
            try:
                with open(dest_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
                
                # Clean up keys that match English messages exactly (likely failed fallbacks)
                cleaned_keys = []
                for k in list(existing_data.keys()):
                    if k in en_data and existing_data[k].get("message") == en_data[k].get("message"):
                        # Only delete if it's long enough to be an actual sentence that should have been translated
                        if len(en_data[k].get("message", "")) > 4:
                            del existing_data[k]
                            cleaned_keys.append(k)
                if cleaned_keys:
                    print(f"Cleaned up {len(cleaned_keys)} fallback keys in {folder_name} for re-translation.")
                print(f"Found existing translations for {folder_name} ({len(existing_data)} keys).")
            except Exception as e:
                print(f"Could not parse existing translation file for {folder_name}: {e}")

        translated_data = {}
        keys_to_translate = [k for k in en_data.keys() if k not in existing_data]

        if not keys_to_translate:
            print(f"All keys for {folder_name} are already translated!")
            continue

        print(f"Translating {len(keys_to_translate)} keys for {folder_name}...")

        # Copy existing ones first
        for k, v in existing_data.items():
            translated_data[k] = v

        count = 0
        for key in en_data.keys():
            if key in existing_data:
                continue

            item = en_data[key]
            orig_msg = item.get("message", "")
            desc = item.get("description", "")
            
            translated_msg = translate_api(orig_msg, lang_code)
            if translated_msg is None:
                # Fallback to English on error
                translated_msg = orig_msg

            translated_data[key] = {
                "message": translated_msg
            }
            if desc:
                translated_data[key]["description"] = desc
            if "placeholders" in item:
                translated_data[key]["placeholders"] = item["placeholders"]

            count += 1
            if count % 20 == 0:
                print(f"Progress ({folder_name}): {count}/{len(keys_to_translate)} translated.")
            
            # Tiny sleep to avoid getting blocked
            time.sleep(0.05)

        # Sort the translations based on the original English keys order
        sorted_translated_data = {}
        for key in en_data.keys():
            if key in translated_data:
                sorted_translated_data[key] = translated_data[key]

        # Write out file
        with open(dest_path, "w", encoding="utf-8") as f:
            json.dump(sorted_translated_data, f, ensure_ascii=False, indent=2)

        print(f"Successfully saved {folder_name} translations to {dest_path}")

if __name__ == "__main__":
    run_translation()
