const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WATERMARK_PATH = path.resolve(__dirname, '..', 'public', 'primecrest-watermark.svg');
const TARGET_DIRS = [path.resolve(__dirname, '..', 'public'), path.resolve(__dirname, '..', 'out', 'assets')];
const OUT_SUFFIX = '-watermarked';
const SUPPORTED = ['.png', '.jpg', '.jpeg', '.webp'];

async function fileExists(p) {
  try { await fs.promises.access(p); return true; } catch { return false; }
}

async function processFile(inputPath) {
  try {
    const ext = path.extname(inputPath).toLowerCase();
    if (!SUPPORTED.includes(ext)) return null;

    const dir = path.dirname(inputPath);
    const base = path.basename(inputPath, ext);
    // Skip files that already have been watermarked to avoid repeated suffixes
    if (base.endsWith(OUT_SUFFIX)) return { input: inputPath, skippedAlready: true };
    const outName = `${base}${OUT_SUFFIX}${ext}`;
    const outPath = path.join(dir, outName);

    // Skip if output exists and is newer
    try {
      const [inStat, outStat] = await Promise.all([fs.promises.stat(inputPath), fs.promises.stat(outPath).catch(() => null)]);
      if (outStat && outStat.mtimeMs >= inStat.mtimeMs) return { input: inputPath, output: outPath, skipped: true };
    } catch (e) {}

    const watermarkExists = await fileExists(WATERMARK_PATH);
    if (!watermarkExists) {
      console.warn('Watermark file not found at', WATERMARK_PATH);
      return null;
    }

    const img = sharp(inputPath);
    const meta = await img.metadata();
    const imgWidth = meta.width || 800;
    const imgHeight = meta.height || 600;
    // Skip very small images (favicons, tiny icons) to avoid composition errors
    if ((imgWidth || 0) < 24 || (imgHeight || 0) < 24) {
      return { input: inputPath, skippedTiny: true };
    }
    const maxDim = Math.min(imgWidth, imgHeight);
    // Base logo width on image size, but keep it reasonable and never larger than half the image width
    let logoWidth = Math.max(24, Math.round(Math.min(maxDim, 300) * 0.16));
    const maxAllowed = Math.max(8, Math.floor((imgWidth || 48) * 0.5));
    if (logoWidth > maxAllowed) logoWidth = maxAllowed;

    const watermarkBuffer = await fs.promises.readFile(WATERMARK_PATH);
    // Render watermark SVG to PNG buffer with desired width
    let watermarkPng = await sharp(watermarkBuffer)
      .resize({ width: logoWidth, withoutEnlargement: true })
      .png()
      .toBuffer();

    // Ensure watermark is not larger than the target image (some SVGs render larger)
    const wmMeta = await sharp(watermarkPng).metadata();
    if ((wmMeta.width || 0) > (imgWidth || 0) || (wmMeta.height || 0) > (imgHeight || 0)) {
      const safeWidth = Math.max(8, Math.floor((imgWidth || 32) * 0.25));
      watermarkPng = await sharp(watermarkPng)
        .resize({ width: safeWidth, withoutEnlargement: true })
        .png()
        .toBuffer();
    }

    const composed = await img
      .composite([{ input: watermarkPng, gravity: 'southeast', blend: 'over' }])
      .toBuffer();

    await fs.promises.writeFile(outPath, composed);
    return { input: inputPath, output: outPath, skipped: false };
  } catch (err) {
    return { input: inputPath, error: String(err) };
  }
}

async function walkAndProcess(dir) {
  const results = [];
  async function walk(d) {
    const entries = await fs.promises.readdir(d, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (['node_modules', '.git'].includes(ent.name)) continue;
        await walk(full);
      } else {
        const ext = path.extname(ent.name).toLowerCase();
        if (SUPPORTED.includes(ext)) {
          const res = await processFile(full);
          if (res) results.push(res);
        }
      }
    }
  }
  try { await walk(dir); } catch (e) { console.error('Failed scanning', dir, e); }
  return results;
}

(async () => {
  const all = [];
  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) continue;
    console.log('Scanning', dir);
    const r = await walkAndProcess(dir);
    all.push(...r);
  }

  const processed = all.filter(x => x && !x.error && !x.skipped);
  const skipped = all.filter(x => x && x.skipped);
  const errored = all.filter(x => x && x.error);

  console.log('\nWatermarking complete.');
  console.log('Processed:', processed.length);
  console.log('Skipped (up-to-date):', skipped.length);
  console.log('Errors:', errored.length);
  if (processed.length > 0) processed.slice(0,5).forEach(p => console.log('W:', p.output));
  if (errored.length > 0) console.error('Errors sample:', errored.slice(0,5));
})();
