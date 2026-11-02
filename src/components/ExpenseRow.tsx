import { useState } from "react";
import { Icon } from "./Icon";
import { IconSquare } from "./IconSquare";
import { formatUSD } from "../lib/format";
import {
  animate,
  m,
  SPRING_UI,
  useMotionValue,
  useReducedMotion,
  type PanInfo
} from "../motion";
import type { Expense } from "../data";

const ACTION_WIDTH = 138;

interface ExpenseRowProps {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Fila de gasto con gesto de deslizar. El desplazamiento vive en un
 * `useMotionValue` (sin re-render por fotograma): se arrastra con física, con
 * resistencia en los bordes e inercia, y se asienta abierto o cerrado con un
 * resorte. `layout` reacomoda las demás filas al entrar o salir una.
 */
export function ExpenseRow({ expense, onEdit, onDelete }: ExpenseRowProps) {
  const x = useMotionValue(0);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  const subtitle =
    expense.type === "daily"
      ? `${formatUSD(expense.perDay ?? 0)}/día × ${expense.days} días`
      : "Mensual";

  /** Asienta la fila abierta o cerrada, con resorte (o de golpe si hay prisa). */
  function settle(next: boolean) {
    const target = next ? -ACTION_WIDTH : 0;
    if (reduced) x.set(target);
    else animate(x, target, SPRING_UI);
    setOpen(next);
  }

  function onDragEnd(_event: unknown, info: PanInfo) {
    const far = x.get() < -ACTION_WIDTH / 2;
    const fast = info.velocity.x < -350;
    settle(far || fast);
  }

  function edit() {
    x.set(0);
    setOpen(false);
    onEdit();
  }

  function remove() {
    x.set(0);
    setOpen(false);
    onDelete();
  }

  return (
    <m.div
      className="expense-row"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scaleY: 0.5, transition: { duration: 0.16 } }}
      style={{ transformOrigin: "top center" }}
      transition={SPRING_UI}
    >
      <div className="expense-row-actions" aria-hidden={!open}>
        <button
          type="button"
          className="expense-action expense-action--edit"
          onClick={edit}
        >
          <Icon name="pencil" size={16} />
          <span>Editar</span>
        </button>
        <button
          type="button"
          className="expense-action expense-action--del"
          onClick={remove}
        >
          <Icon name="trash" size={16} />
          <span>Eliminar</span>
        </button>
      </div>

      <m.div
        className="expense-row-body"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        dragDirectionLock
        onDragEnd={onDragEnd}
      >
        <IconSquare icon={expense.icon} color={expense.color} colorBg={expense.colorBg} />
        <div className="expense-row-text">
          <span className="expense-row-name">{expense.name}</span>
          <span className="expense-row-sub">{subtitle}</span>
        </div>
        <span className="expense-row-amount">{formatUSD(expense.amount)}</span>
        <button
          type="button"
          className="expense-row-more"
          aria-label={`Acciones de ${expense.name}`}
          onClick={() => settle(!open)}
        >
          <Icon name="dots" size={18} />
        </button>
      </m.div>
    </m.div>
  );
}
