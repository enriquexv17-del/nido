import { expect, test, type Page } from "@playwright/test";

function field(page: Page, label: string) {
  return page.locator(".field").filter({ hasText: label }).locator("input");
}

/** Desliza una fila de gasto hacia la izquierda para revelar sus acciones. */
async function swipeRow(page: Page, name: string) {
  const row = page.locator(".expense-row").filter({ hasText: name });
  await row.scrollIntoViewIfNeeded();
  const box = await row.boundingBox();
  if (!box) throw new Error("sin fila");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 20, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, y, { steps: 12 });
  await page.mouse.up();
}

/**
 * Flujo completo de gastos: crear, ver el total actualizado, sobrevivir a una
 * recarga (guardado local), editar y eliminar. El total (531.50) es la suma de
 * los gastos de ejemplo; se mueve con cada operación.
 */
test("flujo de gastos: crear, recargar, editar y eliminar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");

  await page.goto("/#/gastos");
  await page.waitForTimeout(800);
  await expect(page.locator(".dark-card-value")).toHaveText("$531.50");

  // Crear
  await page.getByRole("button", { name: "Nuevo gasto" }).click();
  await page.waitForTimeout(400);
  await field(page, "Nombre").fill("Mascota");
  await page.getByRole("tab", { name: "Mensual" }).click();
  await field(page, "Monto").fill("50");
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await page.waitForTimeout(700);
  await expect(page.getByText("Mascota")).toBeVisible();
  await expect(page.locator(".dark-card-value")).toHaveText("$581.50");

  // Persistencia local: sobrevive a una recarga.
  await page.reload();
  await page.waitForTimeout(900);
  await expect(page.getByText("Mascota")).toBeVisible();

  // Editar el monto (50 → 60).
  await swipeRow(page, "Mascota");
  await page.waitForTimeout(400);
  await page.locator(".expense-row").filter({ hasText: "Mascota" })
    .getByRole("button", { name: "Editar" })
    .click();
  await page.waitForTimeout(400);
  await field(page, "Monto").fill("60");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForTimeout(700);
  await expect(page.locator(".dark-card-value")).toHaveText("$591.50");

  // Eliminar y volver al total original.
  await swipeRow(page, "Mascota");
  await page.waitForTimeout(400);
  await page.locator(".expense-row").filter({ hasText: "Mascota" })
    .getByRole("button", { name: "Eliminar" })
    .click();
  await page.waitForTimeout(400);
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await page.waitForTimeout(700);
  await expect(page.getByText("Mascota")).toHaveCount(0);
  await expect(page.locator(".dark-card-value")).toHaveText("$531.50");
});
