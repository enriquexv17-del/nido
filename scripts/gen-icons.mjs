import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const icons = join(pub, "icons");

const INNER = `
  <path d="M11 30Q32 6 53 30" fill="none" stroke="#F5B83D" stroke-width="5" stroke-linecap="round"/>
  <circle cx="19" cy="43" r="5.5" fill="#6F7DF0"/>
  <circle cx="32" cy="43" r="5.5" fill="#14B38B"/>
  <circle cx="45" cy="43" r="5.5" fill="#F2994A"/>`;

const logoSvg = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">` +
  `<rect width="64" height="64" rx="18" fill="#18205F"/>${INNER}</svg>`;

const maskableSvg = (size) => {
  const scale = (size * 0.6) / 64;
  const offset = (size - 64 * scale) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" fill="#18205F"/>` +
    `<g transform="translate(${offset},${offset}) scale(${scale})">${INNER}</g></svg>`
  );
};

async function png(svg, out, size) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(out);
  console.log("wrote", out);
}

await mkdir(icons, { recursive: true });

await writeFile(join(pub, "favicon.svg"), logoSvg(64), "utf8");
console.log("wrote favicon.svg");

await png(logoSvg(192), join(icons, "pwa-192x192.png"), 192);
await png(logoSvg(512), join(icons, "pwa-512x512.png"), 512);
await png(maskableSvg(512), join(icons, "maskable-512x512.png"), 512);
await png(logoSvg(180), join(pub, "apple-touch-icon.png"), 180);
