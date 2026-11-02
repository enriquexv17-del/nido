/**
 * Capa de acceso a datos. Detrás de una misma interfaz conviven dos modos:
 *
 * - **supabase**: cuando hay `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
 * - **demo**: cuando no las hay; usa `mock.dev.ts` (datos simulados + realtime
 *   entre pestañas con `BroadcastChannel`).
 */
import { mockStore } from "./mock.dev";
import { isSupabaseConfigured, supabase } from "./supabase";
import { lawDefaults, resetLawDeductions } from "../lib/calc";
import type {
  Deduction,
  ExpenseIcon,
  ExpenseType,
  RawExpense,
  RawFund,
  RawGoal,
  RawIncome,
  RawMember,
  RawOtherIncome,
  SavingsFrequency,
  Snapshot
} from "./types";

export const DATA_MODE: "supabase" | "demo" = isSupabaseConfigured ? "supabase" : "demo";

export interface Actor {
  id: string;
  name: string;
}

const PALETTE = ["--p1", "--p2", "--p3"];

/* ============================================================
   Lectura
   ============================================================ */

export async function fetchSnapshot(month: string): Promise<Snapshot> {
  if (!isSupabaseConfigured || !supabase) {
    return { ...mockStore().get(), month };
  }
  return loadRealSnapshot(month);
}

/* ---------------- Mapeo desde Supabase ---------------- */

type Row = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function bool(v: unknown): boolean {
  return v === true;
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [];
}

