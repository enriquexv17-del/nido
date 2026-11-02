/** Tipos del dominio de Nido (Fase 2). */
import type { Deduction, SavingsFrequency, SplitMode } from "../lib/calc";

export type {
  Deduction,
  DeductionType,
  DeductionBracket,
  SplitMode
} from "../lib/calc";

export type ExpenseIcon = "building" | "bolt" | "drop" | "wifi" | "utensils" | "wallet";

export type ExpenseType = "monthly" | "daily";

export type MemberRole = "admin" | "member";

/** Identificador de un integrante. */
export type PersonId = string;

/** Colores del selector «Tu color en la app». */
export const COLOR_CHOICES = ["--p1", "--p2", "--p3", "--pk"] as const;
export type ColorChoice = (typeof COLOR_CHOICES)[number];

/** Colores de cada ícono de gasto. */
export const EXPENSE_ICON_STYLE: Record<ExpenseIcon, { color: string; colorBg: string }> = {
  building: { color: "#2F3FA0", colorBg: "#E7EAFB" },
  bolt: { color: "#A66F00", colorBg: "#FFF1CF" },
  drop: { color: "#1E86C8", colorBg: "#DCEFFB" },
  wifi: { color: "#6A4BD8", colorBg: "#ECE6FD" },
  utensils: { color: "#D5503F", colorBg: "#FDE6E3" },
  wallet: { color: "#0B7C60", colorBg: "#DDF5EC" }
};

export const ICON_OPTIONS: { icon: ExpenseIcon; label: string }[] = [
  { icon: "building", label: "Renta" },
  { icon: "bolt", label: "Luz" },
  { icon: "drop", label: "Agua" },
  { icon: "wifi", label: "Internet" },
  { icon: "utensils", label: "Comida" },
  { icon: "wallet", label: "Otro" }
];

/* ---------------- Datos crudos (tal como viven en la base) ---------------- */

export interface RawMember {
  id: string;
  /** Id de `auth.users` si está vinculado; `null` para «solo con nombre». */
  userId: string | null;
  name: string;
  color: string;
  role: MemberRole;
  /** Posición 1–3 dentro del hogar. */
  position: number;
  /** Correo (si está vinculado). */
  email?: string;
}

export interface RawIncome {
  memberId: string;
  /** Mes en formato `YYYY-MM`. */
  month: string;
  gross: number;
  afpOn: boolean;
  isssOn: boolean;
  isrOn: boolean;
}

export interface RawExpense {
  id: string;
  name: string;
  icon: ExpenseIcon;
  type: ExpenseType;
  /** Monto mensual; para «daily» es `perDay × days`. */
  amount: number;
  perDay?: number;
  days?: number;
  /** Integrantes entre quienes se reparte. */
  memberIds: string[];
  /** Mes `YYYY-MM` al que pertenece. */
  month: string;
}

export interface RawActivity {
  id: string;
  memberId: string;
  icon: ExpenseIcon | "refresh" | "plus";
  text: string;
  detail: string;
  at: string;
}

/* ---------------- Fase 3: ingresos extra, ahorros y metas ---------------- */

/** Ingreso extra **personal** (marca de ropa, edición, etc.). No entra al reparto. */
export interface RawOtherIncome {
  id: string;
  /** A quién pertenece (personal). */
  memberId: string;
  /** Mes en formato `YYYY-MM`. */
  month: string;
  /** Nombre del negocio o fuente («Marca de ropa», «Edición de video»). */
  source: string;
  /** Qué fue («Venta de 3 camisas»). */
  note: string;
  /** Cuánto se recibió (dólares). */
  amount: number;
  /** Día del mes (1–31), opcional. */
  day?: number;
  createdAt: string;
}

/** Cada cuánto se aparta para una meta (definido en el cálculo). */
export type { SavingsFrequency };

