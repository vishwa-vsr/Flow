"""
FocusFlow Build Script
Copies the extension to a 'dist' folder with:
  - All JS comments removed
  - All JS whitespace minimized
  - All HTML whitespace minimized
  - Everything else copied as-is (icons, fonts, CSS, manifest, etc.)

Usage:  python build.py
Output: ../flow-dist/  (sibling folder next to source)
"""

import os
import re
import shutil
import sys
import json
import subprocess

# --- Config ---
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(os.path.dirname(SRC_DIR), "flow-dist")

# Files/folders to skip copying
SKIP = {"build.py", "node_modules", "package.json", "package-lock.json", ".git", ".gitignore", "__pycache__", "project_rules.md"}


def strip_js_comments(code):
    """Remove single-line (//) and multi-line (/* */) comments from JS code.
    Preserves strings and regex literals so we don't break URLs like https://..."""
    result = []
    i = 0
    n = len(code)
    while i < n:
        # Single-quoted string
        if code[i] == "'":
            j = i + 1
            while j < n:
                if code[j] == "\\" and j + 1 < n:
                    j += 2
                    continue
                if code[j] == "'":
                    j += 1
                    break
                j += 1
            result.append(code[i:j])
            i = j
        # Double-quoted string
        elif code[i] == '"':
            j = i + 1
            while j < n:
                if code[j] == "\\" and j + 1 < n:
                    j += 2
                    continue
                if code[j] == '"':
                    j += 1
                    break
                j += 1
            result.append(code[i:j])
            i = j
        # Template literal (backtick)
        elif code[i] == '`':
            j = i + 1
            while j < n:
                if code[j] == "\\" and j + 1 < n:
                    j += 2
                    continue
                if code[j] == '`':
                    j += 1
                    break
                j += 1
            result.append(code[i:j])
            i = j
        # Single-line comment
        elif code[i] == '/' and i + 1 < n and code[i + 1] == '/':
            # Skip to end of line
            j = i + 2
            while j < n and code[j] != '\n':
                j += 1
            i = j
        # Multi-line comment
        elif code[i] == '/' and i + 1 < n and code[i + 1] == '*':
            j = i + 2
            while j + 1 < n and not (code[j] == '*' and code[j + 1] == '/'):
                j += 1
            i = j + 2
        # Regular expression literal (basic detection)
        elif code[i] == '/' and i + 1 < n and code[i + 1] not in ('/', '*'):
            # Check if this is likely a regex (preceded by operator or keyword)
            prev_meaningful = ''.join(result).rstrip()
            if prev_meaningful and prev_meaningful[-1] in '=(:,;!&|?[{^~+-><%':
                j = i + 1
                while j < n:
                    if code[j] == "\\" and j + 1 < n:
                        j += 2
                        continue
                    if code[j] == '/':
                        j += 1
                        # Skip flags
                        while j < n and code[j].isalpha():
                            j += 1
                        break
                    if code[j] == '\n':
                        break
                    j += 1
                result.append(code[i:j])
                i = j
            else:
                result.append(code[i])
                i += 1
        else:
            result.append(code[i])
            i += 1
    return ''.join(result)


def collapse_whitespace_js(code):
    """Collapse multiple blank lines into single newlines and trim trailing spaces."""
    lines = code.split('\n')
    out = []
    prev_blank = False
    for line in lines:
        stripped = line.rstrip()
        if stripped == '':
            if not prev_blank:
                out.append('')
            prev_blank = True
        else:
            out.append(stripped)
            prev_blank = False
    # Remove leading/trailing blank lines
    while out and out[0] == '':
        out.pop(0)
    while out and out[-1] == '':
        out.pop()
    return '\n'.join(out)


def minify_html(html):
    """Basic HTML minification: collapse whitespace between tags, remove HTML comments."""
    # Remove HTML comments (but not conditional comments)
    html = re.sub(r'<!--(?!\[).*?-->', '', html, flags=re.DOTALL)
    # Collapse runs of whitespace between tags into a single space
    html = re.sub(r'>\s+<', '> <', html)
    # Collapse multiple spaces/tabs within lines
    lines = html.split('\n')
    out = []
    for line in lines:
        stripped = line.strip()
        if stripped:
            out.append(stripped)
    return '\n'.join(out)


def minify_css(css):
    """Basic CSS minification: remove comments, remove extra whitespace."""
    # Remove CSS comments: /* ... */
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
    # Remove spaces around selectors, braces, colons, semi-colons
    css = re.sub(r'\s*([{\};:,])\s*', r'\1', css)
    # Replace multiple spaces with a single space
    css = re.sub(r'\s+', ' ', css)
    return css.strip()


