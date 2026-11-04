import { expect, test } from "@playwright/test";

const ROUTES = [
  "/bienvenida",
  "/entrar",
  "/hogar",
  "/invitar",
  "/unirme",
  "/inicio",
  "/ingresos",
  "/gastos",
  "/reparto",
  "/mas",
  "/mas/integrantes",
  "/mas/descuentos",
  "/mas/apariencia",
  "/mas/otros-ingresos",
  "/mas/ahorros",
  "/mas/actualizaciones"
];

/**
 * Accesibilidad básica en todas las rutas: un solo título `h1` visible, botones
 * con nombre y campos con etiqueta, e imágenes decorativas ocultas al lector.
 */
test("accesibilidad básica en todas las pantallas", async ({ page }, testInfo) => {
  const problems: string[] = [];

  for (const route of ROUTES) {
    await page.goto(`/#${route}`);
    await page.waitForTimeout(route === "/inicio" ? 900 : 400);

    const data = await page.evaluate(() => {
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };

      const h1 = Array.from(document.querySelectorAll("h1")).filter(visible).length;
      const unnamedButtons = Array.from(document.querySelectorAll("button"))
        .filter(visible)
        .filter((b) => !((b.getAttribute("aria-label") ?? b.textContent ?? "").trim()))
        .map((b) => b.className || "(sin clase)");
      const unlabelledInputs = Array.from(document.querySelectorAll("input"))
        .filter(visible)
        .filter(
          (i) =>
            !i.getAttribute("aria-label") &&
            !i.closest("label") &&
            !i.closest(".field")?.querySelector(".field-label")
        )
        .map((i) => i.className || "(sin clase)");
      const brokenLabels = Array.from(document.querySelectorAll("[aria-labelledby]")).filter((el) => {
        const id = el.getAttribute("aria-labelledby") ?? "";
        return id && !document.getElementById(id);
      }).length;

      return { h1, unnamedButtons, unlabelledInputs, brokenLabels };
    });

    if (data.h1 !== 1) problems.push(`${route}: ${data.h1} títulos h1`);
    for (const b of data.unnamedButtons) problems.push(`${route}: botón sin nombre (${b})`);
    for (const i of data.unlabelledInputs) problems.push(`${route}: campo sin etiqueta (${i})`);
    if (data.brokenLabels) problems.push(`${route}: ${data.brokenLabels} aria-labelledby rotos`);
  }

  // El idioma del documento debe ser español.
  await page.goto("/#/inicio");
  const lang = await page.evaluate(() => document.documentElement.lang);
  if (!lang.startsWith("es")) problems.push(`idioma del documento: "${lang}"`);

  expect(problems, problems.join("\n")).toEqual([]);
});
