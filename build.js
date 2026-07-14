/**
 * Flow JavaScript Build Script (Node.js)
 * Copies the extension to a 'dist' folder with:
 *   - JS and CSS minified using esbuild's official JS API
 *   - HTML comments removed and whitespace minimized
 *   - Firefox-specific adjustments automatically applied for the Firefox folder
 *   - Creates zip archives for store uploads when run with the --zip flag
 *
 * Usage:  node build.js [--zip] [-y]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const SRC_DIR = __dirname;
const PARENT_DIR = path.dirname(SRC_DIR);

// Files and folders to skip copying
const SKIP = new Set([
  'build.py',
  'build.js',
  'node_modules',
  'package.json',
  'package-lock.json',
  '.git',
  '.gitignore',
  '__pycache__',
  'project_rules.md',
  'design.md',
  'README.md',
  '.github',
  'tools'
]);

// Helper to ask user questions in the terminal
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Fallback HTML minifier
function minifyHtml(html) {
  // Remove HTML comments (except IE conditional comments)
  html = html.replace(/<!--(?!\[)[\s\S]*?-->/g, '');
  // Collapse whitespace between tags
  html = html.replace(/>\s+</g, '> <');
  // Trim spaces on each line and remove empty lines
  return html.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

// Fallback CSS minifier (if esbuild is not found)
function minifyCssFallback(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, ''); // remove comments
  css = css.replace(/\s*([{\};:,])\s*/g, '$1'); // remove spaces around symbols
  css = css.replace(/\s+/g, ' '); // replace multiple spaces
  return css.trim();
}

// Fallback JS comment and space remover (if esbuild is not found)
function minifyJsFallback(code) {
  // Very basic cleanup (collapsing multiple lines and removing simple trailing spaces)
  const lines = code.split('\n');
  const out = [];
  let prevBlank = false;
  for (let line of lines) {
    const stripped = line.trimEnd();
    if (stripped === '') {
      if (!prevBlank) out.push('');
      prevBlank = true;
    } else {
      out.push(stripped);
      prevBlank = false;
    }
  }
  return out.filter(Boolean).join('\n');
}

