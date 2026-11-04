import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Sincronización real entre dispositivos (Supabase + Realtime).
 *
 * Con el acceso solo por Google no se puede iniciar sesión desde el script, así
 * que la prueba reutiliza dos sesiones ya guardadas con `storageState`:
 *
 *   NIDO_E2E_STORAGE_A / NIDO_E2E_STORAGE_B → rutas a los archivos .json
 *
 * Captúralas con `node scripts/e2e-login.mjs <archivo.json>` tras compilar con
 * `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver
 * docs/PRUEBA_SINCRONIZACION.md). Se omite si faltan y nunca imprime tokens.
 */
const storageA = process.env.NIDO_E2E_STORAGE_A ?? "";
const storageB = process.env.NIDO_E2E_STORAGE_B ?? "";
const enabled =
  storageA !== "" &&
  storageB !== "" &&
  existsSync(storageA) &&
  existsSync(storageB);

function field(page: Page, label: string) {
  return page.locator(".field").filter({ hasText: label }).locator("input");
}

test.describe("sincronización entre dispositivos", () => {
  test.skip(
    !enabled,
    "sin sesiones NIDO_E2E_STORAGE_A/B (ver docs/PRUEBA_SINCRONIZACION.md)"
  );

  test("lo que agrega un usuario lo ve el otro en menos de 10 segundos", async (
    { browser },
    testInfo
  ) => {
    test.skip(testInfo.project.name !== "movil", "una vez basta");

    const viewport = { width: 390, height: 844 };
    const ctxA = await browser.newContext({ storageState: storageA, viewport });
    const ctxB = await browser.newContext({ storageState: storageB, viewport });
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();

    try {
      // Ambas sesiones ya están iniciadas: entran directo al hogar.
      await a.goto("/#/inicio");
      await b.goto("/#/inicio");
      await expect(a).toHaveURL(/#\/(inicio|reparto)/, { timeout: 25_000 });
      await expect(b).toHaveURL(/#\/(inicio|reparto)/, { timeout: 25_000 });

      // B se queda mirando el inicio, sin recargar.
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
