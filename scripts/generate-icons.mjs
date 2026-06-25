// One-off: rasterize public/icon.svg into 512 and 192 PNGs (any/maskable).
// Uses sharp (already a transitive dependency in this project). Run: node scripts/generate-icons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SVG = path.join(ROOT, 'public/icon.svg');

async function main() {
  const svgBuf = fs.readFileSync(SVG);
  const sizes = [512, 192];
  for (const size of sizes) {
    const out = path.join(ROOT, `public/icon-${size}.png`);
    await sharp(svgBuf, { density: 384 })
      .resize(size, size, { fit: 'contain' })
      .png()
      .toFile(out);
    console.log(`wrote ${out} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
