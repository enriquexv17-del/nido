import { expect, test } from "@playwright/test";

/**
 * Reparto: al cambiar de «Según sueldo» a «Partes iguales» se vuelve a calcular
 * con el motor real (no solo se cambia una etiqueta). Con los datos de ejemplo
 * los totales por sueldo son 146.48 / 201.41 / 183.61 y en partes iguales
 * 177.19 / 177.16 / 177.15, sumando siempre 531.50.
 */
test("cambiar el reparto recuenta con el cálculo real", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");

  await page.goto("/#/reparto");
  await page.waitForTimeout(900);

  const enrique = page.locator(".reparto-card").first();
  await expect(enrique).toContainText("27.6% del total");
  await expect(enrique).toContainText("$146.48");

  await page.getByRole("tab", { name: "Partes iguales" }).click();
  await page.waitForTimeout(900);

  await expect(enrique).toContainText("33.3% del total");
  await expect(enrique).toContainText("$177.19");
  await expect(page.locator(".reparto-total")).toContainText("$531.50");

  // El detalle usa el mismo modo elegido.
  await page.locator(".reparto-card.is-active").click();
  await expect(page).toHaveURL(/#\/reparto\/detalle/);
  await expect(page.locator(".jade-card")).toContainText("$177.19");
});