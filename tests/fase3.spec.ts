import { expect, test, type Page } from "@playwright/test";

function field(page: Page, label: string) {
  return page.locator(".field").filter({ hasText: label }).locator("input");
}

/** Las dos secciones nuevas viven dentro de «Más». */
test("las filas nuevas aparecen en Más", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");

  await page.goto("/#/mas");
  await page.waitForTimeout(800);
  // El menú lateral de PC tiene las mismas etiquetas: nos quedamos con la lista de «Más».
  const list = page.locator(".settings-list").first();
  await expect(list.getByText("Otros ingresos", { exact: true })).toBeVisible();
  await expect(list.getByText("Ahorros y metas", { exact: true })).toBeVisible();
});

/**
 * Ingresos extra personales: crear, editar, recargar (persistencia local) y
 * eliminar. El total de ejemplo es $105.00.
 */
test("otros ingresos: crear, editar, recargar y eliminar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");

  await page.goto("/#/mas/otros-ingresos");
  await page.waitForTimeout(900);
  await expect(page.locator(".dark-card-value")).toHaveText("$105.00");

  // Crear (+$60).
  await page.getByRole("button", { name: "Agregar ingreso" }).click();
  await page.waitForTimeout(400);
  await field(page, "Fuente").fill("Prueba marca");
  await field(page, "Qué fue").fill("Pedido de prueba");
  await field(page, "Monto").fill("60");
  await page.getByRole("button", { name: "Guardar ingreso" }).click();
  await page.waitForTimeout(700);
  await expect(page.locator(".dark-card-value")).toHaveText("$165.00");
  await expect(page.getByText("Prueba marca")).toBeVisible();

  // Editar ($60 → $80).
  await page.locator(".extra-main", { hasText: "Prueba marca" }).click();
  await page.waitForTimeout(400);
  await field(page, "Monto").fill("80");
  await page.getByRole("button", { name: "Guardar ingreso" }).click();
  await page.waitForTimeout(700);
  await expect(page.locator(".dark-card-value")).toHaveText("$185.00");

  // Persistencia local.
  await page.reload();
  await page.waitForTimeout(900);
  await expect(page.getByText("Prueba marca")).toBeVisible();
  await expect(page.locator(".dark-card-value")).toHaveText("$185.00");

  // Eliminar → vuelve al total de ejemplo.
  await page.getByRole("button", { name: "Eliminar Prueba marca" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await page.waitForTimeout(700);
  await expect(page.getByText("Prueba marca")).toHaveCount(0);
  await expect(page.locator(".dark-card-value")).toHaveText("$105.00");
});

/**
 * Ahorros: reparto automático de lo que sobra + metas con su «Aparta».
 * Con los datos de ejemplo, disponible = $317.52 y total ahorro = $317.52.
 */
test("ahorros: fondos con montos y meta nueva", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");

  await page.goto("/#/mas/ahorros");
  await page.waitForTimeout(1000);
  await expect(page.locator(".dark-card-value")).toHaveText("$317.52");
  await expect(page.locator(".savings-name")).toHaveCount(3);
  await expect(
    page.locator(".info-row").filter({ hasText: "Total ahorro" }).locator("strong")
  ).toHaveText("$317.52");

  // Crear una meta de $300 y comprobar que calcula cuánto apartar.
  await page.getByRole("button", { name: "Agregar meta" }).click();
  await page.waitForTimeout(400);
  await field(page, "Nombre").fill("Prueba");
  await field(page, "Objetivo").fill("300");
  await page.getByRole("button", { name: "Guardar meta" }).click();
  await page.waitForTimeout(800);

  const card = page.locator(".goal-card", { hasText: "Prueba" });
  await expect(card).toBeVisible();
  await expect(card.locator(".progress-foot")).toContainText("Aparta");

  // Eliminarla.
  await page.getByRole("button", { name: "Eliminar Prueba" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await page.waitForTimeout(700);
  await expect(page.locator(".goal-card", { hasText: "Prueba" })).toHaveCount(0);
});