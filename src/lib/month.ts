/** Utilidades de mes. Los meses se manejan como `YYYY-MM`. */

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

/** «2026-11» → «Noviembre 2026» */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTHS_ES[m - 1]} ${year}`;
}

/** «2026-11» → «Nov» */
export function shortMonth(month: string): string {
  const [, m] = month.split("-").map(Number);
  return MONTHS_ES[m - 1].slice(0, 3);
}

/** Mes actual en formato `YYYY-MM`. */
export function currentMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Suma (o resta) meses a un `YYYY-MM`. */
export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const total = year * 12 + (m - 1) + delta;
  const y = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${y}-${String(mm).padStart(2, "0")}`;
}

/** Los `count` meses que terminan en `month` (más reciente primero). */
export function recentMonths(month: string, count = 3): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(month, -i));
}
