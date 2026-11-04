import { expect, test } from "@playwright/test";

const ROUTES = [
  "/bienvenida",
  "/entrar",
  "/hogar",
  "/invitar",
  "/unirme",
  "/inicio",
  "/ingresos",
  "/gastos",
  "/reparto",
  "/reparto/detalle",
  "/mas",
  "/mas/integrantes",
  "/mas/descuentos",
  "/mas/apariencia",
  "/mas/otros-ingresos",
  "/mas/ahorros",
  "/mas/actualizaciones"
];

test("sin errores ni avisos en consola", async ({ page }) => {
  const problems: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      problems.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));

  for (const route of ROUTES) {
    await page.goto(`/#${route}`);
    await page.waitForTimeout(300);
  }

  expect(problems).toEqual([]);
});
