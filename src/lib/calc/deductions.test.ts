import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEDUCTIONS,
  calcDeductions,
  calcNet,
  resetLawDeductions,
  type Deduction,
  type DeductionFlags
} from "./index";

/** Todos los descuentos de ley encendidos para la persona. */
const ALL_ON: DeductionFlags = { afpOn: true, isssOn: true, isrOn: true };

const customFixed = (value: number, active = true): Deduction => ({
  id: "custom-1",
  name: "Préstamo",
  type: "fixed",
  value,
  active,
  isLaw: false,
  order: 10
});

describe("descuentos editables", () => {
  it("sueldo 365: solo AFP + ISSS = 37.41, sin renta", () => {
    const r = calcDeductions(365, DEFAULT_DEDUCTIONS, ALL_ON);
    expect(r.byId["law-afp"]).toBe(26.46);
    expect(r.byId["law-isss"]).toBe(10.95);
    expect(r.isr).toBe(0);
    expect(r.total).toBe(37.41);
    expect(r.net).toBe(327.59);
  });

  it("ISSS respeta su tope de $30 al mes", () => {
    expect(calcDeductions(365, DEFAULT_DEDUCTIONS, ALL_ON).isss).toBe(10.95);
    expect(calcDeductions(1000, DEFAULT_DEDUCTIONS, ALL_ON).isss).toBe(30);
    expect(calcDeductions(5000, DEFAULT_DEDUCTIONS, ALL_ON).isss).toBe(30);
  });

  it("la Renta usa la base bruto − AFP − ISSS", () => {
    // 800 − 58 − 24 = 718 → tramo II: 17.67 + (718 − 550) · 10 % = 34.47
    expect(calcDeductions(800, DEFAULT_DEDUCTIONS, ALL_ON).isr).toBe(34.47);
  });

  it("un descuento personalizado (monto fijo) reduce el neto", () => {
    const r = calcDeductions(365, [...DEFAULT_DEDUCTIONS, customFixed(50)], ALL_ON);
    expect(r.byId["custom-1"]).toBe(50);
    expect(r.total).toBe(87.41);
    expect(r.net).toBe(277.59);
  });

  it("un descuento desactivado no se aplica", () => {
    const off = DEFAULT_DEDUCTIONS.map((d) =>
      d.key === "isss" ? { ...d, active: false } : d
    );
    const r = calcDeductions(365, off, ALL_ON);
    expect(r.byId["law-isss"]).toBe(0);
    expect(r.isss).toBe(0);
    expect(r.total).toBe(26.46);

    const r2 = calcDeductions(365, [...DEFAULT_DEDUCTIONS, customFixed(50, false)], ALL_ON);
    expect(r2.byId["custom-1"]).toBe(0);
    expect(r2.total).toBe(37.41);
  });

  it("restablecer valores de ley recupera los valores por defecto", () => {
    const changed: Deduction[] = [
      { ...DEFAULT_DEDUCTIONS[0], value: 0.1, maxBase: 9999 },
      { ...DEFAULT_DEDUCTIONS[1], active: false },
      DEFAULT_DEDUCTIONS[2],
      customFixed(75)
    ];
    const reset = resetLawDeductions(changed);
    const afp = reset.find((d) => d.key === "afp")!;
    const isss = reset.find((d) => d.key === "isss")!;
    expect(afp.value).toBe(0.0725);
    expect(afp.maxBase).toBe(7045.06);
    expect(isss.active).toBe(false); // se conserva el encendido/apagado
    expect(reset.some((d) => d.id === "custom-1")).toBe(true); // personalizado intacto
  });

  it("con los valores por defecto coincide con calcNet (netos de oro)", () => {
    const cases = [
      { gross: 400, flags: { afpOn: true, isssOn: true, isrOn: false } },
      { gross: 550, flags: { afpOn: true, isssOn: true, isrOn: false } },
      { gross: 450, flags: { afpOn: false, isssOn: false, isrOn: false } }
    ];
    for (const { gross, flags } of cases) {
      const a = calcDeductions(gross, DEFAULT_DEDUCTIONS, flags);
      const b = calcNet(gross, flags);
      expect(a.afp).toBe(b.afp);
      expect(a.isss).toBe(b.isss);
      expect(a.isr).toBe(b.isr);
      expect(a.net).toBe(b.net);
      expect(a.netWeight).toBeCloseTo(b.netWeight, 6);
    }
  });
});
