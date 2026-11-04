import { expect, test, type Page } from "@playwright/test";

/**
 * Flujo de entrada completo en modo demostración con Google: crear hogar,
 * copiar el código y unirse desde otra pestaña (mismo navegador, mismo
 * almacén), con el tiempo real por `BroadcastChannel`.
 */
function field(page: Page, label: string) {
  return page.locator(".field").filter({ hasText: label }).locator("input");
}

test("entrada: crear hogar y unirse desde otra pestaña", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // Pestaña 1: con la sesión cerrada.
  const a = await ctx.newPage();
  await a.addInitScript(() => localStorage.setItem("nido.demo.session", "0"));
  await a.goto("/#/bienvenida");

  // "Crear mi hogar" lleva a Google; en modo demostración entra y va al hogar.
  await a.getByRole("button", { name: "Crear mi hogar" }).click();

  await field(a, "Nombre del hogar").fill("Casa de prueba");
  await a.getByRole("button", { name: "Crear hogar" }).click();

  const code = (await a.locator(".invite-code").innerText()).trim();
  expect(code).toMatch(/^NIDO-/);
  await a.getByRole("button", { name: "Ir al inicio" }).click();
  await expect(a).toHaveURL(/#\/inicio/);

  // Pestaña 2: unirse con el código.
  const b = await ctx.newPage();
  await b.goto("/#/unirme");
  await field(b, "Código").fill(code);
  await expect(b.locator(".join-card-name")).toHaveText("Casa de prueba", { timeout: 8000 });
  await field(b, "Tu nombre").fill("Beto");
  await b.getByRole("button", { name: "Unirme al hogar" }).click();
  await expect(b).toHaveURL(/#\/inicio/);

  // La pestaña 1 ve a la persona nueva por tiempo real.
  await a.goto("/#/mas/integrantes");
  await expect(a.getByText("Beto").first()).toBeVisible({ timeout: 8000 });

  await ctx.close();
});

test("sesión: cerrar sesión protege las rutas de la app", async ({ page }) => {
  await page.goto("/#/mas");
  await page.locator(".settings-row").filter({ hasText: "Cerrar sesión" }).click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL(/#\/bienvenida/);
  await page.goto("/#/inicio");
  await expect(page).toHaveURL(/#\/bienvenida/, { timeout: 5000 });
});
