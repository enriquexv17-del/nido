/**
 * Punto único de entrada a la capa de datos de Nido.
 *
 * Las pantallas y componentes importan de aquí (`../data`), nunca de los
 * módulos internos. Mantiene los mismos nombres y formas que la Fase 1
 * (`useHousehold`, `usePeople`, `Person`, `Expense`...) para que la interfaz no
 * cambie; por dentro ahora son datos reales (Supabase) o el almacén de prueba.
 */
import { MOCK_SEED, mockStore } from "./mock.dev";
import { derive } from "./selectors";
import type { Person, PersonId } from "./types";

/* ---------------- Tipos ---------------- */

export type {
  PersonId,
  Person,
  Expense,
  Activity,
  Household,
  HouseholdData,
  Snapshot,
  ExpenseIcon,
  ExpenseType,
  MemberRole,
  ColorChoice,
  RawMember,
  RawIncome,
  RawExpense,
  RawActivity
} from "./types";

export type { DerivedHousehold } from "./selectors";

/* ---------------- Constantes ---------------- */

export { EXPENSE_ICON_STYLE, COLOR_CHOICES, ICON_OPTIONS } from "./types";

/* ---------------- Proveedores ---------------- */

export { NidoProvider, useDataContext, DEFAULT_MONTH } from "./provider";
export { AuthProvider, useAuth } from "./auth";

/* ---------------- Consultas (mismos nombres que la Fase 1) ---------------- */

export {
  useHousehold,
  usePeople,
  usePeopleMode,
  useExpenses,
  useActivity,
  useMonths,
  useCurrentMonth,
  useDataStatus,
  useDerived,
  useSnapshot,
  RealtimeBridge
} from "./queries";

export type { DataStatus } from "./queries";

/* ---------------- Acciones ---------------- */

export {
  useExpenseActions,
  useIncomeActions,
  useMemberActions,
  useCopyMonth,
  useHouseholdSetup
} from "./mutations";

export { previewHousehold } from "./api";

export type { ExpenseInput } from "./api";

export { derive };

/* ---------------- Ayudas ---------------- */

/**
 * Devuelve una persona por id a partir de los datos de prueba. Se conserva
 * desde la Fase 1 por compatibilidad; en la app la persona actual viene de
 * `useSession()`.
 */
export function getPerson(id: PersonId): Person {
  const { people } = derive(MOCK_SEED, null);
  return people.find((p) => p.id === id) ?? people[0];
}

/** Restaura los datos de ejemplo del modo demostración (para pruebas). */
export function resetDemoData(): void {
  mockStore().reset();
}
