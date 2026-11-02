/**
 * Cálculo real de Nido (funciones puras, sin React).
 *
 * Todo el dinero se calcula en **centavos enteros** y los repartos se ajustan
 * con el **método del mayor resto** para que la suma siempre dé el total exacto.
 */
import { TAX_SETTINGS, lawDefaults, type Deduction, type TaxSettings } from "./settings";
import { largestRemainder, round2, toCents } from "./money";
import { balanceToIdeal, type BalanceRow } from "./balance";

export { TAX_SETTINGS, ISR_BRACKETS_2025, TAX_SOURCE_NOTE } from "./settings";
export type { TaxSettings, IsrBracket } from "./settings";
export {
  DEFAULT_DEDUCTIONS,
  lawDefaults,
} from "./settings";
export type {
  Deduction,
  DeductionType,
  DeductionBracket,
} from "./settings";
export { toCents, fromCents, round2, largestRemainder } from "./money";
export { balanceToIdeal } from "./balance";
export type { BalanceRow, BalanceResult } from "./balance";
export {
  availableToSave,
  distributeFunds,
  goalProgress,
  FREQUENCY_LABEL,
  FREQUENCY_SHORT
} from "./savings";
export type { SavingsFrequency, FundSlice, GoalProgress } from "./savings";

/* ============================================================
   Dinero
   ============================================================ */

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
   Descuentos editables (Fase 4)
   ============================================================ */

/** Resultado de aplicar la lista de descuentos a un sueldo bruto. */
export interface DeductionResult {
  /** Monto descontado por id de definición (redondeado a centavos). */
  byId: Record<string, number>;
  /** AFP aplicado (0 si está apagada). */
  afp: number;
  /** ISSS aplicado (0 si está apagado). */
  isss: number;
  /** Renta aplicada (0 si está apagada). */
  isr: number;
  /** Total descontado (suma de los descuentos activos). */
  total: number;
  /** Neto redondeado a centavos. */
  net: number;
  /** Neto sin redondear, usado como peso del reparto. */
  netWeight: number;
}

/** ¿Aplica este descuento para la persona, según sus banderas? */
function deductionApplies(d: Deduction, flags: DeductionFlags): boolean {
  if (!d.active) return false;
  if (!d.isLaw) return true; // Los personalizados aplican a todos si están activos.
  if (d.key === "afp") return flags.afpOn;
  if (d.key === "isss") return flags.isssOn;
  if (d.key === "isr") return flags.isrOn;
  return false;
}

/** Monto exacto (sin redondear) de un descuento sobre el bruto. */
function deductionAmount(
  gross: number,
  d: Deduction,
  afp: number,
  isss: number
): number {
  if (d.type === "percent") {
    const base = d.maxBase != null ? Math.min(gross, d.maxBase) : gross;
    let amount = base * d.value;
    if (d.cap != null) amount = Math.min(amount, d.cap);
    return amount;
  }
  if (d.type === "fixed") {
    let amount = d.value;
    if (d.cap != null) amount = Math.min(amount, d.cap);
    return amount;
  }
  // Tabla progresiva: la base descuenta AFP e ISSS ya aplicados.
  const base = Math.max(0, round2(gross - afp - isss));
  const bracket = (d.brackets ?? []).find(
    (b) => base >= b.from && (b.to === null || base <= b.to)
  );
  if (!bracket || bracket.rate === 0) return 0;
  return bracket.fixed + (base - bracket.over) * bracket.rate;
}

/**
 * Aplica una lista de descuentos (de ley y personalizados) a un sueldo bruto.
 *
 * Los descuentos de ley (AFP/ISSS/Renta) se controlan además con las banderas
 * por persona; los personalizados aplican a todos cuando están activos. La
 * Renta se calcula sobre `bruto − AFP − ISSS`.
 *
 * Con los valores por defecto devuelve exactamente lo mismo que `calcNet`.
 */
export function calcDeductions(
  gross: number,
  deductions: Deduction[],
  flags: DeductionFlags
): DeductionResult {
  const ordered = [...deductions].sort((a, b) => a.order - b.order);
  const byId: Record<string, number> = {};
  let afp = 0;
  let isss = 0;
  let isr = 0;
  let exactTotal = 0;

  for (const d of ordered) {
    if (!deductionApplies(d, flags)) {
      byId[d.id] = 0;
      continue;
    }
    const exact = deductionAmount(gross, d, afp, isss);
    exactTotal += exact;
    const rounded = round2(exact);
    byId[d.id] = rounded;
    if (d.key === "afp") afp = rounded;
    else if (d.key === "isss") isss = rounded;
    else if (d.key === "isr") isr = rounded;
  }

  const total = round2(Object.values(byId).reduce((sum, v) => sum + v, 0));
  const net = round2(gross - total);
  const netWeight = gross - exactTotal;

  return { byId, afp, isss, isr, total, net, netWeight };
}

/**
 * Restablece los valores de ley a sus cifras por defecto, conservando los
 * descuentos personalizados y el estado encendido/apagado de cada uno.
 */
export function resetLawDeductions(current: Deduction[]): Deduction[] {
  const customs = current.filter((d) => !d.isLaw);
  const law = lawDefaults().map((def) => {
    const cur = current.find(
      (d) => d.isLaw && (d.id === def.id || (d.key != null && d.key === def.key))
    );
    return cur ? { ...def, active: cur.active } : def;
  });
  return [...law, ...customs]
    .sort((a, b) => a.order - b.order)
    .map((d) => ({ ...d }));
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
 * Reparte los gastos entre sus participantes.
 *
 * - `salary`: primero busca el reparto con **doble restricción** (cada gasto
 *   suma su monto y cada persona queda con el total del mayor resto sobre el
 *   total general). Si la participación lo hace imposible, cae al reparto por
 *   gasto.
 * - `equal`: reparto por gasto en partes iguales.
 *
 * En todos los casos cada gasto suma exactamente su total.
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

    if (participants.length > 0) {
      const weights =
        mode === "equal"
          ? participants.map(() => 1)
          : participants.map((id) => weightOf.get(id)!);
      const parts = largestRemainder(total, weights);
      participants.forEach((id, i) => {
        amounts[id] = parts[i];
      });
    }
    byExpense[e.id] = amounts;
  }

  // «Según sueldo»: intenta el reparto con doble restricción.
  if (mode === "salary") {
    const rows: BalanceRow[] = expenses.map((e) => ({
      id: e.id,
      total: expenseMonthlyCents(e),
      participants: e.memberIds
        .filter((id) => weightOf.has(id))
        .map((id) => ({ id, weight: weightOf.get(id)! }))
    }));
    const balanced = balanceToIdeal(
      rows,
      members.map((m) => m.id)
    );
    if (balanced) {
      return { byExpense: balanced.byExpense, byMember: balanced.byMember, totalCents };
    }
  }

  for (const e of expenses) {
    for (const [id, value] of Object.entries(byExpense[e.id])) byMember[id] += value;
  }
  return { byExpense, byMember, totalCents };
}
