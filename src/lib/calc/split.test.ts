import { describe, expect, it } from "vitest";
import { calcShares, expenseMonthlyCents, type CalcExpense, type CalcMember } from "./index";

const MEMBERS: CalcMember[] = [
  { id: "a", netWeight: 400 },
  { id: "b", netWeight: 550 },
  { id: "c", netWeight: 450 }
];

const EXPENSES: CalcExpense[] = [
  { id: "renta", type: "monthly", amount: 200, memberIds: ["a", "b", "c"] },
  { id: "luz", type: "monthly", amount: 100, memberIds: ["a", "b", "c"] }
];

describe("modos de reparto (Fase 4)", () => {
  it("manual: porcentajes 50 / 30 / 20 del total de $300", () => {
    const r = calcShares(EXPENSES, MEMBERS, "manual", { a: 50, b: 30, c: 20 });
    expect(r.totalCents).toBe(30000);
    expect(r.byMember).toEqual({ a: 15000, b: 9000, c: 6000 });
    for (const e of EXPENSES) {
      const sum = Object.values(r.byExpense[e.id]).reduce((x, y) => x + y, 0);
      expect(sum).toBe(expenseMonthlyCents(e));
    }
  });

  it("fijo: montos 100 / 100 / 100 suman el total de $300", () => {
    const r = calcShares(EXPENSES, MEMBERS, "fixed", { a: 100, b: 100, c: 100 });
    expect(r.byMember).toEqual({ a: 10000, b: 10000, c: 10000 });
  });

  it("fijo proporcional: 300 / 100 / 100 sobre $500", () => {
    const expenses: CalcExpense[] = [
      { id: "e", type: "monthly", amount: 500, memberIds: ["a", "b", "c"] }
    ];
    const r = calcShares(expenses, MEMBERS, "fixed", { a: 300, b: 100, c: 100 });
    expect(r.byMember).toEqual({ a: 30000, b: 10000, c: 10000 });
  });

  it("partes iguales reparte el total exacto", () => {
    const r = calcShares(
      [{ id: "e", type: "monthly", amount: 100, memberIds: ["a", "b", "c"] }],
      MEMBERS,
      "equal"
    );
    expect(r.byExpense.e).toEqual({ a: 3334, b: 3333, c: 3333 });
  });
});