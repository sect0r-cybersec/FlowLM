// One-off: rasterize icon.svg into the PNG + ICO that electron-builder consumes.
// Run from anywhere with: node apps/desktop/build/gen-icons.mjs
// Requires `sharp` and `png-to-ico` (install transiently: npm i -D sharp png-to-ico).
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(dir, 'icon.svg'));

// Linux + electron-builder master icon.
await sharp(svg, { density: 384 }).resize(1024, 1024).png().toFile(join(dir, 'icon.png'));

// Multi-resolution Windows .ico (crisp from 256 down to 16).
const sizes = [256, 128, 64, 48, 32, 16];
const pngs = await Promise.all(
  sizes.map((s) => sharp(svg, { density: 384 }).resize(s, s).png().toBuffer())
);
writeFileSync(join(dir, 'icon.ico'), await pngToIco(pngs));

console.log('Wrote icon.png (1024) and icon.ico (' + sizes.join(',') + ')');