def minify_js_esbuild(src_path, dst_path):
    """Minify JavaScript using local esbuild if available, with a fallback to custom logic."""
    esbuild_cmd = os.path.join(SRC_DIR, "node_modules", ".bin", "esbuild.cmd")
    if not os.path.exists(esbuild_cmd):
        esbuild_cmd = "esbuild"
    try:
        subprocess.run([esbuild_cmd, src_path, "--minify", "--target=chrome90", "--outfile=" + dst_path],
                       capture_output=True, check=True, shell=True)
        return True
    except Exception:
        return False


def minify_css_esbuild(src_path, dst_path):
    """Minify CSS using local esbuild if available, with a fallback to custom logic."""
    esbuild_cmd = os.path.join(SRC_DIR, "node_modules", ".bin", "esbuild.cmd")
    if not os.path.exists(esbuild_cmd):
        esbuild_cmd = "esbuild"
    try:
        subprocess.run([esbuild_cmd, src_path, "--minify", "--outfile=" + dst_path],
                       capture_output=True, check=True, shell=True)
        return True
    except Exception:
        return False


def process_file(src_path, dst_path):
    """Process a single file: minify JS/HTML/CSS or copy as-is."""
    ext = os.path.splitext(src_path)[1].lower()

    if ext == '.js':
        with open(src_path, 'r', encoding='utf-8', errors='replace') as f:
            code = f.read()
        original_size = len(code.encode('utf-8'))
        
        success = minify_js_esbuild(src_path, dst_path)
        if success:
            new_size = os.path.getsize(dst_path)
        else:
            # Fallback to custom comment/whitespace remover if esbuild fails
            code = strip_js_comments(code)
            code = collapse_whitespace_js(code)
            new_size = len(code.encode('utf-8'))
            with open(dst_path, 'w', encoding='utf-8') as f:
                f.write(code)
                
        saved = original_size - new_size
        if saved > 100:
            print(f"  JS  {os.path.basename(src_path):30s}  {original_size:>8,} -> {new_size:>8,}  (saved {saved:,} bytes)")
        return original_size, new_size

    elif ext in ('.html', '.htm'):
        with open(src_path, 'r', encoding='utf-8', errors='replace') as f:
            html = f.read()
        original_size = len(html.encode('utf-8'))
        html = minify_html(html)
        new_size = len(html.encode('utf-8'))
        with open(dst_path, 'w', encoding='utf-8') as f:
            f.write(html)
        saved = original_size - new_size
        if saved > 100:
            print(f"  HTML {os.path.basename(src_path):30s} {original_size:>8,} -> {new_size:>8,}  (saved {saved:,} bytes)")
        return original_size, new_size

    elif ext == '.css':
        with open(src_path, 'r', encoding='utf-8', errors='replace') as f:
            css = f.read()
        original_size = len(css.encode('utf-8'))
        
        success = minify_css_esbuild(src_path, dst_path)
        if success:
            new_size = os.path.getsize(dst_path)
        else:
            # Fallback to custom comment/whitespace remover if esbuild fails
            css = minify_css(css)
            new_size = len(css.encode('utf-8'))
            with open(dst_path, 'w', encoding='utf-8') as f:
                f.write(css)
                
        saved = original_size - new_size
        if saved > 100:
            print(f"  CSS  {os.path.basename(src_path):30s}  {original_size:>8,} -> {new_size:>8,}  (saved {saved:,} bytes)")
        return original_size, new_size

    else:
        shutil.copy2(src_path, dst_path)
        size = os.path.getsize(src_path)
        return size, size


