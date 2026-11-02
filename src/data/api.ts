/**
 * Capa de acceso a datos. Detrás de una misma interfaz conviven dos modos:
 *
 * - **supabase**: cuando hay `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
 * - **demo**: cuando no las hay; usa `mock.dev.ts` (datos simulados + realtime
 *   entre pestañas con `BroadcastChannel`).
 */
import { mockStore } from "./mock.dev";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { ExpenseIcon, ExpenseType, RawExpense, RawIncome, RawMember, Snapshot } from "./types";

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

  const [householdRes, incomeRes, expenseRes, activityRes] = await Promise.all([
    client.from("households").select("*").eq("id", householdId).single(),
    client.from("income_entries").select("*").eq("month", month),
    client.from("expenses").select("*").eq("month", month).order("created_at", { ascending: true }),
    client
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
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
