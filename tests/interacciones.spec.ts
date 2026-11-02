import { expect, test, type Page } from "@playwright/test";

const isDesktop = (name: string) => name === "pc";

/** Revela las acciones de la primera fila: 3 puntos en PC, deslizar en móvil. */
async function revealFirstRowActions(page: Page, desktop: boolean) {
  if (desktop) {
    await page.getByRole("button", { name: "Acciones de Renta" }).click();
    return;
  }
  const row = page.locator(".expense-row").first();
  const box = await row.boundingBox();
  if (!box) throw new Error("sin fila");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 20, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, y, { steps: 12 });
  await page.mouse.up();
}

test.describe("estados interactivos", () => {
  test("nuevo gasto · sheet se abre y cierra", async ({ page }, testInfo) => {
    const dir = `capturas/interacciones/${testInfo.project.name}`;
    await page.goto("/#/gastos");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: "Nuevo gasto" }).click();
    await page.waitForTimeout(400);
    await expect(page.getByRole("dialog", { name: "Nuevo gasto" })).toBeVisible();
    await page.screenshot({ path: `${dir}/gastos-sheet-nuevo.png` });

    await page.getByRole("button", { name: "Cerrar" }).click();
    await page.waitForTimeout(350);
    await expect(page.getByRole("dialog", { name: "Nuevo gasto" })).toHaveCount(0);
  });

  test("editar gasto · muestra el monto anterior tachado", async ({ page }, testInfo) => {
    const dir = `capturas/interacciones/${testInfo.project.name}`;
    await page.goto("/#/gastos");
    await page.waitForTimeout(400);

    await revealFirstRowActions(page, isDesktop(testInfo.project.name));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/gastos-acciones.png` });

    await page.getByRole("button", { name: "Editar" }).click();
    await page.waitForTimeout(400);
    await expect(page.getByRole("dialog", { name: "Editar gasto" })).toBeVisible();
    await page.screenshot({ path: `${dir}/gastos-sheet-editar.png` });

    await page.getByRole("button", { name: "Cerrar" }).click();
    await page.waitForTimeout(300);
  });

  test("deslizar / 3 puntos revela acciones", async ({ page }, testInfo) => {
    const dir = `capturas/interacciones/${testInfo.project.name}`;
    await page.goto("/#/gastos");
    await page.waitForTimeout(400);

    await revealFirstRowActions(page, isDesktop(testInfo.project.name));
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${dir}/gastos-acciones.png` });

    await expect(
      page.locator(".expense-row").first().getByRole("button", { name: "Eliminar" })
    ).toBeVisible();
  });

  test("diálogo de eliminar", async ({ page }, testInfo) => {
    const dir = `capturas/interacciones/${testInfo.project.name}`;
    await page.goto("/#/gastos");
    await page.waitForTimeout(400);

    await revealFirstRowActions(page, isDesktop(testInfo.project.name));
    await page.waitForTimeout(250);
    await page.getByRole("button", { name: "Eliminar" }).click();
    await page.waitForTimeout(400);
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.screenshot({ path: `${dir}/gastos-dialogo.png` });

    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

  test("dev switcher visible solo con ?dev=1", async ({ page }, testInfo) => {
    const dir = `capturas/interacciones/${testInfo.project.name}`;
    await page.goto("/#/mas");
    await page.waitForTimeout(400);
    await expect(page.locator(".dev-switcher")).toHaveCount(0);

    await page.goto("/?dev=1#/mas");
    await page.waitForTimeout(400);
    await expect(page.locator(".dev-switcher")).toBeVisible();
    await page.screenshot({ path: `${dir}/mas-dev-switcher.png` });

    await page.locator(".dev-switcher").getByRole("button", { name: "Joaquín" }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${dir}/mas-dev-switcher-joaquin.png` });
  });

  test("hoja de sueldo en Ingresos", async ({ page }, testInfo) => {
    const dir = `capturas/interacciones/${testInfo.project.name}`;
    await page.goto("/#/ingresos");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Editar sueldo de Enrique" }).click();
    await page.waitForTimeout(400);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: `${dir}/ingresos-sheet.png` });
  });
});
