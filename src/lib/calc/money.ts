/**
 * Utilidades de dinero del cálculo de Nido. Todo se maneja en **centavos
 * enteros** para que las sumas sean exactas.
 */

/** Convierte dólares a centavos enteros. */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

/** Convierte centavos enteros a dólares. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Redondea a 2 decimales evitando el error de coma flotante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Reparte `totalCents` entre varios pesos con el **método del mayor resto**.
 * El resultado siempre suma exactamente `totalCents`.
 */
export function largestRemainder(totalCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    // Sin pesos: reparto igual, también con mayor resto.
    return largestRemainder(totalCents, weights.map(() => 1));
  }

  const exact = weights.map((w) => (totalCents * w) / total);
  const out = exact.map((v) => Math.floor(v + 1e-9));
  let rest = totalCents - out.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v + 1e-9) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  let k = 0;
  while (rest > 0 && order.length > 0) {
    out[order[k % order.length].i] += 1;
    k += 1;
    rest -= 1;
  }
  return out;
}
