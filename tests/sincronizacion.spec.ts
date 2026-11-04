import { expect, test, type Page } from "@playwright/test";

/**
 * Sincronización real entre dispositivos (Supabase + Realtime).
 *
 * Se OMITE salvo que existan credenciales de prueba en el entorno:
 *
 *   NIDO_E2E_SUPABASE=1
 *   NIDO_E2E_EMAIL_A / NIDO_E2E_PASSWORD_A
 *   NIDO_E2E_EMAIL_B / NIDO_E2E_PASSWORD_B
 *
 * Los dos usuarios deben pertenecer al MISMO hogar de prueba. El APK/instalador
 * y el `dist` de esta prueba tienen que haberse compilado con
 * `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver docs/PRUEBA_SINCRONIZACION.md).
 * Las credenciales nunca se imprimen.
 */

const emailA = process.env.NIDO_E2E_EMAIL_A ?? "";
const passA = process.env.NIDO_E2E_PASSWORD_A ?? "";
const emailB = process.env.NIDO_E2E_EMAIL_B ?? "";
const passB = process.env.NIDO_E2E_PASSWORD_B ?? "";
const enabled =
  process.env.NIDO_E2E_SUPABASE === "1" &&
  emailA !== "" &&
  passA !== "" &&
  emailB !== "" &&
  passB !== "";

function field(page: Page, label: string) {
  return page.locator(".field").filter({ hasText: label }).locator("input");
}

async function entrar(page: Page, email: string, password: string) {
  await page.goto("/#/entrar");
  await field(page, "Correo").fill(email);
  await field(page, "Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/#\/(inicio|reparto)/, { timeout: 25_000 });
}

test.describe("sincronización entre dispositivos", () => {
  test.skip(
    !enabled,
    "sin credenciales NIDO_E2E_* (ver docs/PRUEBA_SINCRONIZACION.md)"
  );

  test("lo que agrega un usuario lo ve el otro en menos de 10 segundos", async (
    { browser },
    testInfo
  ) => {
    test.skip(testInfo.project.name !== "movil", "una vez basta");

    const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();

    try {
      await entrar(a, emailA, passA);
      await entrar(b, emailB, passB);

      // B se queda mirando el inicio, sin recargar.
      await b.goto("/#/inicio");
      await b.waitForTimeout(1500);

      // A agrega un gasto nuevo.
      const nombre = `Prueba ${Date.now()}`;
      await a.goto("/#/gastos");
      await a.waitForTimeout(800);
      await a.getByRole("button", { name: "Nuevo gasto" }).click();
      await a.waitForTimeout(400);
      await field(a, "Nombre").fill(nombre);
      await a.getByRole("tab", { name: "Mensual" }).click();
      await field(a, "Monto").fill("11");
      await a.getByRole("button", { name: "Guardar gasto" }).click();

      // B lo ve solo, en menos de 10 segundos.
      await expect(b.getByText(nombre)).toBeVisible({ timeout: 10_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
