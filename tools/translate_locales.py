import os
import json
import urllib.request
import urllib.parse
import time
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.dirname(SCRIPT_DIR)
LOCALES_DIR = os.path.join(SOURCE_DIR, "src", "_locales")
EN_PATH = os.path.join(LOCALES_DIR, "en", "messages.json")

# Supported target languages for batch translation script
TARGET_LANGS = {
    "fr": "fr",     # French
    "ko": "ko",     # Korean
    "ru": "ru",     # Russian
    "es": "es",     # Spanish
    "de": "de",     # German
    "ja": "ja",     # Japanese
    "pt_BR": "pt",  # Brazilian Portuguese
    "zh_CN": "zh-CN", # Simplified Chinese
    "zh_TW": "zh-TW", # Traditional Chinese (Taiwan)
    "zh_HK": "zh-HK"  # Traditional Chinese (Hong Kong)
}

def translate_batch(texts, target_lang):
    if not texts:
        return []
    
    DELIMITER = " ||| "
    processed_texts = []
    placeholders_map = []
    
    for text in texts:
        ph_list = re.findall(r'\$\w+\$|\$\d+', text)
        temp_text = text
        for idx, ph in enumerate(ph_list):
            temp_text = temp_text.replace(ph, f"[[{idx}]]")
        processed_texts.append(temp_text)
        placeholders_map.append(ph_list)
    
    combined_text = DELIMITER.join(processed_texts)
    encoded_text = urllib.parse.quote(combined_text)
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target_lang}&dt=t&q={encoded_text}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            translated_parts = [part[0] for part in data[0] if part[0]]
            full_translated = "".join(translated_parts)
            
            raw_splits = re.split(r'\s*\|\|\|\s*', full_translated)
            if len(raw_splits) != len(texts):
                return [translate_single(text, ph_list, target_lang) for text, ph_list in zip(texts, placeholders_map)]
            
            results = []
            for split_item, ph_list in zip(raw_splits, placeholders_map):
                translated_item = split_item
                for idx, ph in enumerate(ph_list):
                    pattern = rf'\[\s*\[\s*{idx}\s*\]\s*\]'
                    translated_item = re.sub(pattern, ph, translated_item)
                results.append(translated_item)
            return results
    except Exception:
        return [translate_single(text, ph_list, target_lang) for text, ph_list in zip(texts, placeholders_map)]

def translate_single(text, ph_list, target_lang):
    if not text.strip():
        return text
    temp_text = text
    for idx, ph in enumerate(ph_list):
        temp_text = temp_text.replace(ph, f"[[{idx}]]")
    encoded_text = urllib.parse.quote(temp_text)
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target_lang}&dt=t&q={encoded_text}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            parts = [part[0] for part in data[0] if part[0]]
            res = "".join(parts)
            for idx, ph in enumerate(ph_list):
                pattern = rf'\[\s*\[\s*{idx}\s*\]\s*\]'
                res = re.sub(pattern, ph, res)
            return res
    except Exception:
        return text

def run_translation():
    if not os.path.exists(EN_PATH):
        print(f"Error: Source English locale not found at {EN_PATH}")
        return

    with open(EN_PATH, "r", encoding="utf-8") as f:
        en_data = json.load(f)

    BATCH_SIZE = 15

    for folder_name, lang_code in TARGET_LANGS.items():
        lang_dir = os.path.join(LOCALES_DIR, folder_name)
        os.makedirs(lang_dir, exist_ok=True)
        dest_path = os.path.join(lang_dir, "messages.json")

        existing_data = {}
        if os.path.exists(dest_path):
            try:
                with open(dest_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
            except Exception:
                pass

        translated_data = dict(existing_data)
        keys_to_translate = [k for k in en_data.keys() if k not in existing_data]

        if not keys_to_translate:
            print(f"All keys for {folder_name} are already translated!")
            continue

        print(f"Translating {len(keys_to_translate)} keys for {folder_name} in batches of {BATCH_SIZE}...")

        for i in range(0, len(keys_to_translate), BATCH_SIZE):
            batch_keys = keys_to_translate[i:i+BATCH_SIZE]
            batch_texts = [en_data[k].get("message", "") for k in batch_keys]

            translated_texts = translate_batch(batch_texts, lang_code)

            for key, trans_msg in zip(batch_keys, translated_texts):
                item = en_data[key]
                desc = item.get("description", "")
                translated_data[key] = {"message": trans_msg}
                if desc:
                    translated_data[key]["description"] = desc
                if "placeholders" in item:
                    translated_data[key]["placeholders"] = item["placeholders"]

            sorted_data = {k: translated_data[k] for k in en_data.keys() if k in translated_data}
            with open(dest_path, "w", encoding="utf-8") as f:
                json.dump(sorted_data, f, ensure_ascii=False, indent=2)

            time.sleep(0.2)

        print(f"Saved {folder_name} translations to {dest_path}")

if __name__ == "__main__":
    run_translation()
