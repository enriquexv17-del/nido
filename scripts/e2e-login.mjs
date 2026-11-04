/**
 * Captura una sesión de Nido para la prueba de sincronización.
 *
 * Abre una ventana con interfaz, espera a que inicies sesión con Google y
 * guarda el `storageState` (incluye la sesión de Supabase) en el archivo
 * indicado. No imprime tokens.
 *
 *   node scripts/e2e-login.mjs sesion-a.json
 *
 * Requiere el `dist` compilado con Supabase y `npm run preview` en marcha
 * (o define `NIDO_E2E_URL`). Guarda el archivo fuera del repositorio.
 */
import { chromium } from "@playwright/test";

const out = process.argv[2];
if (!out) {
  console.error("Uso: node scripts/e2e-login.mjs <archivo.json>");
  process.exit(1);
}

const base = process.env.NIDO_E2E_URL ?? "http://localhost:4173";

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(base);
console.log(
  "Inicia sesión con Google. Cuando veas la app, pulsa Enter aquí para guardar la sesión."
);
await new Promise((resolve) => process.stdin.once("data", resolve));
await context.storageState({ path: out });
console.log(`Sesión guardada en ${out}`);
await browser.close();