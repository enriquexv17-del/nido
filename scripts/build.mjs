/**
 * Compila la web para cada destino. Reemplaza a `vite build` directo para
 * fijar `VITE_TARGET` y la base de forma multiplataforma (Windows y CI).
 *
 *   node scripts/build.mjs web        -> base /nido/ (sitio publicado)
 *   node scripts/build.mjs web --base ./   -> base relativa (pruebas locales)
 *   node scripts/build.mjs android    -> base ./
 *   node scripts/build.mjs desktop    -> base ./
 *
 * `VITE_BASE` en el entorno manda sobre todo (GitHub Pages la define con el
 * nombre del repo). Nunca se suben secretos: las variables de Supabase las
 * inyecta el entorno (`.env` local o secretos de Actions).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const target = process.argv[2] ?? "web";
const baseIdx = process.argv.indexOf("--base");
const baseFlag = baseIdx !== -1 ? process.argv[baseIdx + 1] : undefined;
const base = process.env.VITE_BASE || baseFlag || (target === "web" ? "/nido/" : "./");

const env = { ...process.env, VITE_TARGET: target, VITE_BASE: base };
console.log(`[build] destino=${target} base=${base}`);

const res = spawnSync("npx", ["vite", "build"], { stdio: "inherit", env, shell: true });
if (res.status !== 0) process.exit(res.status ?? 1);

// GitHub Pages no reescribe rutas profundas: cualquier URL desconocida debe
// servir la app. HashRouter ya evita la mayoría de los 404, pero la copia
// mantiene funcionando enlaces directos sin `#`.
if (target === "web") {
  const index = join("dist", "index.html");
  if (existsSync(index)) {
    copyFileSync(index, join("dist", "404.html"));
    console.log("[build] copiado dist/index.html -> dist/404.html");
  }
}

process.exit(0);