/** Meta de ahorro personal (objetivo + lo ahorrado hasta hoy). */
export interface RawGoal {
  id: string;
  memberId: string;
  name: string;
  /** Monto objetivo. */
  target: number;
  /** Ahorrado hasta ahora. */
  saved: number;
  frequency: SavingsFrequency;
  /** Mes límite `YYYY-MM` (opcional). */
  dueMonth?: string;
  createdAt: string;
}

/** Fondo de ahorro automático: un % de lo que sobra cada mes. */
export interface RawFund {
  id: string;
  memberId: string;
  name: string;
  /** Porcentaje de lo disponible (0–100). */
  pct: number;
  note?: string;
}

/* ---------------- Fase 4: cómo se reparte ---------------- */

/**
 * Configuración del reparto del hogar:
 * - `salary`: proporcional al sueldo neto (por defecto).
 * - `equal`: partes iguales.
 * - `manual`: porcentajes por integrante (deben sumar 100).
 * - `fixed`: monto fijo por integrante.
 */
export interface SplitConfig {
  mode: SplitMode;
  /** Porcentajes manuales (0–100) por integrante. */
  manual: Record<string, number>;
  /** Montos fijos en dólares por integrante. */
  fixed: Record<string, number>;
}

export const DEFAULT_SPLIT: SplitConfig = { mode: "salary", manual: {}, fixed: {} };

export interface Household {
  id: string;
  name: string;
  code: string;
  currency: string;
  monthLabel: string;
  totalNet: number;
  totalExpenses: number;
}

/* ---------------- Datos derivados (lo que consume la UI) ---------------- */

/** Un descuento ya aplicado a una persona (para mostrarlo en pantalla). */
export interface PersonDeduction {
  id: string;
  name: string;
  amount: number;
  isLaw: boolean;
  active: boolean;
}

export interface Person {
  id: PersonId;
  userId?: string | null;
  name: string;
  initial: string;
  /** Variable CSS del color de la persona (`--p1`, `--p2`…). */
  color: string;
  isYou?: boolean;
  email?: string;
  gross: number;
  afp: number;
  isss: number;
  isr: number;
  afpOn: boolean;
  isssOn: boolean;
  isrOn: boolean;
  net: number;
  /** Descuentos aplicados a esta persona (de ley y personalizados). */
  deductions: PersonDeduction[];
  /** Total descontado del bruto. */
  deductionTotal: number;
  /** Porcentaje del total de gastos. */
  sharePct: number;
  /** Su parte del total de gastos. */
  shareAmount: number;
  /** Lo que le queda tras pagar su parte. */
  leftover: number;
  /** Detalle gasto por gasto de su parte. */
  shareByExpense: { expenseId: string; amount: number }[];
  memberStatus: string;
  memberTag: string;
  role: MemberRole;
  position: number;
}

export interface Expense {
  id: string;
  name: string;
  icon: ExpenseIcon;
  type: ExpenseType;
  amount: number;
  perDay?: number;
  days?: number;
  color: string;
  colorBg: string;
  memberIds: string[];
}

export interface Activity {
  id: string;
  personId: PersonId;
  icon: ExpenseIcon | "refresh" | "plus";
  text: string;
  detail: string;
}

export interface Snapshot {
  household: Household;
  members: RawMember[];
  incomes: RawIncome[];
  expenses: RawExpense[];
  activity: RawActivity[];
  /** Ingresos extra personales (Fase 3). */
  otherIncomes: RawOtherIncome[];
  /** Metas de ahorro personales (Fase 3). */
  goals: RawGoal[];
  /** Fondos de ahorro automático (Fase 3). */
  funds: RawFund[];
  /** Descuentos configurables del hogar (Fase 4). */
  deductions: Deduction[];
  /** Cómo se reparten los gastos (Fase 4). */
  split: SplitConfig;
  /** Mes activo `YYYY-MM`. */
  month: string;
}

/** Resumen usado por los componentes que no necesitan todo. */
export interface HouseholdData {
  household: Household;
  people: Person[];
  expenses: Expense[];
  activity: Activity[];
  months: string[];
  month: string;
}
