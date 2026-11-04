import { test, type Page } from "@playwright/test";

const ROUTES: [string, string][] = [
  ["01-bienvenida", "/bienvenida"],
  ["02-entrar", "/entrar"],
  ["03-hogar", "/hogar"],
  ["04-invitar", "/invitar"],
  ["05-unirme", "/unirme"],
  ["06-inicio", "/inicio"],
  ["07-ingresos", "/ingresos"],
  ["08-gastos", "/gastos"],
  ["09-reparto", "/reparto"],
  ["10-reparto-detalle", "/reparto/detalle"],
  ["11-mas", "/mas"],
  ["12-integrantes", "/mas/integrantes"],
  ["13-descuentos", "/mas/descuentos"],
  ["14-otros-ingresos", "/mas/otros-ingresos"],
  ["15-ahorros", "/mas/ahorros"],
  ["16-actualizaciones", "/mas/actualizaciones"]
];

/** Capturas finales de la Fase 3 (móvil y PC) para la tabla de verificación. */
test("capturas de todas las rutas (Fase 3)", async ({ page }, testInfo) => {
  const dir = `capturas-fase3/${testInfo.project.name}`;
  for (const [name, route] of ROUTES) {
    await page.goto(`/#${route}`);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  }
});

/** Fotogramas de las animaciones clave (solo móvil). */
test("capturas de animaciones", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "una vez basta");
  const dir = "capturas-fase3/animaciones";

  async function shot(name: string) {
    await page.screenshot({ path: `${dir}/${name}.png` });
  }

  // Bienvenida: brillo ambiental entrando.
  await page.goto("/#/bienvenida");
  await page.waitForTimeout(260);
  await shot("01-bienvenida-entrada");

  // Inicio: listas que suben escalonadas.
  await page.goto("/#/inicio");
  await page.waitForTimeout(300);
  await shot("02-inicio-escalonado");
  await page.waitForTimeout(900);
  await shot("03-inicio-estable");

  // Gastos: hoja entrando con resorte.
  await page.goto("/#/gastos");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Nuevo gasto" }).click();
  await page.waitForTimeout(180);
  await shot("04-hoja-entrando");

  // Reparto: cambio a partes iguales.
  await page.goto("/#/reparto");
  await page.waitForTimeout(800);
  await page.getByRole("tab", { name: "Partes iguales" }).click();
  await page.waitForTimeout(220);
  await shot("05-reparto-iguales");

  // Actualizaciones: descarga a medio camino.
  await page.goto("/#/mas/actualizaciones");
  await page.waitForTimeout(600);
  await shot("06-actualizacion-descargando");
});
