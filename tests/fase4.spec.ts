import { expect, test, type Page } from "@playwright/test";

function field(page: Page, label: string) {
  return page.locator(".field").filter({ hasText: label }).locator("input");
}

function money(page: Page, name: string) {
  return page.locator(".reparto-card", { hasText: name }).locator(".reparto-amount");
}

/* ============================================================
   Descuentos editables
   ============================================================ */

test("descuentos: apagar ISSS y agregar/eliminar un descuento", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "basta con un proyecto");

  await page.goto("/#/mas/descuentos");
  await page.waitForTimeout(900);
  const afp = page.locator(".ded-card", { hasText: "AFP · pensión" });
  const isss = page.locator(".ded-card", { hasText: "ISSS · seguro social" });
  const isr = page.locator(".ded-card", { hasText: "Renta (ISR)" });
  await expect(afp).toBeVisible();
  await expect(isss).toBeVisible();
  await expect(isr).toBeVisible();
  await expect(afp.locator(".ded-sub")).toContainText("7.25%");
  await expect(isss.locator(".ded-sub")).toContainText("tope $30.00");

  // Apagar ISSS: el neto de Enrique sube de $359.00 a $371.00.
  await page.getByRole("switch", { name: "Activar ISSS · seguro social" }).click();
  await page.waitForTimeout(600);
  await page.goto("/#/ingresos");
  await page.waitForTimeout(1000);
  await expect(
    page.locator(".income-card", { hasText: "Enrique" }).locator(".income-net-value")
  ).toHaveText("$371.00");
  await expect(
    page.locator(".income-card", { hasText: "Joaquín" }).locator(".income-net-value")
  ).toHaveText("$510.12");

  // Descuento personalizado de $50 (aplica a todos).
  await page.goto("/#/mas/descuentos");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Agregar descuento" }).click();
  await page.waitForTimeout(400);
  await field(page, "Nombre").fill("Préstamo");
  await field(page, "Monto mensual (US$)").fill("50");
  await page.getByRole("button", { name: "Guardar descuento" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("Préstamo")).toBeVisible();

  await page.goto("/#/ingresos");
  await page.waitForTimeout(1000);
  await expect(
    page.locator(".income-card", { hasText: "Enrique" }).locator(".income-net-value")
  ).toHaveText("$321.00");

  // Eliminarlo devuelve el neto a $371.00.
  await page.goto("/#/mas/descuentos");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Eliminar Préstamo" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("Préstamo")).toHaveCount(0);

  await page.goto("/#/ingresos");
  await page.waitForTimeout(1000);
  await expect(
    page.locator(".income-card", { hasText: "Enrique" }).locator(".income-net-value")
  ).toHaveText("$371.00");
});

test("descuentos: restablecer los valores de ley", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "basta con un proyecto");

  await page.goto("/#/mas/descuentos");
  await page.waitForTimeout(900);
  const afp = page.locator(".ded-card", { hasText: "AFP · pensión" });

  // Cambiar el porcentaje de AFP a 10 %.
  await page.getByRole("button", { name: "Editar AFP · pensión" }).click();
  await page.waitForTimeout(400);
  await field(page, "Porcentaje (%)").fill("10");
  await page.getByRole("button", { name: "Guardar descuento" }).click();
  await page.waitForTimeout(800);
  await expect(afp.locator(".ded-sub")).toContainText("10%");

  // Restablecer devuelve el 7.25 % de ley.
  await page.getByRole("button", { name: "Restablecer valores de ley" }).click();
  await page.waitForTimeout(900);
  await expect(afp.locator(".ded-sub")).toContainText("7.25%");
});

/* ============================================================
   Cómo se reparte
   ============================================================ */

