// Requires: sharp, png-to-ico
// Usage: node scripts/generate-favicons.js
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const src = path.join(root, 'src', 'assets', 'logo-gridticks.png');
const outDir = path.join(root, 'public');
if (!fs.existsSync(src)) {
  console.error('Source logo not found:', src);
  process.exit(1);
}
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
  try {
    // Generate 32x32 and 16x16 PNGs
    await sharp(src).resize(32, 32).toFile(path.join(outDir, 'favicon-32x32.png'));
    await sharp(src).resize(16, 16).toFile(path.join(outDir, 'favicon-16x16.png'));
    // Generate apple-touch
    await sharp(src).resize(180, 180).toFile(path.join(outDir, 'apple-touch-icon.png'));
    // Generate favicon.ico from 32x32 and 16x16
    const png32 = await fs.promises.readFile(path.join(outDir, 'favicon-32x32.png'));
    const png16 = await fs.promises.readFile(path.join(outDir, 'favicon-16x16.png'));
    const icoBuf = await pngToIco([png32, png16]);
    await fs.promises.writeFile(path.join(outDir, 'favicon.ico'), icoBuf);
    console.log('Favicons generated in', outDir);
  } catch (err) {
    console.error('Error generating favicons', err);
    process.exit(1);
  }
})();
