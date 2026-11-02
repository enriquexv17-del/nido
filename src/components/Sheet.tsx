import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./Button";
import {
  AnimatePresence,
  DUR,
  EASE_OUT,
  m,
  REDUCED,
  SPRING_HEAVY,
  useDragControls,
  useReducedMotion,
  type PanInfo
} from "../motion";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Hoja inferior. Entra con un resorte pesado y el fondo aparece con un
 * fundido; se puede arrastrar hacia abajo para cerrar (con inercia). Solo se
 * animan `transform` y `opacity`.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const reduced = useReducedMotion();
  const controls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /** Si se arrastra lo suficiente hacia abajo, se cierra. */
  function onDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.y > 90 || info.velocity.y > 500) onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          key="overlay"
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.normal }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <m.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.22, ease: EASE_OUT } }}
            transition={reduced ? REDUCED : SPRING_HEAVY}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            dragMomentum={false}
            dragDirectionLock
            onDragEnd={onDragEnd}
          >
            <div
              className="sheet-grab"
              onPointerDown={(e) => controls.start(e)}
            >
              <span className="sheet-handle" aria-hidden="true" />
              <div className="sheet-head">
                <h2 className="sheet-title">{title}</h2>
                <IconButton label="Cerrar" onClick={onClose} className="sheet-close">
                  <Icon name="x" size={18} />
                </IconButton>
              </div>
            </div>
            <div className="sheet-body">{children}</div>
            {footer ? <div className="sheet-footer">{footer}</div> : null}
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
