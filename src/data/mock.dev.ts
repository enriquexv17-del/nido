/**
 * Datos y almacén de prueba de Nido (modo `?dev=1` y desarrollo sin Supabase).
 *
 * Es el equivalente local del backend: guarda un `Snapshot` en memoria (y en
 * `localStorage`), emite cambios a los suscriptores y los replica a otras
 * pestañas con `BroadcastChannel` para simular el tiempo real de Supabase.
 */
import { addMonths } from "../lib/month";
import type { RawExpense, RawIncome, RawMember, Snapshot } from "./types";

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

/* ============================================================
   Almacén
   ============================================================ */

class MockStore {
  private state: Snapshot;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;

  constructor(seed: Snapshot) {
    this.state = this.load() ?? clone(seed);
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
      return raw ? (JSON.parse(raw) as Snapshot) : null;
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
    this.commit({ ...this.state, members, expenses, incomes });
  }

  regenerateCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const part = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    const code = `NIDO-${part}`;
    this.commit({ ...this.state, household: { ...this.state.household, code } });
    return code;
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