async function loadRealSnapshot(month: string): Promise<Snapshot> {
  const client = supabase!;

  const { data: memberRows, error: memberError } = await client.from("members").select("*");
  if (memberError) throw memberError;
  const memberList = (memberRows ?? []) as Row[];
  if (memberList.length === 0) throw new Error("SIN_HOGAR");

  const householdId = str(memberList[0].household_id);

  const [householdRes, incomeRes, expenseRes, activityRes, otherIncomeRes, goalRes, fundRes, deductionRes] =
    await Promise.all([
      client.from("households").select("*").eq("id", householdId).single(),
      client.from("income_entries").select("*").eq("month", month),
      client.from("expenses").select("*").eq("month", month).order("created_at", { ascending: true }),
      client
        .from("activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      client
        .from("other_incomes")
        .select("*")
        .eq("month", month)
        .order("created_at", { ascending: true }),
      client.from("savings_goals").select("*").order("created_at", { ascending: true }),
      client.from("savings_funds").select("*").order("created_at", { ascending: true }),
      client.from("deductions").select("*").order("sort_order", { ascending: true })
    ]);

  const h = (householdRes.data ?? {}) as Row;

  const members: RawMember[] = memberList.map((m) => ({
    id: str(m.id),
    userId: (m.user_id as string | null) ?? null,
    name: str(m.name),
    color: str(m.color) || PALETTE[0],
    role: m.role === "admin" ? "admin" : "member",
    position: num(m.position) || 1
  }));

  const incomes: RawIncome[] = ((incomeRes.data ?? []) as Row[]).map((i) => ({
    memberId: str(i.member_id),
    month: str(i.month),
    gross: num(i.gross),
    afpOn: bool(i.afp_on),
    isssOn: bool(i.isss_on),
    isrOn: bool(i.isr_on)
  }));

  const expenses: RawExpense[] = ((expenseRes.data ?? []) as Row[]).map((e) => ({
    id: str(e.id),
    name: str(e.name),
    icon: str(e.icon) as ExpenseIcon,
    type: str(e.type) as ExpenseType,
    amount: num(e.amount),
    perDay: e.per_day == null ? undefined : num(e.per_day),
    days: e.days == null ? undefined : num(e.days),
    memberIds: arr(e.member_ids),
    month: str(e.month)
  }));

  const activity = ((activityRes.data ?? []) as Row[]).map((a) => ({
    id: str(a.id),
    memberId: str(a.member_id),
    icon: str(a.icon) as RawExpense["icon"],
    text: str(a.text),
    detail: str(a.detail),
    at: str(a.created_at)
  }));

  const otherIncomes: RawOtherIncome[] = ((otherIncomeRes.data ?? []) as Row[])
    .filter((o) => str(o.month) === month)
    .map((o) => ({
      id: str(o.id),
      memberId: str(o.member_id),
      month: str(o.month),
      source: str(o.source),
      note: str(o.note),
      amount: num(o.amount),
      day: o.day == null ? undefined : num(o.day),
      createdAt: str(o.created_at)
    }));

  const goals: RawGoal[] = ((goalRes.data ?? []) as Row[]).map((g) => ({
    id: str(g.id),
    memberId: str(g.member_id),
    name: str(g.name),
    target: num(g.target),
    saved: num(g.saved),
    frequency: (str(g.frequency) as SavingsFrequency) || "monthly",
    dueMonth: str(g.due_month) || undefined,
    createdAt: str(g.created_at)
  }));

  const funds: RawFund[] = ((fundRes.data ?? []) as Row[]).map((f) => ({
    id: str(f.id),
    memberId: str(f.member_id),
    name: str(f.name),
    pct: num(f.pct),
    note: str(f.note) || undefined
  }));

  const deductionRows = (deductionRes.data ?? []) as Row[];
  const deductions: Deduction[] = deductionRows.length
    ? deductionRows.map((d) => ({
        id: str(d.id),
        key: str(d.key) || undefined,
        name: str(d.name),
        type: (str(d.type) as Deduction["type"]) || "percent",
        value: num(d.value),
        maxBase: d.max_base == null ? undefined : num(d.max_base),
        cap: d.cap == null ? undefined : num(d.cap),
        active: d.active !== false,
        isLaw: bool(d.is_law),
        order: num(d.sort_order),
        brackets: Array.isArray(d.brackets)
          ? (d.brackets as NonNullable<Deduction["brackets"]>)
          : undefined,
        verify: bool(d.verify)
      }))
    : lawDefaults();

  return {
    household: {
      id: householdId,
      name: str(h.name) || "Mi hogar",
      code: str(h.code),
      currency: str(h.currency) || "US$",
      monthLabel: "",
      totalNet: 0,
      totalExpenses: 0
    },
    members,
    incomes,
    expenses,
    activity,
    otherIncomes,
    goals,
    funds,
    deductions,
    month
  };
}

/** Datos del hogar para la pantalla de unirse (por código). */
export async function previewHousehold(code: string): Promise<{ name: string; count: number } | null> {
  if (!isSupabaseConfigured || !supabase) {
    const s = mockStore().get();
    if (s.household.code.toUpperCase() !== code.trim().toUpperCase()) return null;
    return { name: s.household.name, count: s.members.length };
  }
  const { data, error } = await supabase.rpc("preview_household", { p_code: code });
  if (error) return null;
  const row = Array.isArray(data) ? (data[0] as Row | undefined) : (data as Row | null);
  if (!row) return null;
  return { name: str(row.name), count: num(row.count) };
}

/* ============================================================
   Escritura
   ============================================================ */

export async function saveIncome(input: {
  memberId: string;
  month: string;
  gross: number;
  afpOn: boolean;
  isssOn: boolean;
  isrOn: boolean;
  actor: Actor;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().updateIncome(
      input.memberId,
      input.month,
      { gross: input.gross, afpOn: input.afpOn, isssOn: input.isssOn, isrOn: input.isrOn },
      input.actor.name,
      input.actor.id
    );
    return;
  }
  const householdId = await getHouseholdId();
  const { error } = await supabase.from("income_entries").upsert(
    {
      household_id: householdId,
      member_id: input.memberId,
      month: input.month,
      gross: input.gross,
      afp_on: input.afpOn,
      isss_on: input.isssOn,
      isr_on: input.isrOn
    },
    { onConflict: "household_id,member_id,month" }
  );
  if (error) throw error;
}

export interface ExpenseInput {
  name: string;
  icon: ExpenseIcon;
  type: ExpenseType;
  amount: number;
  perDay?: number;
  days?: number;
  memberIds: string[];
}

export async function createExpense(input: ExpenseInput, month: string, actor: Actor): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().addExpense({ ...input, month }, actor.name, actor.id);
    return;
  }
  const householdId = await getHouseholdId();
  const { error } = await supabase.from("expenses").insert({
    household_id: householdId,
    name: input.name,
    icon: input.icon,
    type: input.type,
    amount: input.amount,
    per_day: input.perDay ?? null,
    days: input.days ?? null,
    member_ids: input.memberIds,
    month
  });
  if (error) throw error;
}

