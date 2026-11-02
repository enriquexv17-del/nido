import { useEffect, useRef } from "react";
import { animate, EASE_CINE, useMotionValue, useReducedMotion } from "../motion";

interface CountUpProps {
  value: number;
  format: (value: number) => string;
  className?: string;
  duration?: number;
}

/**
 * Cifra que cuenta desde el valor anterior hasta el nuevo. Escribe el texto
 * directamente en el nodo (sin re-render por fotograma) y respeta
 * `prefers-reduced-motion` mostrando el valor final sin animar.
 */
export function CountUp({ value, format, className = "", duration = 0.6 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduced) {
      motionValue.set(value);
      node.textContent = format(value);
      return;
    }

    const unsubscribe = motionValue.on("change", (current) => {
      node.textContent = format(current);
    });
    const controls = animate(motionValue, value, { duration, ease: EASE_CINE });

    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [value, duration, format, motionValue, reduced]);

  return <span ref={ref} className={className} />;
}