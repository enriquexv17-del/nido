import { test } from "@playwright/test";

const ROUTES: [string, string][] = [
  ["01-bienvenida", "/bienvenida"],
  ["02-entrar", "/entrar"],
  ["03-hogar", "/hogar"],
  ["04-invitar", "/invitar"],
  ["05-unirme", "/unirme"],
  ["06-inicio", "/inicio"],
  ["07-ingresos", "/ingresos"],
  ["08-gastos", "/gastos"],
  ["09-reparto", "/reparto"],
  ["10-reparto-detalle", "/reparto/detalle"],
  ["11-mas", "/mas"],
  ["12-integrantes", "/mas/integrantes"],
  ["13-descuentos", "/mas/descuentos"],
  ["14-apariencia", "/mas/apariencia"],
  ["15-otros-ingresos", "/mas/otros-ingresos"],
  ["16-ahorros", "/mas/ahorros"],
  ["17-actualizaciones", "/mas/actualizaciones"]
];

/** Capturas finales de la Fase 4 (modo claro) en móvil y PC. */
test("capturas de todas las rutas (Fase 4, claro)", async ({ page }, testInfo) => {
  const dir = `capturas-fase4/${testInfo.project.name}/claro`;
  for (const [name, route] of ROUTES) {
    await page.goto(`/#${route}`);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  }
});

/** Capturas en modo oscuro (móvil). */
test("capturas de todas las rutas (Fase 4, oscuro)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "basta con un proyecto");
  await page.addInitScript(() => {
    localStorage.setItem("nido.theme.mode", "dark");
    localStorage.setItem("nido.theme.accent", "indigo");
  });
  const dir = "capturas-fase4/movil/oscuro";
  for (const [name, route] of ROUTES) {
    await page.goto(`/#${route}`);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  }
});

/** Las seis muestras de acento, en claro y en oscuro. */
test("capturas de los seis acentos", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "basta con un proyecto");

  const accents = ["indigo", "green", "pink", "orange", "teal", "purple"];
  for (const theme of ["light", "dark"] as const) {
    for (const accent of accents) {
      await page.addInitScript(
        ([t, a]) => {
          localStorage.setItem("nido.theme.mode", t);
          localStorage.setItem("nido.theme.accent", a);
        },
        [theme, accent]
      );
      await page.goto("/#/mas/apariencia");
      await page.waitForTimeout(700);
      await page.screenshot({
        path: `capturas-fase4/movil/acentos/${theme}-${accent}.png`,
        fullPage: true
      });
    }
  }
});