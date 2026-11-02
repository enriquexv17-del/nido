/**
 * Hooks de datos de Nido. Conservan los nombres de la Fase 1
 * (`useHousehold`, `usePeople`, `useExpenses`…) para que las pantallas no
 * cambien, pero ahora leen del backend real (o del almacén de prueba).
 */
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, shortMonth } from "../lib/month";
import { useAuth } from "./auth";
import { fetchSnapshot } from "./api";
import { DEFAULT_MONTH, useDataContext, useRealtime } from "./provider";
import { derive, type DerivedHousehold } from "./selectors";
import type { Activity, Expense, Household, Person, Snapshot } from "./types";

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
