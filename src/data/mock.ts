/** Personas del hogar de prueba. En la Fase 2 vendrán de Supabase. */
export type PersonId = "enrique" | "joaquin" | "jefferson";

/** Iconos de gasto disponibles. */
export type ExpenseIcon =
  | "building"
  | "bolt"
  | "drop"
  | "wifi"
  | "utensils"
  | "wallet";

/** Tipo de gasto: mensual fijo o calculado por día. */
export type ExpenseType = "monthly" | "daily";

export interface Person {
  id: PersonId;
  name: string;
  initial: string;
  /** Variable CSS del color de la persona. */
  color: string;
  /** Etiqueta "tú" para la persona en sesión. */
  isYou?: boolean;
  email?: string;
  /** Sueldo bruto del mes. */
  gross: number;
  /** Descuento AFP (7.25%). */
  afp: number;
  /** Descuento ISSS (3%). */
  isss: number;
  /** Si el descuento está activo para esta persona. */
  afpOn: boolean;
  isssOn: boolean;
  isrOn: boolean;
  /** Sueldo neto. */
  net: number;
  /** Porcentaje del total de gastos. */
  sharePct: number;
  /** Su parte del total de gastos. */
  shareAmount: number;
  /** Lo que le queda tras pagar su parte. */
  leftover: number;
  /** Detalle gasto por gasto de su parte. */
  shareByExpense: { expenseId: string; amount: number }[];
  /** Estado en la lista de integrantes. */
  memberStatus: string;
  memberTag: string;
}

export interface Expense {
  id: string;
  name: string;
  icon: ExpenseIcon;
  type: ExpenseType;
  /** Monto mensual (para "daily" es perDay × days). */
  amount: number;
  perDay?: number;
  days?: number;
  color: string;
  colorBg: string;
}

export interface Activity {
  id: string;
  personId: PersonId;
  icon: ExpenseIcon | "refresh" | "plus";
  text: string;
  detail: string;
}

export interface Household {
  name: string;
  code: string;
  currency: string;
  monthLabel: string;
  totalNet: number;
  totalExpenses: number;
}

/** Colores de cada ícono de gasto. */
export const EXPENSE_ICON_STYLE: Record<ExpenseIcon, { color: string; colorBg: string }> = {
  building: { color: "#2F3FA0", colorBg: "#E7EAFB" },
  bolt: { color: "#A66F00", colorBg: "#FFF1CF" },
  drop: { color: "#1E86C8", colorBg: "#DCEFFB" },
  wifi: { color: "#6A4BD8", colorBg: "#ECE6FD" },
  utensils: { color: "#D5503F", colorBg: "#FDE6E3" },
  wallet: { color: "#0B7C60", colorBg: "#DDF5EC" }
};

/** Colores del selector "Tu color en la app". */
export const COLOR_CHOICES = ["--p1", "--p2", "--p3", "--pk"] as const;

const HOUSEHOLD: Household = {
  name: "Nuestro depa",
  code: "NIDO-7K4Q",
  currency: "US$",
  monthLabel: "Noviembre 2026",
  totalNet: 1302.62,
  totalExpenses: 531.5
};

