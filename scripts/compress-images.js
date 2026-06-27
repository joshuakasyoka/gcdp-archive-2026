#!/usr/bin/env node
/**
 * Compress ProjectPhotos in-place (2024 – 2026 cohort).
 * Run: npm install --save-dev sharp  then  node scripts/compress-images.js
 *
 * JPEGs → quality 75, max 1200px wide/tall
 * PNGs  → quality 80 (lossy), max 1200px wide/tall
 * Originals are replaced; re-running is safe (already-small files are skipped).
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PHOTO_DIR = path.join(__dirname, '..', 'public', 'ProjectPhotos');
const MAX_PX = 1200;
const JPEG_QUALITY = 75;
const PNG_QUALITY = 80;
const SKIP_BELOW_KB = 300; // skip files already under this size

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return;

  const stat = fs.statSync(filePath);
  const sizeKB = stat.size / 1024;
  if (sizeKB < SKIP_BELOW_KB) {
    console.log(`  skip  ${path.relative(PHOTO_DIR, filePath)} (${Math.round(sizeKB)}KB)`);
    return;
  }

  const tmp = filePath + '.tmp';
  try {
    const img = sharp(filePath).rotate(); // auto-rotate from EXIF
    const meta = await img.metadata();
    const needsResize = meta.width > MAX_PX || meta.height > MAX_PX;

    let pipeline = needsResize
      ? img.resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
      : img;

    if (ext === '.png') {
      await pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 }).toFile(tmp);
    } else {
      await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmp);
    }

    const newSizeKB = fs.statSync(tmp).size / 1024;
    fs.renameSync(tmp, filePath);
    console.log(
      `  done  ${path.relative(PHOTO_DIR, filePath)}  ${Math.round(sizeKB)}KB → ${Math.round(newSizeKB)}KB`
    );
  } catch (err) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    console.error(`  error ${filePath}: ${err.message}`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

(async () => {
  const files = walk(PHOTO_DIR);
  console.log(`Found ${files.length} files in ${PHOTO_DIR}`);
  for (const f of files) {
    await processFile(f);
  }
  console.log('Done.');
})();
