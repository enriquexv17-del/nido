/**
 * Compila el APK (o AAB) de Android de forma multiplataforma.
 *
 *   node scripts/android-build.mjs assembleDebug    -> APK de depuración
 *   node scripts/android-build.mjs assembleRelease  -> APK de release (firmado)
 *   node scripts/android-build.mjs bundleRelease    -> AAB para la tienda
 *   --no-build  omite recompilar la web (útil si ya se hizo `cap sync`)
 *
 * Requiere el Android SDK (`ANDROID_HOME`) y Java 21. Si no están, este script
 * no puede correr; el APK lo produce GitHub Actions (`.github/workflows/release.yml`).
 * El resultado se copia a `dist-native/` (ignorado por git).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const task = process.argv[2] ?? "assembleDebug";
const skipBuild = process.argv.includes("--no-build");

function run(command, args, cwd = root) {
  const res = spawnSync(command, args, { stdio: "inherit", shell: true, cwd });
  if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
}

if (!skipBuild) run("npm", ["run", "build:android"]);
run("node", ["scripts/android-version.mjs"]);
run("npx", ["cap", "sync", "android"]);

const wrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
run(wrapper, [task], join(root, "android"));

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const outputs = {
  assembleDebug: [
    "app/build/outputs/apk/debug/app-debug.apk",
    `Nido-${version}-debug.apk`
  ],
  assembleRelease: [
    "app/build/outputs/apk/release/app-release.apk",
    `Nido-${version}.apk`
  ],
  bundleRelease: [
    "app/build/outputs/bundle/release/app-release.aab",
    `Nido-${version}.aab`
  ]
};
const [relative, name] = outputs[task] ?? outputs.assembleDebug;
const outDir = join(root, "dist-native");
mkdirSync(outDir, { recursive: true });
copyFileSync(join(root, "android", relative), join(outDir, name));
console.log(`\n[android] ${task} -> dist-native/${name}`);
