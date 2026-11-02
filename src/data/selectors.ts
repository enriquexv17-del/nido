/**
 * Selectores: convierten el `Snapshot` crudo en los datos que consume la UI,
 * aplicando el cálculo real (AFP/ISSS/Renta y reparto).
 */
import {
  calcNet,
  calcShares,
  fromCents,
  type CalcExpense
} from "../lib/calc";
import { monthLabel } from "../lib/month";
import {
  EXPENSE_ICON_STYLE,
  type Activity,
  type Expense,
  type Household,
  type Person,
  type Snapshot
} from "./types";

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface DerivedHousehold {
  household: Household;
  people: Person[];
  expenses: Expense[];
  activity: Activity[];
  totals: { netCents: number; expensesCents: number };
}

/** Deriva todo lo que necesita la interfaz a partir del snapshot. */
export function derive(
  snapshot: Snapshot,
  isYouId: string | null,
  mode: "salary" | "equal" = "salary"
): DerivedHousehold {
  const month = snapshot.month;
  const expenses = snapshot.expenses.filter((e) => e.month === month);

  const incomeOf = (memberId: string) =>
    snapshot.incomes.find((i) => i.memberId === memberId && i.month === month);

  const netOf = new Map(
    snapshot.members.map((m) => {
      const inc = incomeOf(m.id);
      return [
        m.id,
        calcNet(
          inc?.gross ?? 0,
          {
            afpOn: inc?.afpOn ?? false,
            isssOn: inc?.isssOn ?? false,
            isrOn: inc?.isrOn ?? false
          }
        )
      ];
    })
  );

  const calcExpenses: CalcExpense[] = expenses.map((e) => ({
    id: e.id,
    type: e.type,
    amount: e.amount,
    perDay: e.perDay,
    days: e.days,
    memberIds: e.memberIds
  }));

  const shares = calcShares(
    calcExpenses,
    snapshot.members.map((m) => ({ id: m.id, netWeight: netOf.get(m.id)?.net ?? 0 })),
    mode
  );

  const totalNetCents = snapshot.members.reduce(
    (sum, m) => sum + Math.round((netOf.get(m.id)?.net ?? 0) * 100),
    0
  );

  const people: Person[] = snapshot.members.map((m) => {
    const inc = incomeOf(m.id);
    const ded = netOf.get(m.id)!;
    const shareCents = shares.byMember[m.id] ?? 0;
    const shareAmount = fromCents(shareCents);
    // Porcentaje real del gasto del hogar que le toca (cambia con el modo de reparto).
    const sharePct =
      shares.totalCents > 0 ? (shareCents / shares.totalCents) * 100 : 0;

    return {
      id: m.id,
      userId: m.userId,
      name: m.name,
      initial: m.name.trim().charAt(0).toUpperCase() || "?",
      color: m.color,
      isYou: m.id === isYouId,
      email: m.email,
      gross: inc?.gross ?? 0,
      afp: ded.afp,
      isss: ded.isss,
      isr: ded.isr,
      afpOn: inc?.afpOn ?? false,
      isssOn: inc?.isssOn ?? false,
      isrOn: inc?.isrOn ?? false,
      net: ded.net,
      sharePct: round1(sharePct),
      shareAmount,
      leftover: round2(ded.net - shareAmount),
      shareByExpense: expenses
        .filter((e) => e.memberIds.includes(m.id))
        .map((e) => ({
          expenseId: e.id,
          amount: fromCents(shares.byExpense[e.id]?.[m.id] ?? 0)
        })),
      memberStatus: m.role === "admin" ? "Administra el hogar" : "Se unió hoy",
      memberTag: m.id === isYouId ? "Tú" : m.userId ? "En línea" : "PC",
      role: m.role,
      position: m.position
    };
  });

  const uiExpenses: Expense[] = expenses.map((e) => ({
    id: e.id,
    name: e.name,
    icon: e.icon,
    type: e.type,
    amount: e.amount,
    perDay: e.perDay,
    days: e.days,
    memberIds: e.memberIds,
    ...EXPENSE_ICON_STYLE[e.icon]
  }));

  const activity: Activity[] = snapshot.activity.map((a) => ({
    id: a.id,
    personId: a.memberId,
    icon: a.icon,
    text: a.text,
    detail: a.detail
  }));

  const household: Household = {
    id: snapshot.household.id,
    name: snapshot.household.name,
    code: snapshot.household.code,
    currency: snapshot.household.currency,
    monthLabel: monthLabel(month),
    totalNet: fromCents(totalNetCents),
    totalExpenses: fromCents(shares.totalCents)
  };

  return {
    household,
    people,
    expenses: uiExpenses,
    activity,
    totals: { netCents: totalNetCents, expensesCents: shares.totalCents }
  };
}
