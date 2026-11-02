/**
 * Cálculo del ahorro personal (Fase 3).
 *
 * - `availableToSave`: cuánto queda disponible en el mes = neto personal +
 *   otros ingresos − tu parte de los gastos del hogar.
 * - `distributeFunds`: cómo se reparte lo disponible entre fondos (%), sumando
 *   exacto y sin repartir de más.
 * - `goalProgress`: cuánto apartar por periodo para llegar a una meta.
 *
 * Todo se calcula en **centavos enteros** (método del mayor resto).
 */
import { addMonths } from "../month";
import { fromCents, largestRemainder, round2, toCents } from "./money";

/** Cada cuánto se aparta para una meta. */
export type SavingsFrequency = "daily" | "weekly" | "monthly";

/** Etiqueta en español de la frecuencia. */
export const FREQUENCY_LABEL: Record<SavingsFrequency, string> = {
  daily: "por día",
  weekly: "por semana",
  monthly: "al mes"
};

/** Etiqueta corta para las pestañas de frecuencia. */
export const FREQUENCY_SHORT: Record<SavingsFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual"
};

/** Disponible personal del mes = neto + otros ingresos − tu parte de gastos. */
export function availableToSave(input: {
  net: number;
  share: number;
  otherIncomes: number;
}): number {
  return Math.max(0, round2(input.net + input.otherIncomes - input.share));
}

export interface FundSlice {
  fundId: string;
  amount: number;
}

/**
 * Reparte `available` entre los fondos según su `pct`. Si los porcentajes
 * suman más de 100, se escalan de forma proporcional para no repartir de más.
 * La suma de los montos es exactamente `available` (mayor resto).
 */
export function distributeFunds(
  available: number,
  funds: { id: string; pct: number }[]
): FundSlice[] {
  const clean = funds.filter((f) => f.pct > 0);
  if (clean.length === 0 || available <= 0) {
    return funds.map((f) => ({ fundId: f.id, amount: 0 }));
  }

  const totalPct = clean.reduce((a, f) => a + f.pct, 0);
  const scale = totalPct > 100 ? 100 / totalPct : 1;
  const parts = largestRemainder(
    toCents(available),
    clean.map((f) => f.pct * scale)
  );
  const byId = new Map(clean.map((f, i) => [f.id, fromCents(parts[i])]));
  return funds.map((f) => ({ fundId: f.id, amount: byId.get(f.id) ?? 0 }));
}

export interface GoalProgress {
  /** Cuánto falta (objetivo − ahorrado). */
  remaining: number;
  /** Periodos (día/semana/mes) que quedan hasta el mes límite. */
  periodsLeft: number;
  /** Cuánto apartar en cada periodo. */
  perPeriod: number;
  /** Progreso 0–100 (un decimal). */
  progressPct: number;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Meses completos entre `from` y `to`, contando ambos (mínimo 1). */
function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
}

/** Días naturales desde el 1.º de `from` hasta el último de `to`. */
function daysSpan(from: string, to: string): number {
  const months = monthsBetween(from, to);
  let days = 0;
  for (let i = 0; i < months; i++) days += daysInMonth(addMonths(from, i));
  return days;
}

/** Cuánto apartar (y el progreso) para una meta de ahorro. */
export function goalProgress(
  goal: { target: number; saved: number; frequency: SavingsFrequency; dueMonth?: string },
  fromMonth: string
): GoalProgress {
  const remaining = Math.max(0, round2(goal.target - goal.saved));

  let periodsLeft: number;
  if (goal.dueMonth) {
    const days = daysSpan(fromMonth, goal.dueMonth);
    if (goal.frequency === "daily") periodsLeft = Math.max(1, days);
    else if (goal.frequency === "weekly") periodsLeft = Math.max(1, Math.ceil(days / 7));
    else periodsLeft = monthsBetween(fromMonth, goal.dueMonth);
  } else {
    periodsLeft = goal.frequency === "daily" ? 30 : goal.frequency === "weekly" ? 5 : 12;
  }

  const perPeriod = remaining > 0 ? round2(remaining / periodsLeft) : 0;
  const progressPct =
    goal.target > 0
      ? Math.min(100, Math.max(0, Math.round((goal.saved / goal.target) * 1000) / 10))
      : 0;

  return { remaining, periodsLeft, perPeriod, progressPct };
}