def build_target(target_name, is_firefox=False):
    target_dir = os.path.join(os.path.dirname(SRC_DIR), target_name)
    print("=" * 60)
    print(f"  FocusFlow Build: {target_name}")
    print("=" * 60)
    print(f"\n  Source:  {SRC_DIR}")
    print(f"  Output:  {target_dir}\n")

    # Clean old dist
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
        print(f"  Cleaned old {target_name} folder.\n")

    total_original = 0
    total_new = 0
    file_count = 0

    for root, dirs, files in os.walk(SRC_DIR):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in SKIP]

        rel_dir = os.path.relpath(root, SRC_DIR)
        dst_dir = os.path.join(target_dir, rel_dir) if rel_dir != '.' else target_dir

        os.makedirs(dst_dir, exist_ok=True)

        for fname in files:
            if fname in SKIP:
                continue
            src_path = os.path.join(root, fname)
            dst_path = os.path.join(dst_dir, fname)
            orig, new = process_file(src_path, dst_path)
            
            # Apply Firefox-specific tweaks to manifest.json
            if is_firefox and fname == "manifest.json" and root == SRC_DIR:
                with open(dst_path, 'r', encoding='utf-8') as f:
                    manifest = json.load(f)
                
                # Convert service_worker to scripts array and include its dependencies
                if "background" in manifest and "service_worker" in manifest["background"]:
                    manifest["background"]["scripts"] = [
                        "src/lib/constants.js",
                        "src/lib/storage.js",
                        "src/lib/db.js",
                        manifest["background"]["service_worker"]
                    ]
                    del manifest["background"]["service_worker"]
                
                # Add Gecko ID and Telemetry declaration
                manifest["browser_specific_settings"] = {
                    "gecko": {
                        "id": "focusflow@prime-vsr-cloud",
                        "data_collection_permissions": {
                            "required": ["none"]
                        }
                    }
                }
                
                # Remove Firefox-unsupported 'favicon' permission
                if "permissions" in manifest and "favicon" in manifest["permissions"]:
                    manifest["permissions"].remove("favicon")
                
                # Remove Firefox-unsupported '_favicon/*' from web_accessible_resources
                if "web_accessible_resources" in manifest:
                    for war in manifest["web_accessible_resources"]:
                        if "resources" in war and "_favicon/*" in war["resources"]:
                            war["resources"].remove("_favicon/*")
                
                with open(dst_path, 'w', encoding='utf-8') as f:
                    json.dump(manifest, f, indent=2)
                
                print(f"  [Firefox] Tweaked manifest.json for Gecko compatibility")

            total_original += orig
            total_new += new
            file_count += 1

    # Write custom RESTORE_INSTRUCTIONS.txt with browser-specific loading steps
    manifest_path = os.path.join(SRC_DIR, "manifest.json")
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        version = manifest.get("version", "6.9.0")
    except Exception:
        version = "6.9.0"

    readme_path = os.path.join(target_dir, "RESTORE_INSTRUCTIONS.txt")
    if is_firefox:
        instructions = f"""FocusFlow Firefox Build - Version {version}
========================================

How to load/restore this extension temporarily in Mozilla Firefox:
1. Open Mozilla Firefox.
2. Go to the Debugging page by typing 'about:debugging#/runtime/this-firefox' in the URL address bar.
3. Click the "Load Temporary Add-on..." button.
4. Select the 'manifest.json' file inside this folder ('{target_name}') to load the extension.
"""
    else:
        instructions = f"""FocusFlow Chrome Build - Version {version}
========================================

How to load/restore this extension in Google Chrome:
1. Open Google Chrome.
2. Go to the Extensions page by typing 'chrome://extensions/' in the URL address bar.
3. Turn on the "Developer mode" switch in the top right corner.
4. Click the "Load unpacked" button in the top left corner.
5. Select this folder ('{target_name}') to load the extension.
"""
    try:
        with open(readme_path, "w", encoding="utf-8") as rf:
            rf.write(instructions)
    except Exception as e:
        print(f"  [Warning] Could not write restore instructions: {e}")

    saved = total_original - total_new
    print(f"\n{'=' * 60}")
    print(f"  Done! {file_count} files processed.")
    print(f"  Total:  {total_original:>10,} bytes  ->  {total_new:>10,} bytes")
    if total_original > 0:
        print(f"  Saved:  {saved:>10,} bytes  ({saved * 100 // total_original}%)")
    print(f"  Output: {target_dir}")
    print(f"{'=' * 60}\n")


