/**
 * Tokens de movimiento de Nido.
 *
 * Un único lugar para duraciones, curvas y resortes. Nada de números mágicos
 * sueltos en los componentes. Todas las animaciones respetan
 * `prefers-reduced-motion` (ver `MotionRoot`).
 *
 * Regla de rendimiento: solo se animan `transform` y `opacity` (y `filter` en
 * elementos pequeños). Nunca `width`, `height`, `top`, `left`, `margin` ni
 * sombras grandes.
 */

/** Duraciones en segundos (las que espera `motion`). */
export const DUR = {
  /** Micro-interacciones: presión de botones, chips, chevrons. */
  micro: 0.16,
  /** Animaciones normales: entradas de tarjetas, cambios de estado. */
  normal: 0.32,
  /** Escenas: bienvenida, transiciones de pantalla completa. */
  scene: 0.6
} as const;

/** Duraciones en milisegundos (las que espera CSS). */
export const DUR_MS = {
  micro: 160,
  normal: 320,
  scene: 600
} as const;

/** Curva principal «cine»: entrada suave con desaceleración larga. */
export const EASE_CINE = [0.22, 1, 0.36, 1] as const;

/** Curva de salida rápida para elementos que se van. */
export const EASE_OUT = [0.4, 0, 1, 1] as const;

/** Resorte de interfaz: se asienta sin rebote exagerado. */
export const SPRING_UI = { type: "spring", stiffness: 320, damping: 30 } as const;

/** Resorte pesado para hojas y tarjetas grandes. */
export const SPRING_HEAVY = { type: "spring", stiffness: 220, damping: 28 } as const;

/** Resorte con un poco de vida para pop de chips y sellos. */
export const SPRING_POP = { type: "spring", stiffness: 480, damping: 22 } as const;

/** Escalonado entre elementos de una lista (segundos). */
export const STAGGER = 0.05;

/** Fundido simple usado cuando el usuario pide menos movimiento. */
export const REDUCED = {
  duration: 0.12,
  ease: "linear"
} as const;
