import os
import json

# Define paths (using relative paths for portability)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.dirname(SCRIPT_DIR)
LOCALES_DIR = os.path.join(SOURCE_DIR, "_locales")
OUTPUT_HTML = os.path.join(SCRIPT_DIR, "languages_analysis.html")

def analyze_locales():
    if not os.path.exists(LOCALES_DIR):
        print(f"Error: Locales directory not found at {LOCALES_DIR}")
        return

    # Load English as reference
    en_path = os.path.join(LOCALES_DIR, "en", "messages.json")
    if not os.path.exists(en_path):
        print(f"Error: Reference English locale not found at {en_path}")
        return

    try:
        with open(en_path, "r", encoding="utf-8") as f:
            en_data = json.load(f)
    except Exception as e:
        print(f"Error reading English messages.json: {e}")
        return

    ref_keys = set(en_data.keys())
    analysis_results = {}

    # Read other locales
    for lang_code in os.listdir(LOCALES_DIR):
        if lang_code == "en":
            continue
        
        lang_path = os.path.join(LOCALES_DIR, lang_code, "messages.json")
        if not os.path.exists(lang_path):
            continue

        try:
            with open(lang_path, "r", encoding="utf-8") as f:
                lang_data = json.load(f)
        except Exception as e:
            print(f"Warning: Could not parse JSON for locale '{lang_code}': {e}")
            continue

        lang_keys = set(lang_data.keys())
        
        missing = sorted(list(ref_keys - lang_keys))
        extra = sorted(list(lang_keys - ref_keys))
        
        analysis_results[lang_code] = {
            "missing": missing,
            "extra": extra,
            "isComplete": len(missing) == 0 and len(extra) == 0,
            "totalKeys": len(lang_keys)
        }

    # Print summary to console
    print("\n==================================================")
    print("  Flow Language Key Analysis")
    print("==================================================")
    print(f"Reference (English): {len(ref_keys)} keys\n")

    for lang, res in analysis_results.items():
        status = "COMPLETED" if res["isComplete"] else "INCOMPLETE"
        print(f"Locale: [{lang}] - {res['totalKeys']} keys ({status})")
        if res["missing"]:
            print(f"  Missing ({len(res['missing'])}): {', '.join(res['missing'][:5])}" + ("..." if len(res['missing']) > 5 else ""))
        if res["extra"]:
            print(f"  Extra ({len(res['extra'])}): {', '.join(res['extra'][:5])}" + ("..." if len(res['extra']) > 5 else ""))
        print("-" * 50)

    # Generate visual HTML dashboard
    generate_html(len(ref_keys), analysis_results)