test("reparto: proporcional, partes iguales y porcentajes manuales", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "basta con un proyecto");

  await page.goto("/#/reparto");
  await page.waitForTimeout(1300);

  // Por defecto: proporcional al sueldo neto (cifras de oro).
  await expect(money(page, "Enrique")).toHaveText("$146.48");
  await expect(money(page, "Joaquín")).toHaveText("$201.41");
  await expect(money(page, "Jefferson")).toHaveText("$183.61");

  // Partes iguales: el total se reparte por gasto y siempre suma $531.50.
  await page.getByRole("tab", { name: "Partes iguales" }).click();
  await page.waitForTimeout(1000);
  const equalAmounts = await page.locator(".reparto-amount").allTextContents();
  const equalSum = equalAmounts.reduce(
    (sum, t) => sum + Number(t.replace(/[^0-9.]/g, "")),
    0
  );
  expect(equalSum).toBeCloseTo(531.5, 2);
  for (const t of equalAmounts) expect(t).toMatch(/\$177\.\d{2}/);

  // Porcentajes manuales: 50 / 30 / 20.
  await page.getByRole("tab", { name: "% manual" }).click();
  await page.waitForTimeout(700);
  await expect(page.locator(".split-preview-tag")).toBeVisible();
  await page.getByRole("spinbutton", { name: "Porcentaje de Enrique" }).fill("50");
  await page.getByRole("spinbutton", { name: "Porcentaje de Joaquín" }).fill("30");
  await page.getByRole("spinbutton", { name: "Porcentaje de Jefferson" }).fill("20");
  await page.waitForTimeout(900);
  await expect(money(page, "Enrique")).toHaveText("$265.75");
  await expect(money(page, "Joaquín")).toHaveText("$159.45");
  await expect(money(page, "Jefferson")).toHaveText("$106.30");

  await page.getByRole("button", { name: "Guardar reparto" }).click();
  await page.waitForTimeout(900);
  await expect(page.getByText("Reparto guardado")).toBeVisible();

  // Persistencia local: sigue en % manual con los mismos montos.
  await page.reload();
  await page.waitForTimeout(1400);
  await expect(page.getByRole("tab", { name: "% manual" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(money(page, "Enrique")).toHaveText("$265.75");
});

test("reparto: monto fijo por integrante se guarda", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "basta con un proyecto");

  await page.goto("/#/reparto");
  await page.waitForTimeout(1200);
  await page.getByRole("tab", { name: "Monto fijo" }).click();
  await page.waitForTimeout(700);
  await expect(page.getByRole("spinbutton", { name: "Monto fijo de Enrique" })).toBeVisible();
  await page.getByRole("button", { name: "Guardar reparto" }).click();
  await page.waitForTimeout(900);

  await page.reload();
  await page.waitForTimeout(1400);
  await expect(page.getByRole("tab", { name: "Monto fijo" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

/* ============================================================
   Apariencia
   ============================================================ */

test("apariencia: modo oscuro y acento se guardan", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "basta con un proyecto");

  await page.goto("/#/mas/apariencia");
  await page.waitForTimeout(700);
  await expect(page.getByRole("tab", { name: "Claro" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(6);

  await page.getByRole("tab", { name: "Oscuro" }).click();
  await page.waitForTimeout(300);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("radio", { name: "Verde" }).click();
  await page.waitForTimeout(300);
  await expect(page.locator("html")).toHaveAttribute("data-accent", "green");

  // Persiste al recargar.
  await page.reload();
  await page.waitForTimeout(700);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "green");
  await expect(page.getByRole("radio", { name: "Verde" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
});

/* ============================================================
   Contraste AA en modo oscuro
   ============================================================ */

const ROUTES = [
  "/inicio",
  "/ingresos",
  "/gastos",
  "/reparto",
  "/reparto/detalle",
  "/mas",
  "/mas/integrantes",
  "/mas/descuentos",
  "/mas/apariencia",
  "/mas/otros-ingresos",
  "/mas/ahorros",
  "/mas/actualizaciones"
];

/**
 * Recorre cada pantalla en modo oscuro y comprueba el contraste del texto
 * contra su fondo efectivo (con transparencias compuestas). Se saltan los
 * degradados (no se pueden medir) y el contenido decorativo `aria-hidden`.
 */
test("modo oscuro: contraste AA en todas las pantallas", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "movil", "basta con un proyecto");

  await page.addInitScript(() => {
    localStorage.setItem("nido.theme.mode", "dark");
    localStorage.setItem("nido.theme.accent", "indigo");
  });

  const problems: string[] = [];

  for (const route of ROUTES) {
    await page.goto(`/#${route}`);
    await page.waitForTimeout(route === "/inicio" ? 1000 : 700);

    const found = await page.evaluate(() => {
      const parse = (value: string) => {
        const m = value.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const n = m[1].split(",").map((x) => parseFloat(x.trim()));
        return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
      };
      const channel = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      const luminance = (c: { r: number; g: number; b: number }) =>
        0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
      const blend = (
        fg: { r: number; g: number; b: number; a: number },
        bg: { r: number; g: number; b: number; a: number }
      ) => ({
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
        a: 1
      });
      const contrast = (
        a: { r: number; g: number; b: number },
        b: { r: number; g: number; b: number }
      ) => {
        const l1 = luminance(a);
        const l2 = luminance(b);
        const hi = Math.max(l1, l2);
        const lo = Math.min(l1, l2);
        return (hi + 0.05) / (lo + 0.05);
      };
      const backgroundOf = (el: Element) => {
        const stack: { r: number; g: number; b: number; a: number }[] = [];
        let node: Element | null = el;
        while (node) {
          const cs = getComputedStyle(node);
          if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
          const color = parse(cs.backgroundColor);
          if (color && color.a > 0) {
            stack.push(color);
            if (color.a >= 1) break;
          }
          node = node.parentElement;
        }
        let base = { r: 255, g: 255, b: 255, a: 1 };
        if (stack.length && stack[stack.length - 1].a >= 1) {
          base = stack.pop()!;
        }
        let bg = base;
        for (let i = stack.length - 1; i >= 0; i -= 1) bg = blend(stack[i], bg);
        return bg;
      };

      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        if (el.closest('[aria-hidden="true"]')) continue;
        if (el.tagName === "SCRIPT" || el.tagName === "STYLE") continue;
        const text = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent ?? "")
          .join("")
          .trim();
        if (!text) continue;
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          cs.visibility === "hidden" ||
          cs.display === "none" ||
          cs.opacity === "0"
        ) {
          continue;
        }
        const bg = backgroundOf(el);
        if (!bg) continue;
        const color = parse(cs.color);
        if (!color) continue;
        const fg = blend(color, bg);
        const ratio = contrast(fg, bg);
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const need = large ? 3 : 4.5;
        if (ratio + 0.01 < need) {
          out.push(
            `${el.className || el.tagName} · ${ratio.toFixed(2)} < ${need} · ${text.slice(0, 28)}`
          );
        }
      }
      return out;
    });

    for (const p of found) problems.push(`${route}: ${p}`);
  }

  expect(problems, problems.join("\n")).toEqual([]);
});