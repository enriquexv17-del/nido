import { describe, expect, it } from "vitest";
import {
  calcAfp,
  calcIsss,
  calcIsr,
  calcIsrBase,
  calcNet,
  calcShares,
  expenseMonthlyCents,
  largestRemainder,
  type CalcExpense,
  type CalcMember
} from "./index";

/* ============================================================
   Datos de la Fase 1 (prueba de oro)
   ============================================================ */

const RAW_PEOPLE = [
  { id: "enrique", gross: 400, afpOn: true, isssOn: true, isrOn: false },
  { id: "joaquin", gross: 550, afpOn: true, isssOn: true, isrOn: false },
  { id: "jefferson", gross: 450, afpOn: false, isssOn: false, isrOn: false }
];

const ALL = ["enrique", "joaquin", "jefferson"];

const EXPENSES: CalcExpense[] = [
  { id: "renta", type: "monthly", amount: 280, memberIds: ALL },
  { id: "luz", type: "monthly", amount: 32.5, memberIds: ALL },
  { id: "agua", type: "monthly", amount: 14, memberIds: ALL },
  { id: "internet", type: "monthly", amount: 25, memberIds: ALL },
  { id: "comida", type: "daily", amount: 180, perDay: 6, days: 30, memberIds: ALL }
];

function goldenMembers(): CalcMember[] {
  return RAW_PEOPLE.map((p) => ({
    id: p.id,
    netWeight: calcNet(p.gross, p).net
  }));
}

/* ============================================================
   Prueba de oro del reparto
   ============================================================ */

describe("prueba de oro del reparto (datos de la Fase 1)", () => {
  const members = goldenMembers();
  const result = calcShares(EXPENSES, members, "salary");

  it("el total del hogar es exacto: $531.50", () => {
    expect(result.totalCents).toBe(53150);
  });

  it("cada gasto se reparte exacto (suma = total del gasto)", () => {
    for (const e of EXPENSES) {
      const parts = Object.values(result.byExpense[e.id]);
      const sum = parts.reduce((a, b) => a + b, 0);
      expect(sum).toBe(expenseMonthlyCents(e));
    }
  });

  it("la suma de todas las partes es exactamente el total", () => {
    const total = members
      .map((m) => result.byMember[m.id])
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(53150);
  });

  it("la parte de Enrique es $146.49 (ver nota de redondeo)", () => {
    // El reparto por gasto con mayor resto da $146.49. El «ideal» del total
    // redondeado es $146.48; la diferencia de 1 centavo se explica en PLAN2.md.
    expect(result.byMember.enrique).toBe(14649);
  });

  it("la parte de cada quien respeta el mayor resto", () => {
    expect(result.byMember.enrique).toBe(14649);
    expect(result.byMember.joaquin).toBe(20139);
    expect(result.byMember.jefferson).toBe(18362);
  });

  it("el detalle gasto por gasto de Enrique es correcto", () => {
    expect(result.byExpense.renta.enrique).toBe(7717);
    expect(result.byExpense.luz.enrique).toBe(896);
    expect(result.byExpense.agua.enrique).toBe(386);
    expect(result.byExpense.internet.enrique).toBe(689);
    expect(result.byExpense.comida.enrique).toBe(4961);
  });

  it("documenta el reparto «ideal» del total (valores de la especificación)", () => {
    // Mayor resto aplicado al total del mes (no por gasto). Estos son los
    // valores que cita la especificación: 146.48 / 201.41 / 183.61.
    const ideal = largestRemainder(
      53150,
      members.map((m) => m.netWeight)
    );
    expect(ideal).toEqual([14648, 20141, 18361]);
  });
});

/* ============================================================
   Descuentos de ley
   ============================================================ */

