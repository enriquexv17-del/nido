import { useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import type { Variants } from "motion/react";
import { screenBack, screenForward, tabCrossfade } from "./variants";

/** Pestañas principales: entre ellas se hace fundido cruzado. */
const TAB_ROOTS = ["/inicio", "/ingresos", "/gastos", "/reparto", "/mas"];

function isTabRoot(path: string): boolean {
  return TAB_ROOTS.includes(path);
}

/**
 * Decide la transición de pantalla según la dirección lógica:
 * - entre pestañas principales → fundido cruzado con leve desplazamiento vertical;
 * - «atrás» (POP) → entra desde la izquierda;
 * - «adelante» (PUSH/REPLACE) → entra desde la derecha.
 */
export function useScreenTransition(): { key: string; variants: Variants } {
  const location = useLocation();
  const navType = useNavigationType();
  const prev = useRef(location.pathname);

  const from = prev.current;
  const to = location.pathname;
  prev.current = to;

  let variants: Variants;
  if (isTabRoot(from) && isTabRoot(to)) variants = tabCrossfade;
  else if (navType === "POP") variants = screenBack;
  else variants = screenForward;

  return { key: to, variants };
}
