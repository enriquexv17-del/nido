/** Da formato a un número como dinero en dólares: $1,302.62 */
export function formatUSD(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${value < 0 ? "\u2212" : ""}$${abs}`;
}

/** Igual que formatUSD pero sin el signo menos (útil dentro de textos). */
export function formatUSDPlain(value: number): string {
  return `$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/** Da formato a un porcentaje con un decimal: 27.6% */
export function formatPct(value: number): string {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`;
}
