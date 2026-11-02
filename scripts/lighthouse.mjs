/**
 * Auditoría Lighthouse móvil de Nido.
 *
 * - Compila la app y la sirve con `vite preview`.
 * - Lanza un Chrome/Edge headless y mide rendimiento, accesibilidad, buenas
 *   prácticas y las señales de PWA (service worker + instalable).
 * - Guarda el informe en `capturas-fase2/lighthouse/`.
 *
 * Uso: `npm run lighthouse` (requiere haber instalado las dependencias).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const PORT = 4174;
const URL = `http://localhost:${PORT}/`;
const OUT_DIR = "capturas-fase2/lighthouse";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
].filter(Boolean);

function run(command, extra = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, extra, { stdio: "inherit", shell: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} → código ${code}`))));
  });
}

async function waitForServer(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(URL);
      if (res.ok) return;
    } catch {
      /* aún no responde */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("el servidor de vista previa no respondió");
}

async function main() {
  console.log("· Compilando…");
  await run("npm", ["run", "build"]);

  console.log("· Sirviendo la app…");
  const server = spawn("npm", ["run", "preview", "--", "--port", String(PORT), "--strictPort"], {
    stdio: "ignore",
    shell: true
  });

  let chrome;
  try {
    await waitForServer();

    const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
    chrome = await launch({
      chromePath,
      chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"]
    });

    console.log("· Midiendo (móvil)…");
    const result = await lighthouse(URL, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      formFactor: "mobile",
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 3, disabled: false }
    });

    const { lhr } = result;
    const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
    const issues = (id) =>
      (lhr.categories[id]?.auditRefs ?? [])
        .filter((ref) => {
          const a = lhr.audits[ref.id];
          return a && a.score !== null && a.score < 1;
        })
        .map((ref) => `${ref.id}${ref.weight > 0 ? "" : " (info)"}`);

    const report = {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      fail: {
        performance: issues("performance"),
        accessibility: issues("accessibility"),
        bestPractices: issues("best-practices")
      },
      metrics: {
        lcp: lhr.audits["largest-contentful-paint"]?.displayValue,
        cls: lhr.audits["cumulative-layout-shift"]?.displayValue,
        tbt: lhr.audits["total-blocking-time"]?.displayValue
      }
    };

    // Lighthouse 13 ya no puntúa la PWA: se revisa a mano el manifiesto y el
    // service worker (el control del service worker lo cubren las pruebas).
    const manifestRes = await fetch(`${URL}manifest.webmanifest`);
    const manifest = manifestRes.ok ? await manifestRes.json() : {};
    const icons = manifest.icons ?? [];
    report.pwa = {
      manifest:
        !!manifest.name &&
        !!manifest.short_name &&
        !!manifest.start_url &&
        manifest.display === "standalone",
      icon192: icons.some((i) => i.sizes === "192x192"),
      icon512: icons.some((i) => i.sizes === "512x512"),
      serviceWorker: (await fetch(`${URL}sw.js`)).ok
    };

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
    writeFileSync(`${OUT_DIR}/report.html`, result.report);

    console.log("\n" + JSON.stringify(report, null, 2));

    const ok =
      report.performance >= 90 &&
      report.accessibility >= 90 &&
      report.bestPractices >= 90 &&
      report.pwa.manifest &&
      report.pwa.icon192 &&
      report.pwa.icon512 &&
      report.pwa.serviceWorker;
    if (!ok) {
      console.error("\n✖ No cumple los mínimos (rendimiento/accesibilidad/buenas prácticas ≥ 90 y PWA instalable).");
      process.exitCode = 1;
    } else {
      console.log("\n✔ Cumple los mínimos.");
    }
  } finally {
    if (chrome) await chrome.kill();
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
