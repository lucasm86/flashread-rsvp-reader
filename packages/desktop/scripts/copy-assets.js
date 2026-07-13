// Copies non-TS renderer assets (HTML/CSS) into dist/, since tsc only
// emits compiled .js. Run after `tsc` as part of the desktop build.
const fs = require("node:fs");
const path = require("node:path");

const SRC_RENDERER = path.join(__dirname, "..", "src", "renderer");
const DIST_RENDERER = path.join(__dirname, "..", "dist", "renderer");

const ASSET_EXTENSIONS = [".html", ".css"];

function copyAssets(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const srcPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      copyAssets(srcPath);
      continue;
    }
    if (!ASSET_EXTENSIONS.includes(path.extname(entry.name))) continue;

    const relative = path.relative(SRC_RENDERER, srcPath);
    const destPath = path.join(DIST_RENDERER, relative);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
  }
}

copyAssets(SRC_RENDERER);
console.log("[copy-assets] renderer HTML/CSS copied to dist/renderer");
