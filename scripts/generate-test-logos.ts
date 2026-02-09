import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const LOGOS_DIR = join(import.meta.dir, "../static/logos");
const INVERTED_DIR = join(import.meta.dir, "../static/logos-inverted");
const JPG_DIR = join(import.meta.dir, "../static/logos-jpg");

mkdirSync(INVERTED_DIR, { recursive: true });
mkdirSync(JPG_DIR, { recursive: true });

const svgFiles = readdirSync(LOGOS_DIR).filter((f) => f.endsWith(".svg"));

console.log(`Processing ${svgFiles.length} SVGs…\n`);

let invertedCount = 0;
let jpgCount = 0;

for (const file of svgFiles) {
  const src = readFileSync(join(LOGOS_DIR, file), "utf-8");

  // --- Inverted SVG: light content, still transparent ---
  const inverted = src.replaceAll('fill="#0B0B0B"', 'fill="#F4F4F4"');
  writeFileSync(join(INVERTED_DIR, file), inverted);
  invertedCount++;

  // --- JPG: rasterize SVG onto opaque white background ---
  const svgBuf = Buffer.from(src);
  try {
    const img = await loadImage(svgBuf);
    const scale = Math.min(1, 400 / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const jpgBuf = canvas.toBuffer("image/jpeg");
    writeFileSync(join(JPG_DIR, file.replace(/\.svg$/, ".jpg")), jpgBuf);
    jpgCount++;
  } catch (e) {
    console.warn(`  ⚠ Failed to rasterize ${file}: ${e}`);
  }
}

console.log(`✓ ${invertedCount} inverted SVGs → static/logos-inverted/`);
console.log(`✓ ${jpgCount} JPGs → static/logos-jpg/`);
