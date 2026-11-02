import type { Variants } from "motion/react";
import { DUR, EASE_CINE, STAGGER } from "./tokens";

/** Aparece con fundido. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.normal, ease: EASE_CINE } }
};

/** Sube con fundido (entrada por defecto de tarjetas y filas). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.normal, ease: EASE_CINE } }
};

/** Baja con fundido (avisos que caen desde arriba). */
export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.normal, ease: EASE_CINE } }
};

/** Escala con fundido (diálogos, pop de sellos). */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: DUR.normal, ease: EASE_CINE } }
};

/** Contenedor que escalona a sus hijos. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER, delayChildren: 0.02 } }
};

/** Hijo de un contenedor escalonado. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.normal, ease: EASE_CINE } }
};

/** Entrada de pantalla al avanzar (desde la derecha). */
export const screenForward: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: DUR.normal, ease: EASE_CINE } },
  exit: { opacity: 0, x: -16, transition: { duration: DUR.micro, ease: EASE_CINE } }
};

/** Entrada de pantalla al retroceder (desde la izquierda). */
export const screenBack: Variants = {
  initial: { opacity: 0, x: -24 },
  animate: { opacity: 1, x: 0, transition: { duration: DUR.normal, ease: EASE_CINE } },
  exit: { opacity: 0, x: 16, transition: { duration: DUR.micro, ease: EASE_CINE } }
};

/** Fundido cruzado entre pestañas con un leve desplazamiento vertical. */
export const tabCrossfade: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.normal, ease: EASE_CINE } },
  exit: { opacity: 0, y: -6, transition: { duration: DUR.micro, ease: EASE_CINE } }
};
