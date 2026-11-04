/**
 * Genera `build/icon.ico` (multi-resolución) para el instalador de Windows,
 * a partir del logo oficial de Nido. NSIS no acepta PNG como ícono: necesita un
 * `.ico` real.
 *
 * Uso: `npm run native:icon`
 */
import pngToIco from "png-to-ico";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANIL = "#18205F";
const INNER = `
  <path d="M11 30Q32 6 53 30" fill="none" stroke="#F5B83D" stroke-width="5" stroke-linecap="round"/>
  <circle cx="19" cy="43" r="5.5" fill="#6F7DF0"/>
  <circle cx="32" cy="43" r="5.5" fill="#14B38B"/>
  <circle cx="45" cy="43" r="5.5" fill="#F2994A"/>`;

function roundedIcon(size) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="16" fill="${ANIL}"/>${INNER}</svg>`
  );
}

const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  sizes.map((s) =>
    sharp(Buffer.from(roundedIcon(s)), { density: 384 }).resize(s, s).png().toBuffer()
  )
);
const ico = await pngToIco(pngs);

await mkdir(join(root, "build"), { recursive: true });
await writeFile(join(root, "build", "icon.ico"), ico);
console.log(`Listo: build/icon.ico (${sizes.join(", ")} px).`);
