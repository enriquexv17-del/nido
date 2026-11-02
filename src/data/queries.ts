/**
 * Hooks de datos de Nido. Conservan los nombres de la Fase 1
 * (`useHousehold`, `usePeople`, `useExpenses`…) para que las pantallas no
 * cambien, pero ahora leen del backend real (o del almacén de prueba).
 */
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, shortMonth } from "../lib/month";
import { availableToSave, distributeFunds, round2, type FundSlice } from "../lib/calc";
import { useAuth } from "./auth";
import { fetchSnapshot } from "./api";
import { DEFAULT_MONTH, useDataContext, useRealtime } from "./provider";
import { derive, type DerivedHousehold } from "./selectors";
import type {
  Activity,
  Expense,
  Household,
  Person,
  RawFund,
  RawGoal,
  RawOtherIncome,
  Snapshot
} from "./types";

const EMPTY_HOUSEHOLD: Household = {
  id: "",
  name: "",
  code: "",
  currency: "US$",
  monthLabel: "",
  totalNet: 0,
  totalExpenses: 0
};

export type DataStatus = "loading" | "ready" | "error" | "empty";

/** Suscripción única a los cambios en tiempo real. */
export function RealtimeBridge() {
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["snapshot"] });
  }, [qc]);
  useRealtime(invalidate);
  return null;
}

export function useSnapshot() {
  const { month } = useDataContext();
  return useQuery<Snapshot>({
    queryKey: ["snapshot", month],
    queryFn: () => fetchSnapshot(month)
  });
}

function useIsYouId(snapshot: Snapshot | undefined): string | null {
  const { user } = useAuth();
  return useMemo(() => {
    if (!snapshot) return null;
    return (
      snapshot.members.find((m) => m.userId && m.userId === user?.id)?.id ??
      snapshot.members[0]?.id ??
      null
    );
  }, [snapshot, user]);
}

export interface DerivedState {
  data: DerivedHousehold | null;
  snapshot: Snapshot | undefined;
  status: DataStatus;
}

export function useDerived(): DerivedState {
  const query = useSnapshot();
  const isYouId = useIsYouId(query.data);
  const data = useMemo(
    () => (query.data ? derive(query.data, isYouId) : null),
    [query.data, isYouId]
  );

  let status: DataStatus = "loading";
  if (query.isError) status = "error";
  else if (data && data.people.length === 0) status = "empty";
  else if (data) status = "ready";

  return { data, snapshot: query.data, status };
}

const EMPTY: DerivedHousehold | null = null;

export function useHousehold(): Household {
  return useDerived().data?.household ?? EMPTY_HOUSEHOLD;
}

export function usePeople(): Person[] {
  return useDerived().data?.people ?? [];
}

/**
 * Personas con el reparto calculado en el modo indicado. Permite que la
 * pantalla de Reparto recuente con el cálculo real al alternar
 * «Según sueldo» / «Partes iguales».
 */
export function usePeopleMode(mode: "salary" | "equal"): Person[] {
  const query = useSnapshot();
  const isYouId = useIsYouId(query.data);
  return useMemo(
    () => (query.data ? derive(query.data, isYouId, mode).people : []),
    [query.data, isYouId, mode]
  );
}

export function useExpenses(): Expense[] {
  return useDerived().data?.expenses ?? [];
}

export function useActivity(): Activity[] {
  return useDerived().data?.activity ?? [];
}

/**
 * Meses navegables, del más viejo al más nuevo, anclados al mes por defecto
 * (no al mes seleccionado). Así la fila de meses es estable: elegir octubre no
 * reemplaza la lista, solo cambia cuál aparece activo.
 */
export function useMonths(): string[] {
  return useMemo(() => {
    const list: string[] = [];
    for (let i = 2; i >= 0; i--) list.push(addMonths(DEFAULT_MONTH, -i));
    return list;
  }, []);
}

/** Mes activo (`YYYY-MM`) y su setter, para navegar entre meses. */
export function useMonth(): { month: string; setMonth: (month: string) => void } {
  const { month, setMonth } = useDataContext();
  return { month, setMonth };
}

export function useCurrentMonth(): string {
  const { month } = useDataContext();
  return shortMonth(month);
}

/* ---------------- Fase 3: ingresos extra y ahorro personal ---------------- */

/** Ingresos extra del **mes activo** (son personales). */
export function useOtherIncomes(): RawOtherIncome[] {
  const { month } = useDataContext();
  const snapshot = useSnapshot().data;
  return useMemo(
    () => (snapshot?.otherIncomes ?? []).filter((o) => o.month === month),
    [snapshot, month]
  );
}

/** Metas de ahorro de la persona actual. */
export function useGoals(): RawGoal[] {
  const snapshot = useSnapshot().data;
  const memberId = useIsYouId(snapshot);
  return useMemo(
    () => (snapshot?.goals ?? []).filter((g) => g.memberId === memberId),
    [snapshot, memberId]
  );
}

/** Fondos de ahorro automático de la persona actual. */
export function useFunds(): RawFund[] {
  const snapshot = useSnapshot().data;
  const memberId = useIsYouId(snapshot);
  return useMemo(
    () => (snapshot?.funds ?? []).filter((f) => f.memberId === memberId),
    [snapshot, memberId]
  );
}

export interface SavingSummary {
  /** Sueldo neto personal. */
  net: number;
  /** Total de ingresos extra del mes. */
  extra: number;
  /** Su parte de los gastos del hogar. */
  share: number;
  /** Lo que queda disponible para ahorrar. */
  available: number;
  /** Reparto de lo disponible entre fondos. */
  distribution: FundSlice[];
  /** Total que se va a ahorro. */
  totalSaved: number;
  /** Lo que queda libre después de ahorrar. */
  free: number;
}

/**
 * Resumen del ahorro personal: lo disponible y cómo se reparte entre fondos.
 * No altera el reparto del hogar: usa el neto y la parte ya calculados.
 */
export function useSavingSummary(): SavingSummary {
  const { data } = useDerived();
  const otherIncomes = useOtherIncomes();
  const funds = useFunds();

  return useMemo(() => {
    const you = data?.people.find((p) => p.isYou) ?? data?.people[0];
    const net = you?.net ?? 0;
    const share = you?.shareAmount ?? 0;
    const extra = round2(otherIncomes.reduce((a, o) => a + o.amount, 0));
    const available = availableToSave({ net, share, otherIncomes: extra });
    const distribution = distributeFunds(
      available,
      funds.map((f) => ({ id: f.id, pct: f.pct }))
    );
    const totalSaved = round2(distribution.reduce((a, d) => a + d.amount, 0));
    return { net, extra, share, available, distribution, totalSaved, free: round2(available - totalSaved) };
  }, [data, otherIncomes, funds]);
}

export function useRefresh(): () => void {
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["snapshot"] });
  }, [qc]);
}

/** Estado de la carga de datos, para los esqueletos y avisos. */
export function useDataStatus(): DataStatus {
  return useDerived().status;
}

export { EMPTY };
