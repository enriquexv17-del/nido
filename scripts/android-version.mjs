/**
 * Sincroniza la versión de `package.json` con Android.
 *
 * Escribe `android/version.properties` (ignorado por git) con:
 *   versionName = la versión exacta de package.json (p. ej. 1.0.0)
 *   versionCode = major*10000 + minor*100 + patch  (debe subir en cada release)
 *
 * Uso: `npm run android:version` (lo llaman los scripts de compilación).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const version = String(pkg.version ?? "1.0.0");
const [major = 0, minor = 0, patch = 0] = version
  .split(".")
  .map((n) => Number.parseInt(n, 10) || 0);
const versionCode = major * 10000 + minor * 100 + patch;

const out = join(root, "android", "version.properties");
writeFileSync(out, `versionCode=${versionCode}\nversionName=${version}\n`, "utf8");
console.log(`[android] versionName=${version} versionCode=${versionCode}`);
