import { test } from "@playwright/test";

const ROUTES: [string, string][] = [
  ["01-bienvenida", "/bienvenida"],
  ["02-cuenta", "/cuenta"],
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
  ["14-actualizaciones", "/mas/actualizaciones"]
];

test("capturas de todas las rutas", async ({ page }, testInfo) => {
  const dir = `capturas/${testInfo.project.name}`;
  for (const [name, route] of ROUTES) {
    await page.goto(`/#${route}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  }
});
