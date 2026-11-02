/**
 * Datos y almacén de prueba de Nido (modo `?dev=1` y desarrollo sin Supabase).
 *
 * Es el equivalente local del backend: guarda un `Snapshot` en memoria (y en
 * `localStorage`), emite cambios a los suscriptores y los replica a otras
 * pestañas con `BroadcastChannel` para simular el tiempo real de Supabase.
 */
import { addMonths } from "../lib/month";
import { lawDefaults } from "../lib/calc";
import { DEFAULT_SPLIT } from "./types";
import type {
  Deduction,
  RawExpense,
  RawFund,
  RawGoal,
  RawIncome,
  RawMember,
  RawOtherIncome,
  Snapshot,
  SplitConfig
} from "./types";

const ALL = ["enrique", "joaquin", "jefferson"];
const M = "2026-11";
const PREV = addMonths(M, -1);
const PREV2 = addMonths(M, -2);

function monthExpenses(month: string): RawExpense[] {
  return [
    { id: `${month}-renta`, name: "Renta", icon: "building", type: "monthly", amount: 280, memberIds: ALL, month },
    { id: `${month}-luz`, name: "Luz", icon: "bolt", type: "monthly", amount: 32.5, memberIds: ALL, month },
    { id: `${month}-agua`, name: "Agua", icon: "drop", type: "monthly", amount: 14, memberIds: ALL, month },
    { id: `${month}-internet`, name: "Internet", icon: "wifi", type: "monthly", amount: 25, memberIds: ALL, month },
    {
      id: `${month}-comida`,
      name: "Comida diaria",
      icon: "utensils",
      type: "daily",
      amount: 180,
      perDay: 6,
      days: 30,
      memberIds: ALL,
      month
    }
  ];
}

function income(memberId: string, month: string, gross: number, deductions: boolean): RawIncome {
  return { memberId, month, gross, afpOn: deductions, isssOn: deductions, isrOn: false };
}

/** Ingreso extra personal de ejemplo (Fase 3). */
function extra(
  id: string,
  month: string,
  source: string,
  note: string,
  amount: number,
  day: number
): RawOtherIncome {
  return {
    id,
    memberId: "enrique",
    month,
    source,
    note,
    amount,
    day,
    createdAt: `${month}-01T00:00:00.000Z`
  };
}

export const MOCK_SEED: Snapshot = {
  household: {
    id: "demo",
    name: "Nuestro depa",
    code: "NIDO-7K4Q",
    currency: "US$",
    monthLabel: "Noviembre 2026",
    totalNet: 0,
    totalExpenses: 0
  },
  members: [
    { id: "enrique", userId: "demo-enrique", name: "Enrique", color: "--p1", role: "admin", position: 1, email: "enrique@correo.com" },
    { id: "joaquin", userId: null, name: "Joaquín", color: "--p2", role: "member", position: 2 },
    { id: "jefferson", userId: null, name: "Jefferson", color: "--p3", role: "member", position: 3 }
  ],
  incomes: [
    income("enrique", M, 400, true),
    income("joaquin", M, 550, true),
    income("jefferson", M, 450, false),
    income("enrique", PREV, 400, true),
    income("joaquin", PREV, 550, true),
    income("jefferson", PREV, 400, false),
    income("enrique", PREV2, 380, true),
    income("joaquin", PREV2, 500, true),
    income("jefferson", PREV2, 400, false)
  ],
  expenses: [...monthExpenses(M), ...monthExpenses(PREV), ...monthExpenses(PREV2)],
  activity: [
    { id: "a1", memberId: "joaquin", icon: "refresh", text: "Joaquín editó Internet", detail: "$25.00 · hace 2 min", at: new Date().toISOString() },
    { id: "a2", memberId: "jefferson", icon: "plus", text: "Jefferson agregó Agua", detail: "$14.00 · ayer", at: new Date().toISOString() },
    { id: "a3", memberId: "enrique", icon: "wallet", text: "Enrique anotó su sueldo", detail: "noviembre · lunes", at: new Date().toISOString() }
  ],
  otherIncomes: [
    extra("oi-m1", M, "Marca de ropa", "Venta de 3 camisas", 60, 12),
    extra("oi-m2", M, "Edición de video", "Reel para cafetería", 45, 20),
    extra("oi-p1", PREV, "Marca de ropa", "Pedido de gorras", 35, 8)
  ],
  goals: [
    {
      id: "g1",
      memberId: "enrique",
      name: "Teléfono nuevo",
      target: 300,
      saved: 90,
      frequency: "monthly",
      dueMonth: "2027-02",
      createdAt: `${M}-01T00:00:00.000Z`
    },
    {
      id: "g2",
      memberId: "enrique",
      name: "Fondo de emergencia",
      target: 500,
      saved: 120,
      frequency: "monthly",
      dueMonth: "2027-06",
      createdAt: `${M}-01T00:00:00.000Z`
    }
  ],
  funds: [
    { id: "f1", memberId: "enrique", name: "Fondo de emergencia", pct: 40 },
    { id: "f2", memberId: "enrique", name: "Seguro de vida", pct: 20 },
    { id: "f3", memberId: "enrique", name: "Marca de ropa", pct: 40 }
  ],
  deductions: lawDefaults(),
  split: { ...DEFAULT_SPLIT },
  month: M
};

