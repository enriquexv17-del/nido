import { expect, test } from "@playwright/test";

/**
 * Actualizaciones: la versión instalada sale de `package.json` (1.0.0) y se
 * compara con `version.json` (1.1.0). Con una versión nueva, la barra avanza
 * sola y el botón queda listo para instalar.
 */
test("con una versión nueva, descarga y queda lista para instalar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");

  await page.goto("/#/mas/actualizaciones");
  await page.waitForTimeout(600);

  await expect(page.locator(".update-title")).toHaveText("Nido 1.1.0");
  await expect(page.locator(".update-sub")).toHaveText("Nueva versión disponible");
  await expect(page.locator(".update-news")).toContainText("Gastos con ícono propio");
  await expect(page.locator(".info-row").first()).toContainText("1.0.0");
  await expect(page.locator(".btn")).toHaveText("Instalar cuando termine");

  await expect(page.locator(".progress-foot strong")).toHaveText("100%", { timeout: 8000 });
  await expect(page.locator(".btn")).toHaveText("Instalar y reiniciar");
  await expect(page.locator(".progress-foot")).toContainText("Listo para instalar");
});

/** Si la versión publicada es la misma, la pantalla dice que estás al día. */
test("al día: ofrece buscar actualizaciones y muestra la versión", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "pc", "en PC se ve la barra lateral con la versión");

  await page.route("**/version.json", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ version: "1.0.0" }) })
  );

  await page.goto("/#/mas");
  await page.waitForTimeout(700);
  await expect(
    page.locator(".settings-row", { hasText: "Actualizaciones" })
  ).toContainText("Nido 1.0.0 · estás al día");
  await expect(page.locator(".sidebar-version")).toHaveText("Versión 1.0.0");

  await page.goto("/#/mas/actualizaciones");
  await page.waitForTimeout(700);
  await expect(page.locator(".update-sub")).toHaveText("Estás en la última versión");
  await expect(page.locator(".btn")).toHaveText("Buscar actualizaciones");
});
