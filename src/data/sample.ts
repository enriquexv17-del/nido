/**
 * Datos de ejemplo para un hogar recién creado.
 *
 * Se comparten entre el modo real (se insertan en Supabase desde `api.ts`) y el
 * modo demostración (se añaden al almacén local desde `mock.dev.ts`). Van en
 * forma de dominio (camelCase), sin `id`: cada lado lo genera a su manera.
 */
import type { RawExpense, RawGoal, RawIncome, RawOtherIncome } from "./types";

/** Gastos típicos del mes (renta, servicios y comida diaria). */
export function sampleExpenses(month: string, memberIds: string[]): Omit<RawExpense, "id">[] {
  return [
    { name: "Renta", icon: "building", type: "monthly", amount: 280, memberIds, month },
    { name: "Luz", icon: "bolt", type: "monthly", amount: 32.5, memberIds, month },
    { name: "Agua", icon: "drop", type: "monthly", amount: 14, memberIds, month },
    { name: "Internet", icon: "wifi", type: "monthly", amount: 25, memberIds, month },
    {
      name: "Comida diaria",
      icon: "utensils",
      type: "daily",
      amount: 180,
      perDay: 6,
      days: 30,
      memberIds,
      month
    }
  ];
}

/** Sueldo de ejemplo con AFP e ISSS encendidos. */
export function sampleIncome(memberId: string, month: string): RawIncome {
  return { memberId, month, gross: 750, afpOn: true, isssOn: true, isrOn: false };
}

/** Ingreso extra personal de ejemplo. */
export function sampleOtherIncome(
  memberId: string,
  month: string
): Omit<RawOtherIncome, "id" | "createdAt"> {
  return {
    memberId,
    month,
    source: "Venta de ejemplo",
    note: "Un trabajo corto para probar",
    amount: 45,
    day: 12
  };
}

/** Meta de ahorro de ejemplo. */
export function sampleGoal(memberId: string): Omit<RawGoal, "id" | "createdAt"> {
  return {
    memberId,
    name: "Fondo de emergencia",
    target: 500,
    saved: 100,
    frequency: "monthly"
  };
}
