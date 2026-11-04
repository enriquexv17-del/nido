/**
 * Compila el instalador de Windows (Tauri 2) y reúne los artefactos.
 *
 *   node scripts/tauri-build.mjs            -> instalador + firma + latest.json
 *   node scripts/tauri-build.mjs --debug    -> compilación de depuración
 *
 * Pasos:
 *   1. `build:desktop` deja la web en `dist/` con rutas relativas.
 *   2. `tauri build` genera el NSIS (.exe) y el MSI en `src-tauri/target`.
 *   3. Los instaladores, sus firmas `.sig` y `latest.json` se copian a
 *      `dist-native/` (ignorado por git).
 *
 * La clave PRIVADA de firma del actualizador se lee de variables de entorno o,
 * en local, de `C:\Users\mario\nido-secrets`. Nunca se imprime.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const debug = process.argv.includes("--debug");
const outDir = join(root, "dist-native");
const secretsDir = "C:\\Users\\mario\\nido-secrets";

function run(command, args, env = process.env) {
  const res = spawnSync(command, args, { stdio: "inherit", shell: true, cwd: root, env });
  if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
}

/* 1) Claves de firma del actualizador (nunca se imprimen). */
const env = { ...process.env };
if (!env.TAURI_SIGNING_PRIVATE_KEY) {
  const keyFile = join(secretsDir, "nido-updater.key");
  const passFile = join(secretsDir, "updater-password.txt");
  if (existsSync(keyFile) && existsSync(passFile)) {
    env.TAURI_SIGNING_PRIVATE_KEY = keyFile;
    env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = readFileSync(passFile, "utf8").trim();
    console.log("[tauri] firma del actualizador: clave local de nido-secrets");
  } else {
    console.warn(
      "[tauri] sin clave de firma: se compila el instalador, pero SIN artefactos de actualización"
    );
  }
}

/* 2) Compilar. */
// Si no hay clave de firma, el actualizador no puede generar artefactos: se
// compila igual el instalador desactivando `createUpdaterArtifacts`.
const noUpdater = !env.TAURI_SIGNING_PRIVATE_KEY;
const configArg = noUpdater
  ? ["--config", JSON.stringify({ bundle: { createUpdaterArtifacts: false } })]
  : [];
run("npm", ["run", "build:desktop"], env);
run("npx", ["tauri", "build", ...(debug ? ["--debug"] : []), ...configArg], env);

/* 3) Reunir los artefactos. */
const profile = debug ? "debug" : "release";
const bundleDir = join(root, "src-tauri", "target", profile, "bundle");
if (!existsSync(bundleDir)) {
  console.error(`[tauri] no se encontró ${bundleDir}`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

function firstMatch(dir, test) {
  if (!existsSync(dir)) return null;
  const hit = readdirSync(dir).find(test);
  return hit ? join(dir, hit) : null;
}

function copy(origin, name) {
  if (!origin) return null;
  const target = join(outDir, name);
  copyFileSync(origin, target);
  console.log(`[tauri] ${name}`);
  return target;
}

const nsis = firstMatch(join(bundleDir, "nsis"), (f) => f.endsWith("-setup.exe"));
const msi = firstMatch(join(bundleDir, "msi"), (f) => f.endsWith(".msi"));

copy(nsis, "Nido-setup.exe");
copy(nsis ? `${nsis}.sig` : null, "Nido-setup.exe.sig");
copy(msi, "Nido.msi");
copy(msi ? `${msi}.sig` : null, "Nido.msi.sig");

if (!nsis && !msi) {
  console.error("[tauri] no se generó ningún instalador");
  process.exit(1);
}

/* 4) latest.json (lo lee el actualizador). */
run("node", ["scripts/make-latest-json.mjs"], env);

console.log("\n[tauri] listo. Artefactos en dist-native/");