const PEOPLE: Person[] = [
  {
    id: "enrique",
    name: "Enrique",
    initial: "E",
    color: "--p1",
    isYou: true,
    email: "enrique@correo.com",
    gross: 400,
    afp: 29,
    isss: 12,
    afpOn: true,
    isssOn: true,
    isrOn: false,
    net: 359,
    sharePct: 27.6,
    shareAmount: 146.48,
    leftover: 212.52,
    shareByExpense: [
      { expenseId: "renta", amount: 77.16 },
      { expenseId: "luz", amount: 8.96 },
      { expenseId: "agua", amount: 3.86 },
      { expenseId: "internet", amount: 6.89 },
      { expenseId: "comida", amount: 49.61 }
    ],
    memberStatus: "Administra el hogar",
    memberTag: "Tú"
  },
  {
    id: "joaquin",
    name: "Joaquín",
    initial: "J",
    color: "--p2",
    gross: 550,
    afp: 39.88,
    isss: 16.5,
    afpOn: true,
    isssOn: true,
    isrOn: false,
    net: 493.62,
    sharePct: 37.9,
    shareAmount: 201.41,
    leftover: 292.21,
    shareByExpense: [
      { expenseId: "renta", amount: 106.12 },
      { expenseId: "luz", amount: 12.32 },
      { expenseId: "agua", amount: 5.31 },
      { expenseId: "internet", amount: 9.48 },
      { expenseId: "comida", amount: 68.22 }
    ],
    memberStatus: "Se unió hoy",
    memberTag: "En línea"
  },
  {
    id: "jefferson",
    name: "Jefferson",
    initial: "J",
    color: "--p3",
    gross: 450,
    afp: 0,
    isss: 0,
    afpOn: false,
    isssOn: false,
    isrOn: false,
    net: 450,
    sharePct: 34.5,
    shareAmount: 183.61,
    leftover: 266.39,
    shareByExpense: [
      { expenseId: "renta", amount: 96.6 },
      { expenseId: "luz", amount: 11.21 },
      { expenseId: "agua", amount: 4.83 },
      { expenseId: "internet", amount: 8.63 },
      { expenseId: "comida", amount: 62.1 }
    ],
    memberStatus: "Se unió ayer",
    memberTag: "PC"
  }
];

const EXPENSES: Expense[] = [
  {
    id: "renta",
    name: "Renta",
    icon: "building",
    type: "monthly",
    amount: 280,
    ...EXPENSE_ICON_STYLE.building
  },
  {
    id: "luz",
    name: "Luz",
    icon: "bolt",
    type: "monthly",
    amount: 32.5,
    ...EXPENSE_ICON_STYLE.bolt
  },
  {
    id: "agua",
    name: "Agua",
    icon: "drop",
    type: "monthly",
    amount: 14,
    ...EXPENSE_ICON_STYLE.drop
  },
  {
    id: "internet",
    name: "Internet",
    icon: "wifi",
    type: "monthly",
    amount: 25,
    ...EXPENSE_ICON_STYLE.wifi
  },
  {
    id: "comida",
    name: "Comida diaria",
    icon: "utensils",
    type: "daily",
    amount: 180,
    perDay: 6,
    days: 30,
    ...EXPENSE_ICON_STYLE.utensils
  }
];

const ACTIVITY: Activity[] = [
  {
    id: "a1",
    personId: "joaquin",
    icon: "refresh",
    text: "Joaquín editó Internet",
    detail: "$25.00 · hace 2 min"
  },
  {
    id: "a2",
    personId: "jefferson",
    icon: "plus",
    text: "Jefferson agregó Agua",
    detail: "$14.00 · ayer"
  },
  {
    id: "a3",
    personId: "enrique",
    icon: "wallet",
    text: "Enrique anotó su sueldo",
    detail: "noviembre · lunes"
  }
];

export interface MockData {
  household: Household;
  people: Person[];
  expenses: Expense[];
  activity: Activity[];
}

const MOCK: MockData = {
  household: HOUSEHOLD,
  people: PEOPLE,
  expenses: EXPENSES,
  activity: ACTIVITY
};

/* ---- Hooks de datos (hoy fijos, mañana Supabase) ---- */

export function useHousehold(): Household {
  return MOCK.household;
}

export function usePeople(): Person[] {
  return MOCK.people;
}

export function useExpenses(): Expense[] {
  return MOCK.expenses;
}

export function useActivity(): Activity[] {
  return MOCK.activity;
}

export function useMonths(): string[] {
  return ["Sep", "Oct", "Nov"];
}

export function useCurrentMonth(): string {
  return "Nov";
}

/** Devuelve una persona por id. */
export function getPerson(id: PersonId): Person {
  return MOCK.people.find((p) => p.id === id)!;
}

export { MOCK };