def check_version_and_backup():
    # Detect if we should run interactively or skip prompting
    if len(sys.argv) > 1 and sys.argv[1] in ("--skip-prompt", "--yes", "-y"):
        return

    # Path to manifest.json
    manifest_path = os.path.join(SRC_DIR, "manifest.json")
    if not os.path.exists(manifest_path):
        return

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except Exception as e:
        print(f"Error reading manifest.json: {e}")
        return

    current_version = manifest.get("version", "6.8.0")
    
    # Calculate the next version number
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)$", current_version)
    if match:
        major, minor, patch = match.groups()
        next_version = f"{major}.{minor}.{int(patch) + 1}"
    else:
        next_version = current_version + ".1"

    # Ask the user
    skip_prompt = len(sys.argv) > 1 and sys.argv[1] in ("--skip-prompt", "--yes", "-y")
    if skip_prompt:
        ans = "n"
    else:
        try:
            ans = input(f"Would you like to bump the version from {current_version} to {next_version} and create a backup of the old code? (y/n) [n]: ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            print("\nBuild cancelled.")
            sys.exit(0)

    if ans in ("y", "yes"):
        parent_dir = os.path.dirname(SRC_DIR)
        backup_root = os.path.join(parent_dir, "backup")
        
        # Ensure D:\Anti Gravity\FLOW\backup exists
        os.makedirs(backup_root, exist_ok=True)
        
        backup_folder = os.path.join(backup_root, f"flow-source-backup-v{current_version}")
        
        if os.path.exists(backup_folder):
            print(f"Backup folder {backup_folder} already exists. Overwriting...")
            shutil.rmtree(backup_folder)
            
        print(f"Creating backup of old version {current_version}...")
        
        # Helper to ignore build output, git files, and packages in the backup
        def ignore_patterns(path, names):
            ignored = []
            for name in names:
                if name in SKIP or name == "backup":
                    ignored.append(name)
            return ignored
            
        try:
            shutil.copytree(SRC_DIR, backup_folder, ignore=ignore_patterns)
            
            # Create a simple instruction file on how to restore
            readme_path = os.path.join(backup_folder, "RESTORE_INSTRUCTIONS.txt")
            with open(readme_path, "w", encoding="utf-8") as rf:
                rf.write(f"FocusFlow Backup - Version {current_version}\n")
                rf.write("=" * 40 + "\n\n")
                rf.write("How to restore this version:\n")
                rf.write("1. Delete or rename the active 'flow-source' directory.\n")
                rf.write(f"2. Copy this folder ('flow-source-backup-v{current_version}') to the parent folder.\n")
                rf.write("3. Rename the copied folder back to 'flow-source'.\n")
            print("Backup created successfully.")
        except Exception as e:
            print(f"Warning: Failed to create backup: {e}")
            
        # Update manifest.json with next version
        manifest["version"] = next_version
        try:
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)
            print(f"Version successfully updated to {next_version} in manifest.json.")
        except Exception as e:
            print(f"Error updating manifest.json: {e}")
            sys.exit(1)


if __name__ == "__main__":
    check_version_and_backup()
    
    # Detect if we should run interactively or skip prompting
    skip_prompt = len(sys.argv) > 1 and sys.argv[1] in ("--skip-prompt", "--yes", "-y")
    
    should_build = False
    if skip_prompt:
        should_build = True
    else:
        try:
            ans = input("Would you like to compile/build the Chrome (dist) and Firefox folders now? (y/n) [n]: ").strip().lower()
            if ans in ("y", "yes"):
                should_build = True
        except (KeyboardInterrupt, EOFError):
            print("\nBuild process exited.")
            sys.exit(0)
            
    if should_build:
        build_target("flow-dist", is_firefox=False)
        build_target("flow-firefox", is_firefox=True)
        
        # Remove any existing zip files in the parent directory to keep workspace clean
        parent_dir = os.path.dirname(SRC_DIR)
        for item in os.listdir(parent_dir):
            if item.endswith(".zip") and (item.startswith("flow-dist-v") or item.startswith("flow-firefox-v")):
                try:
                    os.remove(os.path.join(parent_dir, item))
                    print(f"  [Cleanup] Removed old archive: {item}")
                except Exception as e:
                    print(f"  [Warning] Could not remove old archive {item}: {e}")
        
        # Get current version from manifest.json
        manifest_path = os.path.join(SRC_DIR, "manifest.json")
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            version = manifest.get("version", "6.9.0")
        except Exception:
            version = "6.9.0"
            
        if "--zip" in sys.argv:
            import zipfile
            def zip_target(name):
                target_dir = os.path.join(os.path.dirname(SRC_DIR), name)
                zip_file_path = os.path.join(os.path.dirname(SRC_DIR), f"{name}-v{version}.zip")
                if os.path.exists(zip_file_path):
                    os.remove(zip_file_path)
                with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, _, files in os.walk(target_dir):
                        for file in files:
                            if file == "RESTORE_INSTRUCTIONS.txt":
                                continue
                            abs_p = os.path.join(root, file)
                            rel_p = os.path.relpath(abs_p, target_dir)
                            # Force standard forward slash for archive path names (fixes Firefox validator error!)
                            archive_name = rel_p.replace(os.sep, '/')
                            zipf.write(abs_p, archive_name)
                print(f"  [Zip] Packaged {name} into {os.path.basename(zip_file_path)}")

            print("=" * 60)
            print("  Packaging Zip Archives for Store Uploads")
            print("=" * 60)
            zip_target("flow-dist")
            zip_target("flow-firefox")
            print("=" * 60 + "\n")
        else:
            print("  [Build] Skipping zip packaging (run with '--zip' flag if you want to generate store upload zip packages).")
    else:
        print("Skipping distribution builds. Your source code changes are saved in 'flow-source'.")
