import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domMax } from "motion/react";

/**
 * Envuelve la app con la configuración de movimiento de Nido.
 *
 * - `LazyMotion` carga las funciones de animación en un paquete aparte y usa
 *   el proxy `m` (más liviano que `motion`). Usamos `domMax` porque el diseño
 *   necesita animaciones de **layout** (transiciones compartidas y listas que
 *   se reacomodan), que `domAnimation` no incluye.
 * - `MotionConfig reducedMotion="user"` respeta `prefers-reduced-motion`:
 *   si está activo, `motion` deja de mover y solo hace fundidos.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