def generate_html(ref_key_count, results):
    os.makedirs(os.path.dirname(OUTPUT_HTML), exist_ok=True)
    
    # Language names mapping
    lang_names = {
        "es": "Spanish (Español)",
        "fr": "French (Français)",
        "de": "German (Deutsch)",
        "zh": "Chinese (中文)",
        "zh_CN": "Chinese (Simplified) (简体中文)",
        "zh_TW": "Chinese (Traditional) (繁體中文)",
        "zh_HK": "Chinese (Hong Kong) (繁體中文 - 香港)",
        "cs": "Czech (Čeština)",
        "tr": "Turkish (Türkçe)"
    }

    # Format data for embedding in HTML
    embedded_data = {}
    for lang, res in results.items():
        name = lang_names.get(lang, lang.upper())
        embedded_data[lang] = {
            "name": name,
            "missing": res["missing"],
            "extra": res["extra"],
            "isComplete": res["isComplete"]
        }

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flow Translation Key Analyzer</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-dark: #0f131a;
            --card-bg: rgba(22, 28, 38, 0.7);
            --card-border: rgba(255, 255, 255, 0.08);
            --accent-green: #10b981;
            --accent-red: #ef4444;
            --accent-blue: #3b82f6;
            --text-main: #f3f4f6;
            --text-muted: #9ca3af;
        }}

        body {{
            background-color: var(--bg-dark);
            color: var(--text-main);
            font-family: 'Plus Jakarta Sans', sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }}

        header {{
            width: 100%;
            max-width: 900px;
            padding: 2.5rem 1.5rem 1rem 1.5rem;
            box-sizing: border-box;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        header h1 {{
            font-size: 1.5rem;
            margin: 0;
            font-weight: 700;
            background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}

        header span {{
            font-size: 0.875rem;
            color: var(--text-muted);
        }}

        main {{
            width: 100%;
            max-width: 900px;
            padding: 1.5rem;
            box-sizing: border-box;
        }}

        .card {{
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }}

        .card-title {{
            font-size: 1.125rem;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .status-badge {{
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
        }}

        .status-complete {{
            background: rgba(16, 185, 129, 0.15);
            color: var(--accent-green);
            border: 1px solid rgba(16, 185, 129, 0.3);
        }}

        .status-incomplete {{
            background: rgba(239, 68, 68, 0.15);
            color: var(--accent-red);
            border: 1px solid rgba(239, 68, 68, 0.3);
        }}

        ul {{
            list-style: none;
            padding: 0;
            margin: 0;
        }}

        .key-item {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            margin-bottom: 0.5rem;
            border-radius: 12px;
            font-size: 0.9rem;
            border-left: 4px solid transparent;
        }}

        .key-item.missing {{
            background: rgba(239, 68, 68, 0.08);
            border-left-color: var(--accent-red);
            color: #fca5a5;
        }}

        .key-item.extra {{
            background: rgba(59, 130, 246, 0.08);
            border-left-color: var(--accent-blue);
            color: #93c5fd;
        }}

        .key-item.complete {{
            background: rgba(16, 185, 129, 0.08);
            border-left-color: var(--accent-green);
            color: #a7f3d0;
        }}

        .key-item.checked code {{
            text-decoration: line-through;
            opacity: 0.5;
        }}

        code {{
            background: rgba(255, 255, 255, 0.06);
            padding: 0.2rem 0.4rem;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.85rem;
        }}

        input[type="checkbox"] {{
            appearance: none;
            width: 18px;
            height: 18px;
            border: 2px solid var(--accent-red);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }}

        input[type="checkbox"]:checked {{
            background: var(--accent-red);
            border-color: var(--accent-red);
        }}

        input[type="checkbox"]:checked::after {{
            content: "✓";
            color: white;
            font-size: 11px;
            font-weight: bold;
        }}

        .language-group {{
            margin-bottom: 1rem;
        }}

        .language-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            cursor: pointer;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.2s;
        }}

        .language-header:hover {{
            background: rgba(255, 255, 255, 0.06);
            transform: translateX(4px);
        }}

        .language-title {{
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .language-title::before {{
            content: "▼";
            font-size: 0.7rem;
            transition: transform 0.2s;
        }}

        .collapsed .language-title::before {{
            transform: rotate(-90deg);
        }}

        .collapsed .key-list {{
            display: none;
        }}

        .key-list {{
            padding: 0.75rem 0 0 1rem;
        }}

        .metrics {{
            font-size: 0.8rem;
            display: flex;
            gap: 0.75rem;
        }}

        .metric-missing {{
            color: var(--accent-red);
        }}

        .metric-extra {{
            color: var(--accent-blue);
        }}
    </style>
</head>
<body>
    <header>
        <div>
            <h1>Flow Translation Key Analyzer</h1>
            <span>Reference English Keys: {ref_key_count}</span>
        </div>
    </header>
    <main>
        <div class="card">
            <h2 class="card-title">Completed Languages</h2>
            <ul id="complete-list"></ul>
        </div>
        <div class="card">
            <h2 class="card-title">Incomplete Languages</h2>
            <div id="incomplete-list"></div>
        </div>
    </main>

    <script>
        const analysisData = {json.dumps(embedded_data, indent=2)};

        const completeList = document.getElementById("complete-list");
        const incompleteList = document.getElementById("incomplete-list");

        // Render completed
        let hasComplete = false;
        let hasIncomplete = false;

        for (const [lang, data] of Object.entries(analysisData)) {{
            if (data.isComplete) {{
                hasComplete = true;
                const li = document.createElement("li");
                li.className = "key-item complete";
                li.innerHTML = `<strong>${{data.name}}</strong> is fully aligned with English (no missing or extra keys).`;
                completeList.appendChild(li);
            }} else {{
                hasIncomplete = true;
                const group = document.createElement("div");
                group.className = "language-group collapsed";
                
                const header = document.createElement("div");
                header.className = "language-header";
                header.innerHTML = `
                    <div class="language-title">${{data.name}}</div>
                    <div class="metrics">
                        <span class="metric-missing">-${{data.missing.length}} missing</span>
                        <span class="metric-extra">+${{data.extra.length}} extra</span>
                    </div>
                `;
                
                header.addEventListener("click", () => {{
                    group.classList.toggle("collapsed");
                }});

                const list = document.createElement("div");
                list.className = "key-list";

                data.missing.forEach(key => {{
                    const item = document.createElement("div");
                    item.className = "key-item missing";
                    item.innerHTML = `
                        <input type="checkbox" onchange="this.closest('.key-item').classList.toggle('checked', this.checked)">
                        <span>Missing key: <code>${{key}}</code></span>
                    `;
                    list.appendChild(item);
                }});

                data.extra.forEach(key => {{
                    const item = document.createElement("div");
                    item.className = "key-item extra";
                    item.innerHTML = `
                        <span>Extra key: <code>${{key}}</code></span>
                    `;
                    list.appendChild(item);
                }});

                group.appendChild(header);
                group.appendChild(list);
                incompleteList.appendChild(group);
            }}
        }}

        if (!hasComplete) {{
            completeList.innerHTML = `<li class="key-item" style="color: var(--text-muted)">No languages are fully complete yet.</li>`;
        }}
        if (!hasIncomplete) {{
            incompleteList.innerHTML = `<div class="key-item complete" style="justify-content: center;">All locales are 100% complete and aligned!</div>`;
        }}
    </script>
</body>
</html>
"""

    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Generated HTML dashboard at: {OUTPUT_HTML}")

if __name__ == "__main__":
    analyze_locales()