// Minify JavaScript using esbuild
function minifyJs(srcPath, dstPath) {
  try {
    const esbuild = require('esbuild');
    esbuild.buildSync({
      entryPoints: [srcPath],
      minify: true,
      target: 'chrome90',
      outfile: dstPath,
      logLevel: 'silent'
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Minify CSS using esbuild
function minifyCss(srcPath, dstPath) {
  try {
    const esbuild = require('esbuild');
    esbuild.buildSync({
      entryPoints: [srcPath],
      minify: true,
      outfile: dstPath,
      logLevel: 'silent'
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Process a single file (minify or copy directly)
function processFile(srcPath, dstPath) {
  const ext = path.extname(srcPath).toLowerCase();
  const stat = fs.statSync(srcPath);
  let originalSize = stat.size;
  let newSize = originalSize;

  if (ext === '.js') {
    const success = minifyJs(srcPath, dstPath);
    if (!success) {
      // Fallback
      let code = fs.readFileSync(srcPath, 'utf8');
      code = minifyJsFallback(code);
      fs.writeFileSync(dstPath, code, 'utf8');
      newSize = fs.statSync(dstPath).size;
    } else {
      newSize = fs.statSync(dstPath).size;
    }
    const saved = originalSize - newSize;
    if (saved > 100) {
      console.log(`  JS   ${path.basename(srcPath).padEnd(30)}  ${originalSize.toLocaleString().padStart(8)} -> ${newSize.toLocaleString().padStart(8)}  (saved ${saved.toLocaleString()} bytes)`);
    }
    return [originalSize, newSize];
  }

  if (ext === '.css') {
    const success = minifyCss(srcPath, dstPath);
    if (!success) {
      let css = fs.readFileSync(srcPath, 'utf8');
      css = minifyCssFallback(css);
      fs.writeFileSync(dstPath, css, 'utf8');
      newSize = fs.statSync(dstPath).size;
    } else {
      newSize = fs.statSync(dstPath).size;
    }
    const saved = originalSize - newSize;
    if (saved > 100) {
      console.log(`  CSS  ${path.basename(srcPath).padEnd(30)}  ${originalSize.toLocaleString().padStart(8)} -> ${newSize.toLocaleString().padStart(8)}  (saved ${saved.toLocaleString()} bytes)`);
    }
    return [originalSize, newSize];
  }

  if (ext === '.html' || ext === '.htm') {
    let html = fs.readFileSync(srcPath, 'utf8');
    html = minifyHtml(html);
    fs.writeFileSync(dstPath, html, 'utf8');
    newSize = fs.statSync(dstPath).size;
    const saved = originalSize - newSize;
    if (saved > 100) {
      console.log(`  HTML ${path.basename(srcPath).padEnd(30)}  ${originalSize.toLocaleString().padStart(8)} -> ${newSize.toLocaleString().padStart(8)}  (saved ${saved.toLocaleString()} bytes)`);
    }
    return [originalSize, newSize];
  }

  // Copy other files (images, JSON, fonts) exactly as they are
  fs.copyFileSync(srcPath, dstPath);
  return [originalSize, originalSize];
}

// Build a target directory (Chrome, Firefox, or Edge)
function buildTarget(targetName, isFirefox = false) {
  const targetDir = path.join(PARENT_DIR, targetName);
  console.log('='.repeat(60));
  console.log(`  Flow Build: ${targetName}`);
  console.log('='.repeat(60));
  console.log(`  Source:  ${SRC_DIR}`);
  console.log(`  Output:  ${targetDir}\n`);

  // Clean old target folder if it exists
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log(`  Cleaned old ${targetName} folder.\n`);
  }
  fs.mkdirSync(targetDir, { recursive: true });

  let totalOriginal = 0;
  let totalNew = 0;
  let fileCount = 0;

  function walkAndProcess(currentDir, relativeSubdir = '') {
    const list = fs.readdirSync(currentDir);
    list.forEach(item => {
      if (SKIP.has(item)) return;

      const srcPath = path.join(currentDir, item);
      const relPath = path.join(relativeSubdir, item);
      const dstPath = path.join(targetDir, relPath);

      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        fs.mkdirSync(dstPath, { recursive: true });
        walkAndProcess(srcPath, relPath);
      } else {
        // Skip specific files
        if (item.endsWith('.md') || item.startsWith('flow_preview') || item === 'LICENSE') {
          return;
        }

        const [orig, compressed] = processFile(srcPath, dstPath);

        // Firefox adjustments for manifest.json
        if (isFirefox && item === 'manifest.json' && relativeSubdir === '') {
          const manifest = JSON.parse(fs.readFileSync(dstPath, 'utf8'));

          if (manifest.background && manifest.background.service_worker) {
            manifest.background.scripts = [
              'src/lib/constants.js',
              'src/lib/storage.js',
              'src/lib/db.js',
              manifest.background.service_worker
            ];
            delete manifest.background.service_worker;
          }

          manifest.browser_specific_settings = {
            gecko: {
              id: 'focusflow@prime-vsr-cloud',
              data_collection_permissions: { required: ['none'] }
            }
          };

          if (manifest.permissions) {
            manifest.permissions = manifest.permissions.filter(p => p !== 'favicon');
          }

          if (manifest.web_accessible_resources) {
            manifest.web_accessible_resources.forEach(war => {
              if (war.resources) {
                war.resources = war.resources.filter(r => r !== '_favicon/*');
              }
            });
          }

          fs.writeFileSync(dstPath, JSON.stringify(manifest, null, 2), 'utf8');
          console.log(`  [Firefox] Tweaked manifest.json for Gecko compatibility`);
        }

        totalOriginal += orig;
        totalNew += compressed;
        fileCount++;
      }
    });
  }

  walkAndProcess(SRC_DIR);

  // Write RESTORE_INSTRUCTIONS.txt
  const manifestPath = path.join(SRC_DIR, 'manifest.json');
  let version = '10.0.0';
  if (fs.existsSync(manifestPath)) {
    try {
      version = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).version || '10.0.0';
    } catch (e) {}
  }

  const instructionsPath = path.join(targetDir, 'RESTORE_INSTRUCTIONS.txt');
  const instructions = isFirefox
    ? `Flow Firefox Build - Version ${version}\n========================================\n\nHow to load this extension temporarily in Mozilla Firefox:\n1. Open Mozilla Firefox.\n2. Type 'about:debugging#/runtime/this-firefox' in the bar.\n3. Click "Load Temporary Add-on...".\n4. Select the 'manifest.json' file inside this folder ('${targetName}').`
    : `Flow Chrome Build - Version ${version}\n========================================\n\nHow to load this extension in Google Chrome:\n1. Open Google Chrome.\n2. Type 'chrome://extensions/' in the bar.\n3. Turn on the "Developer mode" switch in the top right corner.\n4. Click the "Load unpacked" button in the top left corner.\n5. Select this folder ('${targetName}').`;

  fs.writeFileSync(instructionsPath, instructions, 'utf8');

  const saved = totalOriginal - totalNew;
  console.log('\n' + '='.repeat(60));
  console.log(`  Done! ${fileCount} files processed.`);
  console.log(`  Total:  ${totalOriginal.toLocaleString().padStart(10)} bytes -> ${totalNew.toLocaleString().padStart(10)} bytes`);
  if (totalOriginal > 0) {
    const pct = Math.round((saved * 100) / totalOriginal);
    console.log(`  Saved:  ${saved.toLocaleString().padStart(10)} bytes (${pct}%)`);
  }
  console.log(`  Output: ${targetDir}`);
  console.log('='.repeat(60) + '\n');
}

// Bumps the manifest version and makes a backup folder
async function checkVersionAndBackup(skipPrompt) {
  const manifestPath = path.join(SRC_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    console.error('Error reading manifest.json:', e);
    return;
  }

  const currentVersion = manifest.version || '10.0.0';
  const versionParts = currentVersion.split('.');
  let nextVersion = currentVersion;
  if (versionParts.length === 3) {
    nextVersion = `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2]) + 1}`;
  } else {
    nextVersion = currentVersion + '.1';
  }

  let ans = 'n';
  if (!skipPrompt) {
    ans = await askQuestion(`Would you like to bump the version from {currentVersion} to {nextVersion} and create a backup of the old code? (y/n) [n]: `);
    ans = ans.trim().toLowerCase();
  }

  if (ans === 'y' || ans === 'yes') {
    const backupRoot = path.join(PARENT_DIR, 'backup');
    fs.mkdirSync(backupRoot, { recursive: true });

    const backupFolder = path.join(backupRoot, `flow-source-backup-v${currentVersion}`);
    if (fs.existsSync(backupFolder)) {
      console.log(`Backup folder already exists. Overwriting...`);
      fs.rmSync(backupFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(backupFolder);

    // Recursive copy function for backup
    function copyBackup(current, dest) {
      const list = fs.readdirSync(current);
      list.forEach(item => {
        if (SKIP.has(item) || item === 'backup') return;
        const srcP = path.join(current, item);
        const destP = path.join(dest, item);
        const stat = fs.statSync(srcP);
        if (stat.isDirectory()) {
          fs.mkdirSync(destP);
          copyBackup(srcP, destP);
        } else {
          fs.copyFileSync(srcP, destP);
        }
      });
    }

    try {
      copyBackup(SRC_DIR, backupFolder);
      const readmePath = path.join(backupFolder, 'RESTORE_INSTRUCTIONS.txt');
      const instructions = `Flow Backup - Version ${currentVersion}\n========================================\n\nHow to restore this version:\n1. Delete or rename the active 'flow-source' directory.\n2. Copy this folder ('flow-source-backup-v${currentVersion}') to the parent folder.\n3. Rename it back to 'flow-source'.`;
      fs.writeFileSync(readmePath, instructions, 'utf8');
      console.log('Backup created successfully.');

      // Update version in manifest
      manifest.version = nextVersion;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      console.log(`Version successfully updated to {nextVersion} in manifest.json.`);
    } catch (e) {
      console.error('Failed to create backup:', e);
      process.exit(1);
    }
  }
}

// Packages the folder into a ZIP archive
function zipDirectory(sourceDir, outPath, filterFn) {
  const archiver = require('archiver');
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    
    let archive;
    if (archiver.ZipArchive) {
      archive = new archiver.ZipArchive({ zlib: { level: 9 } });
    } else if (typeof archiver === 'function') {
      archive = archiver('zip', { zlib: { level: 9 } });
    } else {
      reject(new Error('Compatible archiver export not found'));
      return;
    }

    output.on('close', () => {
      console.log(`  [Zip] Packaged into ${path.basename(outPath)} (${archive.pointer()} total bytes)`);
      resolve();
    });

    archive.on('error', err => reject(err));
    archive.pipe(output);

    function addFiles(current, targetZipPath = '') {
      const items = fs.readdirSync(current);
      items.forEach(item => {
        const fullPath = path.join(current, item);
        const zipPath = targetZipPath ? `${targetZipPath}/${item}` : item;
        const stat = fs.statSync(fullPath);

        if (filterFn && filterFn(item, stat, zipPath)) return;

        if (stat.isDirectory()) {
          addFiles(fullPath, zipPath);
        } else {
          archive.file(fullPath, { name: zipPath });
        }
      });
    }

    addFiles(sourceDir);
    archive.finalize();
  });
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  const skipPrompt = args.includes('--skip-prompt') || args.includes('-y') || args.includes('--yes');
  const doZip = args.includes('--zip');

  await checkVersionAndBackup(skipPrompt);

  let shouldBuild = skipPrompt;
  if (!skipPrompt) {
    const ans = await askQuestion('Would you like to compile/build the Chrome (dist), Edge, and Firefox folders now? (y/n) [n]: ');
    if (ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes') {
      shouldBuild = true;
    }
  }

  if (shouldBuild) {
    buildTarget('flow-dist', false);
    buildTarget('flow-edge', false);
    buildTarget('flow-firefox', true);

    // Clean up old archives in parent directory
    const parentFiles = fs.readdirSync(PARENT_DIR);
    parentFiles.forEach(item => {
      if (item.endsWith('.zip') && (item.startsWith('flow-dist-v') || item.startsWith('flow-edge-v') || item.startsWith('flow-firefox-v') || item.startsWith('flow-source-v'))) {
        try {
          fs.unlinkSync(path.join(PARENT_DIR, item));
          console.log(`  [Cleanup] Removed old archive: ${item}`);
        } catch (e) {}
      }
    });

    // Get current version
    let version = '10.0.0';
    try {
      version = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'manifest.json'), 'utf8')).version || '10.0.0';
    } catch (e) {}

    if (doZip) {
      // Ensure archiver is installed
      try {
        require('archiver');
      } catch (e) {
        console.log('  [Notice] "archiver" package is required for zip compilation. Installing it now...');
        try {
          execSync('npm install archiver --save-dev', { stdio: 'inherit', cwd: SRC_DIR });
        } catch (installErr) {
          console.error('  [Error] Failed to install archiver automatically. Run "npm install archiver --save-dev" manually.');
          process.exit(1);
        }
      }

      console.log('='.repeat(60));
      console.log('  Packaging Zip Archives for Store Uploads');
      console.log('='.repeat(60));

      const zipTargets = ['flow-dist', 'flow-edge', 'flow-firefox'];
      for (const t of zipTargets) {
        const dirPath = path.join(PARENT_DIR, t);
        const zipPath = path.join(PARENT_DIR, `${t}-v${version}.zip`);
        // Filter out instruction files when zipping
        await zipDirectory(dirPath, zipPath, (item) => item === 'RESTORE_INSTRUCTIONS.txt');
      }

      // Zip the source files
      const sourceZipPath = path.join(PARENT_DIR, `flow-source-v${version}.zip`);
      await zipDirectory(SRC_DIR, sourceZipPath, (item, stat, zipPath) => {
        // Skip unnecessary system/dev folders in source package, but keep build.js and package.json for reviewers
        const skipSet = new Set(SKIP);
        skipSet.delete('build.js');
        skipSet.delete('package.json');
        
        if (skipSet.has(item) || item === 'backup' || item === '.agents' || item === '.github') return true;
        if (item.startsWith('flow_preview') && item.endsWith('.jpg')) return true;
        if (item === 'package-lock.json' || item === 'project_rules.md' || item === 'design.md') return true;
        return false;
      });

      console.log('='.repeat(60) + '\n');
    } else {
      console.log('  [Build] Skipping zip packaging (run with "--zip" flag to generate store upload files).');
    }
  } else {
    console.log("Skipping distribution builds. Your source code changes are saved in 'flow-source'.");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