describe("descuentos de ley", () => {
  it("AFP = 7.25 % del bruto", () => {
    expect(calcAfp(400)).toBe(29);
    expect(calcAfp(550)).toBe(39.88);
  });

  it("ISSS = 3 % con tope de $30", () => {
    expect(calcIsss(400)).toBe(12);
    expect(calcIsss(550)).toBe(16.5);
    expect(calcIsss(1000)).toBe(30);
    expect(calcIsss(1500)).toBe(30);
  });

  it("neto de la Fase 1 (AFP + ISSS activos)", () => {
    expect(calcNet(400, { afpOn: true, isssOn: true, isrOn: false }).net).toBe(359);
    expect(calcNet(550, { afpOn: true, isssOn: true, isrOn: false }).net).toBe(493.62);
  });

  it("Renta (ISR) según el Decreto Ejecutivo No. 10 de 2025", () => {
    const isr = (gross: number) =>
      calcIsr(calcIsrBase(gross, calcAfp(gross), calcIsss(gross)));
    expect(isr(600)).toBe(0); // base 538.50 → tramo I
    expect(isr(800)).toBe(34.47); // base 718.00 → tramo II
    expect(isr(1500)).toBe(153.2); // base 1361.25 → tramo III
    expect(isr(2500)).toBe(363.77); // base 2288.75 → tramo IV
  });

  it("la base gravada descuenta AFP e ISSS", () => {
    expect(calcIsrBase(600, 43.5, 18)).toBe(538.5);
  });
});

/* ============================================================
   Casos borde
   ============================================================ */

describe("casos borde del reparto", () => {
  const one: CalcMember[] = [{ id: "a", netWeight: 300 }];
  const two: CalcMember[] = [
    { id: "a", netWeight: 300 },
    { id: "b", netWeight: 100 }
  ];
  const three: CalcMember[] = [
    { id: "a", netWeight: 300 },
    { id: "b", netWeight: 300 },
    { id: "c", netWeight: 300 }
  ];

  const monthly = (amount: number, memberIds: string[]): CalcExpense => ({
    id: "e",
    type: "monthly",
    amount,
    memberIds
  });

  it("1 persona paga el 100 %", () => {
    const r = calcShares([monthly(100, ["a"])], one, "salary");
    expect(r.byMember.a).toBe(10000);
  });

  it("2 personas en partes iguales", () => {
    const r = calcShares([monthly(100, ["a", "b"])], two, "equal");
    expect(r.byExpense.e).toEqual({ a: 5000, b: 5000 });
  });

  it("3 personas en partes iguales reparten los centavos", () => {
    const r = calcShares([monthly(100, ["a", "b", "c"])], three, "equal");
    expect(r.byExpense.e).toEqual({ a: 3334, b: 3333, c: 3333 });
  });

  it("neto igual para todos en modo sueldo = mismo reparto", () => {
    const r = calcShares([monthly(100, ["a", "b", "c"])], three, "salary");
    expect(r.byExpense.e).toEqual({ a: 3334, b: 3333, c: 3333 });
  });

  it("un gasto entre solo 2 personas no toca a la tercera", () => {
    const r = calcShares([monthly(100, ["a", "b"])], three, "salary");
    expect(r.byMember.c).toBe(0);
    expect(r.byExpense.e.c).toBeUndefined();
  });

  it("sueldo 0 no paga cuando hay otros con sueldo", () => {
    const r = calcShares(
      [monthly(100, ["a", "b"])],
      [
        { id: "a", netWeight: 0 },
        { id: "b", netWeight: 100 }
      ],
      "salary"
    );
    expect(r.byMember.a).toBe(0);
    expect(r.byMember.b).toBe(10000);
  });

  it("una persona «solo con nombre» (peso 0) no paga su parte", () => {
    const r = calcShares(
      [monthly(90, ["a", "sin-cuenta"])],
      [
        { id: "a", netWeight: 200 },
        { id: "sin-cuenta", netWeight: 0 }
      ],
      "salary"
    );
    expect(r.byMember["sin-cuenta"]).toBe(0);
    expect(r.byMember.a).toBe(9000);
  });

  it("gasto por día usa monto × días", () => {
    expect(expenseMonthlyCents({ id: "x", type: "daily", amount: 0, perDay: 6, days: 30, memberIds: ["a"] })).toBe(18000);
  });
});

/* ============================================================
   Mayor resto
   ============================================================ */

describe("método del mayor resto", () => {
  it("siempre suma el total", () => {
    const cases: [number, number[]][] = [
      [10000, [1, 1, 1]],
      [53150, [359, 493.62, 450]],
      [1, [1, 1, 1]],
      [0, [1, 2, 3]],
      [7, [1, 1]]
    ];
    for (const [total, weights] of cases) {
      const parts = largestRemainder(total, weights);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it("reparte igual cuando todos los pesos son 0", () => {
    expect(largestRemainder(10, [0, 0])).toEqual([5, 5]);
  });
});