const STORAGE_KEY = "nido.demo.v2";
const CHANNEL = "nido-demo";

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Completa los campos de la Fase 3 (`otherIncomes`, `goals`, `funds`) cuando el
 * snapshot viene de datos guardados antes de la actualización. Así no se pierde
 * lo que el usuario ya tenía en el almacén local.
 */
function normalize(s: Snapshot): Snapshot {
  return {
    ...s,
    otherIncomes: s.otherIncomes ?? [],
    goals: s.goals ?? [],
    funds: s.funds ?? [],
    deductions: s.deductions?.length ? s.deductions : lawDefaults(),
    split: s.split ?? { ...DEFAULT_SPLIT }
  };
}

/* ============================================================
   Almacén
   ============================================================ */

class MockStore {
  private state: Snapshot;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;

  constructor(seed: Snapshot) {
    this.state = this.load() ?? normalize(clone(seed));
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = () => {
        const stored = this.load();
        if (stored) {
          this.state = stored;
          this.emit();
        }
      };
    }
  }

  private load(): Snapshot | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw) as Snapshot) : null;
    } catch {
      return null;
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* sin almacenamiento: seguimos en memoria */
    }
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  /** Aplica un cambio, lo persiste y avisa a todos. */
  private commit(next: Snapshot) {
    this.state = next;
    this.persist();
    this.emit();
    this.channel?.postMessage({ t: "change" });
  }

  get(): Snapshot {
    return this.state;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private pushActivity(s: Snapshot, memberId: string, icon: RawExpense["icon"] | "refresh" | "plus", text: string, detail: string): Snapshot {
    const entry = { id: uid(), memberId, icon, text, detail, at: new Date().toISOString() };
    return { ...s, activity: [entry, ...s.activity].slice(0, 20) };
  }

  /* ---------------- Gastos ---------------- */

  addExpense(input: Omit<RawExpense, "id">, actorName: string, actorId: string) {
    const expense: RawExpense = { ...input, id: uid() };
    let s: Snapshot = { ...this.state, expenses: [...this.state.expenses, expense] };
    s = this.pushActivity(s, actorId, "plus", `${actorName} agregó ${expense.name}`, `$${expense.amount.toFixed(2)} · ahora`);
    this.commit(s);
  }

  updateExpense(id: string, patch: Partial<RawExpense>, actorName: string, actorId: string) {
    const current = this.state.expenses.find((e) => e.id === id);
    let s: Snapshot = {
      ...this.state,
      expenses: this.state.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e))
    };
    if (current) {
      const amount = patch.amount ?? current.amount;
      s = this.pushActivity(s, actorId, "refresh", `${actorName} editó ${current.name}`, `$${amount.toFixed(2)} · ahora`);
    }
    this.commit(s);
  }

  deleteExpense(id: string, actorName: string, actorId: string) {
    const current = this.state.expenses.find((e) => e.id === id);
    let s: Snapshot = { ...this.state, expenses: this.state.expenses.filter((e) => e.id !== id) };
    if (current) {
      s = this.pushActivity(s, actorId, "wallet", `${actorName} eliminó ${current.name}`, `ahora`);
    }
    this.commit(s);
  }

  /* ---------------- Sueldos ---------------- */

  updateIncome(memberId: string, month: string, patch: Partial<RawIncome>, actorName: string, actorId: string) {
    const exists = this.state.incomes.some((i) => i.memberId === memberId && i.month === month);
    const incomes = exists
      ? this.state.incomes.map((i) => (i.memberId === memberId && i.month === month ? { ...i, ...patch } : i))
      : [...this.state.incomes, { memberId, month, gross: 0, afpOn: false, isssOn: false, isrOn: false, ...patch }];
    let s: Snapshot = { ...this.state, incomes };
    s = this.pushActivity(s, actorId, "wallet", `${actorName} anotó su sueldo`, `$${(patch.gross ?? 0).toFixed(2)} · ahora`);
    this.commit(s);
  }

  /** Copia los sueldos del mes `from` al mes `to` (reemplaza los del destino). */
  copyMonth(from: string, to: string) {
    const source = this.state.incomes.filter((i) => i.month === from);
    const sourceByMember = new Map(source.map((i) => [i.memberId, i]));
    const rest = this.state.incomes.filter((i) => i.month !== to);
    const currentTo = this.state.incomes.filter((i) => i.month === to);

    const nextTo = currentTo
      .filter((i) => sourceByMember.has(i.memberId))
      .map((i) => {
        const src = sourceByMember.get(i.memberId)!;
        return { ...i, gross: src.gross, afpOn: src.afpOn, isssOn: src.isssOn, isrOn: src.isrOn };
      });

    const toMembers = new Set(currentTo.map((i) => i.memberId));
    for (const src of source) {
      if (!toMembers.has(src.memberId)) nextTo.push({ ...src, month: to });
    }

    this.commit({ ...this.state, incomes: [...rest, ...nextTo] });
  }

  /* ---------------- Otros ingresos (Fase 3) ---------------- */

  addOtherIncome(input: Omit<RawOtherIncome, "id" | "createdAt">, actorName: string, actorId: string) {
    const entry: RawOtherIncome = { ...input, id: uid(), createdAt: new Date().toISOString() };
    let s: Snapshot = { ...this.state, otherIncomes: [...this.state.otherIncomes, entry] };
    s = this.pushActivity(s, actorId, "plus", `${actorName} agregó ${entry.source}`, `$${entry.amount.toFixed(2)} · ahora`);
    this.commit(s);
  }

  updateOtherIncome(id: string, patch: Partial<RawOtherIncome>, actorName: string, actorId: string) {
    const current = this.state.otherIncomes.find((x) => x.id === id);
    let s: Snapshot = {
      ...this.state,
      otherIncomes: this.state.otherIncomes.map((x) => (x.id === id ? { ...x, ...patch } : x))
    };
    if (current) {
      const amount = patch.amount ?? current.amount;
      s = this.pushActivity(s, actorId, "refresh", `${actorName} editó ${current.source}`, `$${amount.toFixed(2)} · ahora`);
    }
    this.commit(s);
  }

  deleteOtherIncome(id: string, actorName: string, actorId: string) {
    const current = this.state.otherIncomes.find((x) => x.id === id);
    let s: Snapshot = { ...this.state, otherIncomes: this.state.otherIncomes.filter((x) => x.id !== id) };
    if (current) s = this.pushActivity(s, actorId, "wallet", `${actorName} eliminó ${current.source}`, "ahora");
    this.commit(s);
  }

  /* ---------------- Metas de ahorro (Fase 3) ---------------- */

  addGoal(input: Omit<RawGoal, "id" | "createdAt">) {
    const goal: RawGoal = { ...input, id: uid(), createdAt: new Date().toISOString() };
    this.commit({ ...this.state, goals: [...this.state.goals, goal] });
  }

  updateGoal(id: string, patch: Partial<RawGoal>) {
    this.commit({
      ...this.state,
      goals: this.state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g))
    });
  }

  deleteGoal(id: string) {
    this.commit({ ...this.state, goals: this.state.goals.filter((g) => g.id !== id) });
  }

  /* ---------------- Fondos de ahorro (Fase 3) ---------------- */

  addFund(input: Omit<RawFund, "id">) {
    this.commit({ ...this.state, funds: [...this.state.funds, { ...input, id: uid() }] });
  }

  updateFund(id: string, patch: Partial<RawFund>) {
    this.commit({
      ...this.state,
      funds: this.state.funds.map((f) => (f.id === id ? { ...f, ...patch } : f))
    });
  }

  deleteFund(id: string) {
    this.commit({ ...this.state, funds: this.state.funds.filter((f) => f.id !== id) });
  }

  /* ---------------- Descuentos (Fase 4) ---------------- */

  addDeduction(input: Omit<Deduction, "id">) {
    const deduction: Deduction = { ...input, id: uid() };
    this.commit({ ...this.state, deductions: [...this.state.deductions, deduction] });
  }

  updateDeduction(id: string, patch: Partial<Deduction>) {
    this.commit({
      ...this.state,
      deductions: this.state.deductions.map((d) => (d.id === id ? { ...d, ...patch } : d))
    });
  }

  deleteDeduction(id: string) {
    this.commit({ ...this.state, deductions: this.state.deductions.filter((d) => d.id !== id) });
  }

  setDeductions(deductions: Deduction[]) {
    this.commit({ ...this.state, deductions });
  }

  setSplit(split: SplitConfig) {
    this.commit({ ...this.state, split });
  }

  /* ---------------- Integrantes ---------------- */

  addMember(name: string, color: string): RawMember | null {
    if (this.state.members.length >= 3) return null;
    const used = new Set(this.state.members.map((m) => m.color));
    const palette = ["--p1", "--p2", "--p3"].filter((c) => !used.has(c));
    const finalColor = used.has(color) ? palette[0] ?? color : color;
    const member: RawMember = {
      id: uid(),
      userId: null,
      name,
      color: finalColor,
      role: "member",
      position: this.state.members.length + 1
    };
    this.commit({ ...this.state, members: [...this.state.members, member] });
    return member;
  }

  removeMember(id: string) {
    const members = this.state.members.filter((m) => m.id !== id).map((m, i) => ({ ...m, position: i + 1 }));
    const expenses = this.state.expenses.map((e) => ({ ...e, memberIds: e.memberIds.filter((x) => x !== id) }));
    const incomes = this.state.incomes.filter((i) => i.memberId !== id);
    const otherIncomes = this.state.otherIncomes.filter((o) => o.memberId !== id);
    const goals = this.state.goals.filter((g) => g.memberId !== id);
    const funds = this.state.funds.filter((f) => f.memberId !== id);
    this.commit({ ...this.state, members, expenses, incomes, otherIncomes, goals, funds });
  }

  private newCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const part = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    return `NIDO-${part}`;
  }

  regenerateCode(): string {
    const code = this.newCode();
    this.commit({ ...this.state, household: { ...this.state.household, code } });
    return code;
  }

  /** Crea un hogar nuevo (modo demostración): deja solo a quien lo crea. */
  createHousehold(name: string, memberName: string, color: string): string {
    const member: RawMember = {
      id: uid(),
      userId: "demo-enrique",
      name: memberName.trim() || "Yo",
      color: color || "--p1",
      role: "admin",
      position: 1,
      email: "enrique@correo.com"
    };
    this.commit({
      ...this.state,
      household: {
        id: uid(),
        name: name.trim() || "Mi hogar",
        code: this.newCode(),
        currency: "US$",
        monthLabel: "",
        totalNet: 0,
        totalExpenses: 0
      },
      members: [member],
      incomes: [],
      expenses: [],
      activity: [],
      otherIncomes: [],
      goals: [],
      funds: [],
      deductions: lawDefaults(),
      split: { ...DEFAULT_SPLIT }
    });
    return this.state.household.id;
  }
  /** Une a una persona «solo con su nombre». Devuelve `null` si está lleno. */
  joinByName(name: string, color: string): RawMember | null {
    return this.addMember(name, color);
  }

  setMonth(month: string) {
    this.commit({ ...this.state, month });
  }

  reset() {
    this.commit(clone(MOCK_SEED));
  }
}

let store: MockStore | null = null;

export function mockStore(): MockStore {
  if (!store) store = new MockStore(MOCK_SEED);
  return store;
}

export type { MockStore };