export async function updateExpense(id: string, patch: ExpenseInput, actor: Actor): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().updateExpense(id, patch, actor.name, actor.id);
    return;
  }
  const { error } = await supabase
    .from("expenses")
    .update({
      name: patch.name,
      icon: patch.icon,
      type: patch.type,
      amount: patch.amount,
      per_day: patch.perDay ?? null,
      days: patch.days ?? null,
      member_ids: patch.memberIds
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteExpense(id: string, actor: Actor): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().deleteExpense(id, actor.name, actor.id);
    return;
  }
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function addMember(name: string, color: string): Promise<RawMember | null> {
  if (!isSupabaseConfigured || !supabase) {
    return mockStore().addMember(name, color);
  }
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from("members")
    .insert({ household_id: householdId, name, color, role: "member" })
    .select("*")
    .single();
  if (error) throw error;
  const m = data as Row;
  return {
    id: str(m.id),
    userId: (m.user_id as string | null) ?? null,
    name: str(m.name),
    color: str(m.color),
    role: "member",
    position: num(m.position)
  };
}

export async function removeMember(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().removeMember(id);
    return;
  }
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}

export async function regenerateCode(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    return mockStore().regenerateCode();
  }
  const { data, error } = await supabase.rpc("regenerate_code");
  if (error) throw error;
  return typeof data === "string" ? data : "";
}

export async function copyMonth(from: string, to: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().copyMonth(from, to);
    return;
  }
  const { error } = await supabase.rpc("copy_month", { p_from: from, p_to: to });
  if (error) throw error;
}

/* ---------------- Fase 3: ingresos extra, metas y fondos ---------------- */

export interface OtherIncomeInput {
  memberId: string;
  month: string;
  source: string;
  note: string;
  amount: number;
  day?: number;
}

export async function createOtherIncome(input: OtherIncomeInput, actor: Actor): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().addOtherIncome(input, actor.name, actor.id);
    return;
  }
  const householdId = await getHouseholdId();
  const { error } = await supabase.from("other_incomes").insert({
    household_id: householdId,
    member_id: input.memberId,
    month: input.month,
    source: input.source,
    note: input.note,
    amount: input.amount,
    day: input.day ?? null
  });
  if (error) throw error;
}

export async function updateOtherIncome(
  id: string,
  patch: OtherIncomeInput,
  actor: Actor
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().updateOtherIncome(id, patch, actor.name, actor.id);
    return;
  }
  const { error } = await supabase
    .from("other_incomes")
    .update({
      source: patch.source,
      note: patch.note,
      amount: patch.amount,
      day: patch.day ?? null
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOtherIncome(id: string, actor: Actor): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().deleteOtherIncome(id, actor.name, actor.id);
    return;
  }
  const { error } = await supabase.from("other_incomes").delete().eq("id", id);
  if (error) throw error;
}

export interface GoalInput {
  memberId: string;
  name: string;
  target: number;
  saved: number;
  frequency: SavingsFrequency;
  dueMonth?: string;
}

export async function createGoal(input: GoalInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().addGoal(input);
    return;
  }
  const householdId = await getHouseholdId();
  const { error } = await supabase.from("savings_goals").insert({
    household_id: householdId,
    member_id: input.memberId,
    name: input.name,
    target: input.target,
    saved: input.saved,
    frequency: input.frequency,
    due_month: input.dueMonth ?? null
  });
  if (error) throw error;
}

export async function updateGoal(id: string, patch: GoalInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().updateGoal(id, patch);
    return;
  }
  const { error } = await supabase
    .from("savings_goals")
    .update({
      name: patch.name,
      target: patch.target,
      saved: patch.saved,
      frequency: patch.frequency,
      due_month: patch.dueMonth ?? null
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().deleteGoal(id);
    return;
  }
  const { error } = await supabase.from("savings_goals").delete().eq("id", id);
  if (error) throw error;
}

export interface FundInput {
  memberId: string;
  name: string;
  pct: number;
  note?: string;
}

export async function createFund(input: FundInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().addFund(input);
    return;
  }
  const householdId = await getHouseholdId();
  const { error } = await supabase.from("savings_funds").insert({
    household_id: householdId,
    member_id: input.memberId,
    name: input.name,
    pct: input.pct,
    note: input.note ?? null
  });
  if (error) throw error;
}

