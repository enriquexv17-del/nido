/**
 * Valores de los descuentos de ley de El Salvador.
 *
 * Fuente de la tabla de Renta (ISR): **Decreto Ejecutivo No. 10 de 2025**,
 * publicado en el Diario Oficial el **30 de abril de 2025** (vigente 8 días
 * después), que elevó a **$550.00** la base mensual sin retención. Tabla
 * confirmada como referencia para 2026 (Ministerio de Hacienda).
 *
 * AFP: 7.25 % del sueldo bruto (Ley Integral del Sistema de Pensiones).
 * ISSS: 3 % del sueldo bruto, con base máxima cotizable de $1,000 → tope $30
 *       mensuales (Instituto Salvadoreño del Seguro Social).
 *
 * Todos estos valores son **editables** desde `app_settings` en la base de
 * datos; aquí solo viven los valores por defecto.
 */

export interface IsrBracket {
  /** Límite inferior de la base gravada (inclusive). */
  from: number;
  /** Límite superior de la base gravada (inclusive); `null` = sin tope. */
  to: number | null;
  /** Tasa aplicada sobre el exceso. */
  rate: number;
  /** Monto a partir del cual se calcula el exceso. */
  over: number;
  /** Cuota fija que se suma en este tramo. */
  fixed: number;
}

export interface TaxSettings {
  /** Tasa de AFP a cargo del trabajador (0.0725 = 7.25 %). */
  afpRate: number;
  /** Tasa de ISSS a cargo del trabajador (0.03 = 3 %). */
  isssRate: number;
  /** Salario máximo cotizable del ISSS (base). */
  isssMaxBase: number;
  /** Tope del descuento de ISSS al mes. */
  isssCap: number;
  /** Tramos mensuales de Renta (ISR). */
  isrBrackets: IsrBracket[];
}

/** Tabla mensual de Renta — Decreto Ejecutivo No. 10 de 2025. */
export const ISR_BRACKETS_2025: IsrBracket[] = [
  { from: 0.01, to: 550.0, rate: 0, over: 0, fixed: 0 },
  { from: 550.01, to: 895.24, rate: 0.1, over: 550.0, fixed: 17.67 },
  { from: 895.25, to: 2038.1, rate: 0.2, over: 895.24, fixed: 60.0 },
  { from: 2038.11, to: null, rate: 0.3, over: 2038.1, fixed: 288.57 }
];

export const TAX_SETTINGS: TaxSettings = {
  afpRate: 0.0725,
  isssRate: 0.03,
  isssMaxBase: 1000,
  isssCap: 30,
  isrBrackets: ISR_BRACKETS_2025
};

/** Nota que se muestra en la pantalla «Descuentos de ley». */
export const TAX_SOURCE_NOTE = "Valores revisados en nov 2026; confirma con Hacienda o tu patrono.";

/* ============================================================
   Descuentos editables (Fase 4)
   ============================================================ */

/**
 * Tipo de descuento:
 * - `percent`: un porcentaje del bruto (con base máxima y/o tope opcionales).
 * - `fixed`: un monto fijo mensual (préstamo, seguro privado, pensión...).
 * - `bracket`: tabla progresiva por tramos (como la Renta).
 */
export type DeductionType = "percent" | "fixed" | "bracket";

/** Un tramo de una tabla progresiva (comparte forma con `IsrBracket`). */
export type DeductionBracket = IsrBracket;

/** Descuento configurable del hogar (de ley o personalizado). */
export interface Deduction {
  id: string;
  /** Clave estable para los descuentos de ley: `afp` | `isss` | `isr`. */
  key?: string;
  name: string;
  type: DeductionType;
  /** Tasa (0.0725 = 7.25 %) si es `percent`, o monto en dólares si es `fixed`. */
  value: number;
  /** Base máxima sobre la que se aplica el porcentaje (opcional). */
  maxBase?: number;
  /** Tope del descuento en dólares (opcional). */
  cap?: number;
  /** Si está encendido. */
  active: boolean;
  /** `true` para AFP/ISSS/Renta; `false` para los personalizados. */
  isLaw: boolean;
  /** Orden de cálculo (ascendente). */
  order: number;
  /** Tramos, solo para `type === "bracket"`. */
  brackets?: DeductionBracket[];
  /** Marca «verificar» (p. ej. el tope cotizable de la AFP). */
  verify?: boolean;
}

/**
 * Valores por defecto de los descuentos.
 *
 * AFP: 7.25 % con tope cotizable de $7,045.06 (marcado «verificar»).
 * ISSS: 3 % con base máxima $1,000 → tope $30 al mes.
 * Renta (ISR): tabla mensual del Decreto Ejecutivo No. 10 de 2025.
 */
export const DEFAULT_DEDUCTIONS: Deduction[] = [
  {
    id: "law-afp",
    key: "afp",
    name: "AFP · pensión",
    type: "percent",
    value: 0.0725,
    maxBase: 7045.06,
    active: true,
    isLaw: true,
    order: 1,
    verify: true
  },
  {
    id: "law-isss",
    key: "isss",
    name: "ISSS · seguro social",
    type: "percent",
    value: 0.03,
    maxBase: 1000,
    cap: 30,
    active: true,
    isLaw: true,
    order: 2
  },
  {
    id: "law-isr",
    key: "isr",
    name: "Renta (ISR)",
    type: "bracket",
    value: 0,
    active: true,
    isLaw: true,
    order: 3,
    brackets: ISR_BRACKETS_2025.map((b) => ({ ...b }))
  }
];

/** Copia profunda de los descuentos de ley por defecto. */
export function lawDefaults(): Deduction[] {
  return DEFAULT_DEDUCTIONS.map((d) => ({
    ...d,
    brackets: d.brackets?.map((b) => ({ ...b }))
  }));
}

