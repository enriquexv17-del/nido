/**
 * Cálculo real de Nido (funciones puras, sin React).
 *
 * Todo el dinero se calcula en **centavos enteros** y los repartos se ajustan
 * con el **método del mayor resto** para que la suma siempre dé el total exacto.
 */
import { TAX_SETTINGS, type TaxSettings } from "./settings";

export { TAX_SETTINGS, ISR_BRACKETS_2025, TAX_SOURCE_NOTE } from "./settings";
export type { TaxSettings, IsrBracket } from "./settings";

/* ============================================================
   Dinero
   ============================================================ */

/** Convierte dólares a centavos enteros. */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

/** Convierte centavos enteros a dólares. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Redondea a 2 decimales evitando el error de coma flotante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Reparte `totalCents` entre varios pesos con el **método del mayor resto**.
 * El resultado siempre suma exactamente `totalCents`.
 */
export function largestRemainder(totalCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    // Sin pesos: reparto igual, también con mayor resto.
    return largestRemainder(totalCents, weights.map(() => 1));
  }

  const exact = weights.map((w) => (totalCents * w) / total);
  const out = exact.map((v) => Math.floor(v));
  let rest = totalCents - out.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  let k = 0;
  while (rest > 0 && order.length > 0) {
    out[order[k % order.length].i] += 1;
    k += 1;
    rest -= 1;
  }
  return out;
}

/* ============================================================
   Descuentos de ley (AFP · ISSS · Renta)
   ============================================================ */

/** AFP: 7.25 % del sueldo bruto. */
export function calcAfp(gross: number, s: TaxSettings = TAX_SETTINGS): number {
  return round2(gross * s.afpRate);
}

/** ISSS: 3 % del bruto con base máxima $1,000 → tope $30 al mes. */
export function calcIsss(gross: number, s: TaxSettings = TAX_SETTINGS): number {
  const base = Math.min(gross, s.isssMaxBase);
  return round2(Math.min(base * s.isssRate, s.isssCap));
}

/** Base gravada de Renta = bruto − AFP − ISSS. */
export function calcIsrBase(gross: number, afp: number, isss: number): number {
  return Math.max(0, round2(gross - afp - isss));
}

/** Renta (ISR) mensual según la tabla vigente. */
export function calcIsr(baseGravada: number, s: TaxSettings = TAX_SETTINGS): number {
  if (baseGravada <= 0) return 0;
  const bracket = s.isrBrackets.find(
    (b) => baseGravada >= b.from && (b.to === null || baseGravada <= b.to)
  );
  if (!bracket || bracket.rate === 0) return 0;
  return round2(bracket.fixed + (baseGravada - bracket.over) * bracket.rate);
}

export interface DeductionFlags {
  afpOn: boolean;
  isssOn: boolean;
  isrOn: boolean;
}

export interface NetResult {
  afp: number;
  isss: number;
  isr: number;
  /** Neto mostrado (redondeado a centavos). */
  net: number;
  /**
   * Neto sin redondear, usado **como peso del reparto** para no arrastrar
   * errores de redondeo en la asignación.
   */
  netWeight: number;
}

/** Calcula los descuentos activos y el neto de una persona. */
export function calcNet(
  gross: number,
  flags: DeductionFlags,
  s: TaxSettings = TAX_SETTINGS
): NetResult {
  const afp = flags.afpOn ? calcAfp(gross, s) : 0;
  const isss = flags.isssOn ? calcIsss(gross, s) : 0;
  const isr = flags.isrOn ? calcIsr(calcIsrBase(gross, afp, isss), s) : 0;

  const net = round2(gross - afp - isss - isr);
  // Peso con precisión completa: usa el bruto y las tasas sin redondear.
  const afpExact = flags.afpOn ? gross * s.afpRate : 0;
  const isssExact = flags.isssOn
    ? Math.min(Math.min(gross, s.isssMaxBase) * s.isssRate, s.isssCap)
    : 0;
  const isrExact = flags.isrOn ? calcIsr(calcIsrBase(gross, afp, isss), s) : 0;
  const netWeight = gross - afpExact - isssExact - isrExact;

  return { afp, isss, isr, net, netWeight };
}

/* ============================================================
   Reparto de gastos
   ============================================================ */

export type ExpenseKind = "monthly" | "daily";

export interface CalcExpense {
  id: string;
  type: ExpenseKind;
  amount: number;
  perDay?: number;
  days?: number;
  /** Miembros que participan en este gasto. */
  memberIds: string[];
}

export interface CalcMember {
  id: string;
  /** Peso en el reparto «según sueldo» (su neto). */
  netWeight: number;
}

/** Monto mensual de un gasto en centavos (los «por día» usan sus días). */
export function expenseMonthlyCents(e: CalcExpense): number {
  if (e.type === "daily") return toCents((e.perDay ?? 0) * (e.days ?? 30));
  return toCents(e.amount);
}

export type SplitMode = "salary" | "equal";

export interface ExpenseShare {
  expenseId: string;
  amounts: Record<string, number>;
}

export interface ShareResult {
  /** Aporte de cada miembro a cada gasto, en centavos. */
  byExpense: Record<string, Record<string, number>>;
  /** Total que paga cada miembro, en centavos. */
  byMember: Record<string, number>;
  /** Total repartido, en centavos. */
  totalCents: number;
}

/**
 * Reparte cada gasto entre sus participantes.
 *
 * - `salary`: peso = neto de cada participante (solo de quienes participan).
 * - `equal`: todos los participantes pesan igual.
 *
 * Cada gasto suma exactamente su total y el total general es la suma de las
 * partes.
 */
export function calcShares(
  expenses: CalcExpense[],
  members: CalcMember[],
  mode: SplitMode = "salary"
): ShareResult {
  const weightOf = new Map(members.map((m) => [m.id, m.netWeight]));
  const byExpense: Record<string, Record<string, number>> = {};
  const byMember: Record<string, number> = {};
  for (const m of members) byMember[m.id] = 0;

  let totalCents = 0;

  for (const e of expenses) {
    const total = expenseMonthlyCents(e);
    totalCents += total;
    const participants = e.memberIds.filter((id) => weightOf.has(id));
    const amounts: Record<string, number> = {};

    if (participants.length === 0) {
      byExpense[e.id] = amounts;
      continue;
    }

    const weights =
      mode === "equal" ? participants.map(() => 1) : participants.map((id) => weightOf.get(id)!);
    const parts = largestRemainder(total, weights);
    participants.forEach((id, i) => {
      amounts[id] = parts[i];
      byMember[id] += parts[i];
    });
    byExpense[e.id] = amounts;
  }

  return { byExpense, byMember, totalCents };
}
