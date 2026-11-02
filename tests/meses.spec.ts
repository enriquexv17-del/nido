import { expect, test } from "@playwright/test";

/**
 * Navegación de meses + «Copiar de <mes anterior>». Los datos de ejemplo traen
 * noviembre, octubre y septiembre; la fila de meses es fija (del más viejo al
 * más nuevo) y elegir uno no reordena los demás.
 */
test("los meses navegan y se copia el mes anterior", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");

  await page.goto("/#/ingresos");
  await page.waitForTimeout(900);

  const chips = page.locator(".chip-row .chip");
  await expect(chips).toHaveText(["Sep", "Oct", "Nov"]);
  await expect(page.locator(".chip-row .chip.is-active")).toHaveText("Nov");
  await expect(page.locator(".copy-october")).toHaveText("Copiar de octubre");
  await expect(page.locator(".screen-month")).toHaveText("Noviembre 2026");

  // Jefferson gana $450 en noviembre y $400 en octubre.
  const jefferson = page.locator(".income-card").nth(2);
  await expect(jefferson).toContainText("$450.00");

  await page.getByRole("button", { name: "Oct", exact: true }).click();
  await page.waitForTimeout(700);
  await expect(page.locator(".screen-month")).toHaveText("Octubre 2026");
  await expect(jefferson).toContainText("$400.00");
  // La fila de meses sigue mostrando los mismos tres meses.
  await expect(chips).toHaveText(["Sep", "Oct", "Nov"]);
  await expect(page.locator(".copy-october")).toHaveText("Copiar de septiembre");

  // Volver a noviembre y copiar los sueldos de octubre.
  await page.getByRole("button", { name: "Nov", exact: true }).click();
  await page.waitForTimeout(700);
  await page.locator(".copy-october").click();
  await page.waitForTimeout(700);

  await expect(page.locator(".toast")).toContainText("Sueldos copiados de octubre");
  await expect(jefferson).toContainText("$400.00");
});

/** Con la red caída, la app vuelve a abrir con los datos guardados en local. */
test("sin conexión la app reabre con los últimos datos", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");

  await page.goto("/#/inicio");
  await page.waitForTimeout(1500);
  // Segunda visita: el service worker ya controla la página.
  await page.reload();
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const before = await page.locator(".hero-amount").innerText();

  await context.setOffline(true);
  await page.reload();
  await page.waitForTimeout(1500);

  await expect(page.locator(".offline-banner")).toBeVisible();
  await expect(page.locator(".hero-amount")).toHaveText(before);

  // Editar sin conexión también funciona (el almacén de prueba es local).
  await page.goto("/#/ingresos");
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Editar sueldo de Jefferson" }).click();
  await page.waitForTimeout(500);
  await page.locator(".sheet input").first().fill("500");
  await page.getByRole("button", { name: "Guardar sueldo" }).click();
  await page.waitForTimeout(700);
  await expect(page.locator(".income-card").nth(2)).toContainText("$500.00");

  await context.setOffline(false);
});
