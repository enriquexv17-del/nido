/**
 * Punto único de entrada al sistema de movimiento de Nido.
 * Los componentes importan de aquí, no de `motion/react` directamente.
 */
export * from "./tokens";
export * from "./variants";
export { MotionRoot } from "./MotionRoot";

export {
  m,
  AnimatePresence,
  MotionConfig,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useInView,
  useAnimationFrame,
  animate,
  type Variants,
  type Transition,
  type MotionValue,
  type PanInfo
} from "motion/react";
