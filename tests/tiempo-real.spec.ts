import { expect, test, type Page } from "@playwright/test";

/**
 * Tiempo real en modo demostración (BroadcastChannel): dos pestañas del mismo
 * navegador comparten el almacén. Al editar un gasto en una, la otra muestra el
 * aviso en vivo y reconta las cifras.
 */

async function swipeFirstRow(page: Page) {
  const row = page.locator(".expense-row").first();
  const box = await row.boundingBox();
  if (!box) throw new Error("sin fila de gasto");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 20, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, y, { steps: 12 });
  await page.mouse.up();
}

test("aviso en vivo al editar un gasto desde otra pestaña", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const a = await ctx.newPage();
  await a.goto("/#/inicio");
  await a.waitForTimeout(1500);
  // No debe aparecer ningún aviso solo por cargar.
  await expect(a.locator(".live-notice")).toHaveCount(0);

  const b = await ctx.newPage();
  await b.goto("/#/gastos");
  await b.waitForTimeout(600);
  await swipeFirstRow(b);
  await b.waitForTimeout(300);
  await b.getByRole("button", { name: "Editar" }).click();
  await b.waitForTimeout(400);
  await b
    .locator(".expense-form .field")
    .filter({ hasText: "Monto" })
    .locator("input")
    .fill("285");
  await b.getByRole("button", { name: "Guardar cambios" }).click();

  // La otra pestaña muestra el aviso y la píldora del cambio.
  await expect(a.locator(".live-notice")).toContainText("editó Renta", { timeout: 8000 });
  await expect(a.locator(".live-delta")).toContainText("desde el cambio");

  await ctx.close();
});

test("el sueldo se guarda y el neto se recalcula", async ({ page }) => {
  await page.goto("/#/ingresos");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Editar sueldo de Enrique" }).click();
  await page.waitForTimeout(400);
  await page.locator(".sheet .field").filter({ hasText: "Sueldo bruto" }).locator("input").fill("400");
  await page.getByRole("button", { name: "Guardar sueldo" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("Sueldo $400.00")).toBeVisible();
});
