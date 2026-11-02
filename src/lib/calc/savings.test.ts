import { describe, expect, it } from "vitest";
import { availableToSave, distributeFunds, goalProgress } from "./savings";

describe("availableToSave", () => {
  it("suma el neto y los ingresos extra y resta la parte de gastos", () => {
    // Enrique (demo): neto 359 + extras 105 − parte 146.48
    expect(availableToSave({ net: 359, share: 146.48, otherIncomes: 105 })).toBe(317.52);
  });

  it("nunca es negativo", () => {
    expect(availableToSave({ net: 100, share: 200, otherIncomes: 0 })).toBe(0);
  });

  it("sin ingresos extra usa solo el neto", () => {
    expect(availableToSave({ net: 450, share: 183.61, otherIncomes: 0 })).toBe(266.39);
  });
});

describe("distributeFunds", () => {
  it("reparte por porcentaje y suma exacto", () => {
    const slices = distributeFunds(317.52, [
      { id: "a", pct: 40 },
      { id: "b", pct: 20 },
      { id: "c", pct: 40 }
    ]);
    const sum = slices.reduce((acc, s) => acc + s.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(317.52);
    expect(slices.find((s) => s.fundId === "b")!.amount).toBe(63.5);
    // El de 40 % es el doble que el de 20 %.
    expect(slices.find((s) => s.fundId === "a")!.amount).toBeCloseTo(127.01, 2);
  });

  it("escala cuando los porcentajes suman más de 100", () => {
    const slices = distributeFunds(100, [
      { id: "a", pct: 80 },
      { id: "b", pct: 80 }
    ]);
    // 80/80 → se escala a 50/50.
    expect(slices.find((s) => s.fundId === "a")!.amount).toBe(50);
    expect(slices.find((s) => s.fundId === "b")!.amount).toBe(50);
    const sum = slices.reduce((acc, s) => acc + s.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
  });

  it("no reparte nada si no hay disponible o no hay fondos", () => {
    expect(distributeFunds(0, [{ id: "a", pct: 50 }])).toEqual([{ fundId: "a", amount: 0 }]);
    expect(distributeFunds(200, [])).toEqual([]);
  });

  it("ignora fondos con porcentaje 0", () => {
    const slices = distributeFunds(100, [
      { id: "a", pct: 100 },
      { id: "b", pct: 0 }
    ]);
    expect(slices.find((s) => s.fundId === "b")!.amount).toBe(0);
    expect(slices.find((s) => s.fundId === "a")!.amount).toBe(100);
  });
});

describe("goalProgress", () => {
  it("meta mensual con fecha límite", () => {
    // De 2026-11 a 2027-02 → 4 meses.
    const p = goalProgress(
      { target: 300, saved: 90, frequency: "monthly", dueMonth: "2027-02" },
      "2026-11"
    );
    expect(p.remaining).toBe(210);
    expect(p.periodsLeft).toBe(4);
    expect(p.perPeriod).toBe(52.5);
    expect(p.progressPct).toBe(30);
  });

  it("meta semanal calcula los periodos por semanas", () => {
    const p = goalProgress(
      { target: 200, saved: 0, frequency: "weekly", dueMonth: "2026-11" },
      "2026-11"
    );
    // Noviembre tiene 30 días → ceil(30/7) = 5 semanas.
    expect(p.periodsLeft).toBe(5);
    expect(p.perPeriod).toBe(40);
  });

  it("meta diaria usa los días del mes", () => {
    const p = goalProgress(
      { target: 150, saved: 0, frequency: "daily", dueMonth: "2026-11" },
      "2026-11"
    );
    expect(p.periodsLeft).toBe(30);
    expect(p.perPeriod).toBe(5);
  });

  it("sin fecha usa un horizonte por defecto y tope de progreso", () => {
    const p = goalProgress({ target: 120, saved: 150, frequency: "monthly" }, "2026-11");
    expect(p.remaining).toBe(0);
    expect(p.periodsLeft).toBe(12);
    expect(p.perPeriod).toBe(0);
    expect(p.progressPct).toBe(100);
  });

  it("objetivo 0 no rompe el progreso", () => {
    const p = goalProgress({ target: 0, saved: 0, frequency: "monthly" }, "2026-11");
    expect(p.progressPct).toBe(0);
  });
});
