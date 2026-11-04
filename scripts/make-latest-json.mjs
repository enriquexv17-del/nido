/**
 * Escribe `dist-native/latest.json`, el manifiesto que lee el actualizador de
 * Windows (y la comprobación de versión de Android).
 *
 * Formato (el que espera el plugin updater de Tauri):
 *   {
 *     "version": "1.0.0",
 *     "notes": "...",
 *     "pub_date": "2026-01-01T00:00:00.000Z",
 *     "platforms": {
 *       "windows-x86_64": { "signature": "...", "url": ".../Nido-setup.exe" }
 *     }
 *   }
 *
 * La URL sale de `RELEASE_BASE` (p. ej. .../releases/download/v1.0.0) o, por
 * defecto, de la última release (.../releases/latest/download). No imprime
 * ningún secreto: la firma es pública.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "dist-native");
const sigFile = join(outDir, "Nido-setup.exe.sig");
const outFile = join(outDir, "latest.json");

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

if (!existsSync(sigFile)) {
  console.warn(
    "[latest] falta Nido-setup.exe.sig: sin firma no hay actualización automática. Se omite latest.json."
  );
  process.exit(0);
}

const signature = readFileSync(sigFile, "utf8").trim();
const base =
  process.env.RELEASE_BASE ||
  "https://github.com/enriquexv17-del/nido/releases/latest/download";
const setupUrl = `${base}/Nido-setup.exe`;
const apkUrl = `${base}/Nido.apk`;

let notes = process.env.RELEASE_NOTES ?? "";
if (!notes) {
  try {
    const published = JSON.parse(readFileSync(join(root, "public", "version.json"), "utf8"));
    notes = Array.isArray(published.notes) ? published.notes.join("\n") : "";
  } catch {
    notes = "";
  }
}

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature,
      url: setupUrl
    }
  }
};

writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`[latest] latest.json v${version} -> ${outFile}`);
console.log(`[latest] APK publicado en ${apkUrl}`);