export async function updateFund(id: string, patch: FundInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().updateFund(id, patch);
    return;
  }
  const { error } = await supabase
    .from("savings_funds")
    .update({ name: patch.name, pct: patch.pct, note: patch.note ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteFund(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().deleteFund(id);
    return;
  }
  const { error } = await supabase.from("savings_funds").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Fase 4: descuentos editables ---------------- */

export type DeductionInput = Omit<Deduction, "id">;

export async function createDeduction(input: DeductionInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().addDeduction(input);
    return;
  }
  const householdId = await getHouseholdId();
  const { error } = await supabase.from("deductions").insert({
    household_id: householdId,
    key: input.key ?? null,
    name: input.name,
    type: input.type,
    value: input.value,
    max_base: input.maxBase ?? null,
    cap: input.cap ?? null,
    active: input.active,
    is_law: input.isLaw,
    sort_order: input.order,
    brackets: input.brackets ?? null,
    verify: input.verify ?? false
  });
  if (error) throw error;
}

export async function updateDeduction(id: string, patch: Partial<Deduction>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().updateDeduction(id, patch);
    return;
  }
  const row: Row = {};
  if (patch.key !== undefined) row.key = patch.key;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.value !== undefined) row.value = patch.value;
  if (patch.maxBase !== undefined) row.max_base = patch.maxBase;
  if (patch.cap !== undefined) row.cap = patch.cap;
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.isLaw !== undefined) row.is_law = patch.isLaw;
  if (patch.order !== undefined) row.sort_order = patch.order;
  if (patch.brackets !== undefined) row.brackets = patch.brackets;
  if (patch.verify !== undefined) row.verify = patch.verify;
  const { error } = await supabase.from("deductions").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteDeduction(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockStore().deleteDeduction(id);
    return;
  }
  const { error } = await supabase.from("deductions").delete().eq("id", id);
  if (error) throw error;
}

/** Restablece los valores de ley y devuelve la lista resultante. */
export async function resetLawValues(current: Deduction[]): Promise<Deduction[]> {
  const next = resetLawDeductions(current);
  if (!isSupabaseConfigured || !supabase) {
    mockStore().setDeductions(next);
    return next;
  }
  const householdId = await getHouseholdId();
  for (const d of next.filter((x) => x.isLaw)) {
    const { error } = await supabase.from("deductions").upsert(
      {
        id: d.id,
        household_id: householdId,
        key: d.key ?? null,
        name: d.name,
        type: d.type,
        value: d.value,
        max_base: d.maxBase ?? null,
        cap: d.cap ?? null,
        active: d.active,
        is_law: d.isLaw,
        sort_order: d.order,
        brackets: d.brackets ?? null,
        verify: d.verify ?? false
      },
      { onConflict: "id" }
    );
    if (error) throw error;
  }
  return next;
}

/* ---------------- Hogares ---------------- */

export async function createHousehold(name: string, memberName: string, color: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    return mockStore().createHousehold(name, memberName, color);
  }
  const { data, error } = await supabase.rpc("create_household", {
    p_name: name,
    p_member_name: memberName,
    p_color: color
  });
  if (error) throw error;
  return typeof data === "string" ? data : "";
}

export async function joinHousehold(code: string, memberName: string, color: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    const store = mockStore();
    const existing = store.get().members.find((m) => m.name === memberName);
    if (!existing) {
      const added = store.joinByName(memberName, color);
      if (!added) throw new Error("HOGAR_LLENO");
    }
    return store.get().household.id;
  }
  const { data, error } = await supabase.rpc("join_household", {
    p_code: code,
    p_name: memberName,
    p_color: color
  });
  if (error) throw error;
  return typeof data === "string" ? data : "";
}

/* ---------------- Ayudas ---------------- */

let cachedHouseholdId: string | null = null;

export async function getHouseholdId(): Promise<string> {
  if (cachedHouseholdId) return cachedHouseholdId;
  if (!isSupabaseConfigured || !supabase) {
    cachedHouseholdId = mockStore().get().household.id;
    return cachedHouseholdId;
  }
  const { data, error } = await supabase.from("members").select("household_id").limit(1).single();
  if (error) throw error;
  cachedHouseholdId = str((data as Row).household_id);
  return cachedHouseholdId;
}

export function clearHouseholdCache() {
  cachedHouseholdId = null;
}
