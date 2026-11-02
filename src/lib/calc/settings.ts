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
export const TAX_SOURCE_NOTE = "Valores de referencia 2026.";
