/**
 * Íconos y pantallas de arranque nativos a partir del logo oficial de Nido
 * (arco maíz + tres puntos sobre fondo índigo `#18205F`).
 *
 * Android: rellena `android/app/src/main/res/` (adaptativos, monocromo y
 * splash en todas las densidades). Electron: deja un PNG base de 1024 en
 * `build/icon.png`, que `electron-builder` convierte al `.ico` del instalador.
 *
 * Uso: `npm run native:assets`
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const res = join(root, "android", "app", "src", "main", "res");

const ANIL = "#18205F";
const INNER = `
  <path d="M11 30Q32 6 53 30" fill="none" stroke="#F5B83D" stroke-width="5" stroke-linecap="round"/>
  <circle cx="19" cy="43" r="5.5" fill="#6F7DF0"/>
  <circle cx="32" cy="43" r="5.5" fill="#14B38B"/>
  <circle cx="45" cy="43" r="5.5" fill="#F2994A"/>`;

/** Logo completo (cuadrado redondeado) a un tamaño dado. */
function roundedIcon(size) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="16" fill="${ANIL}"/>${INNER}</svg>`
  );
}

/** Logo circular (para `ic_launcher_round`). */
function circleIcon(size) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">` +
    `<circle cx="32" cy="32" r="32" fill="${ANIL}"/>${INNER}</svg>`
  );
}

/**
 * Primer plano del ícono adaptativo: fondo transparente y el dibujo dentro de
 * la zona segura (≈66 % central), como pide Android.
 */
function adaptiveForeground(size) {
  const scale = (size * 0.62) / 64;
  const offset = (size - 64 * scale) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<g transform="translate(${offset},${offset}) scale(${scale})">${INNER}</g></svg>`
  );
}

/** Ícono monocromo (Android 13+): silueta blanca sobre transparente. */
function monochrome(size) {
  const scale = (size * 0.55) / 64;
  const offset = (size - 64 * scale) / 2;
  const inner = `
    <path d="M11 30Q32 6 53 30" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
    <circle cx="19" cy="43" r="5.5" fill="#FFFFFF"/>
    <circle cx="32" cy="43" r="5.5" fill="#FFFFFF"/>
    <circle cx="45" cy="43" r="5.5" fill="#FFFFFF"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<g transform="translate(${offset},${offset}) scale(${scale})">${inner}</g></svg>`
  );
}

/** Pantalla de arranque: fondo índigo con el logo centrado. */
function splash(w, h) {
  const size = Math.round(Math.min(w, h) * 0.3);
  const scale = size / 64;
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="${ANIL}"/>` +
    `<g transform="translate(${x},${y}) scale(${scale})">` +
    `<rect width="64" height="64" rx="16" fill="${ANIL}"/>${INNER}</g></svg>`
  );
}

async function png(svg, out, w, h = w) {
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(w, h)
    .png()
    .toFile(out);
}

const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const SPLASH = {
  "drawable-port-mdpi": [320, 480],
  "drawable-port-hdpi": [480, 800],
  "drawable-port-xhdpi": [720, 1280],
  "drawable-port-xxhdpi": [960, 1600],
  "drawable-port-xxxhdpi": [1280, 1920],
  "drawable-land-mdpi": [480, 320],
  "drawable-land-hdpi": [800, 480],
  "drawable-land-xhdpi": [1280, 720],
  "drawable-land-xxhdpi": [1600, 960],
  "drawable-land-xxxhdpi": [1920, 1280]
};

let count = 0;
for (const [density, size] of Object.entries(LAUNCHER)) {
  await png(roundedIcon(size), join(res, `mipmap-${density}`, "ic_launcher.png"), size);
  await png(circleIcon(size), join(res, `mipmap-${density}`, "ic_launcher_round.png"), size);
  count += 2;
}
for (const [density, size] of Object.entries(FOREGROUND)) {
  await png(
    adaptiveForeground(size),
    join(res, `mipmap-${density}`, "ic_launcher_foreground.png"),
    size
  );
  await png(monochrome(size), join(res, `mipmap-${density}`, "ic_launcher_monochrome.png"), size);
  count += 2;
}

// Splash genérico (cae a este si no hay densidad específica).
await png(splash(512, 512), join(res, "drawable", "splash.png"), 512);
count += 1;
for (const [dir, [w, h]] of Object.entries(SPLASH)) {
  await png(splash(w, h), join(res, dir, "splash.png"), w, h);
  count += 1;
}

// Color de fondo del ícono adaptativo.
await writeFile(
  join(res, "values", "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ANIL}</color>\n</resources>\n`,
  "utf8"
);

// PNG base para los íconos de Electron (electron-builder lo usa como `icon`).
await png(roundedIcon(1024), join(root, "build", "icon.png"), 1024);

console.log(`Listo: ${count + 1} recursos nativos generados.`);
