import { useRef, useState } from "react";
import { Icon } from "./Icon";
import { IconSquare } from "./IconSquare";
import { formatUSD } from "../lib/format";
import type { Expense } from "../data";

const ACTION_WIDTH = 138;

interface ExpenseRowProps {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}

export function ExpenseRow({ expense, onEdit, onDelete }: ExpenseRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);

  const subtitle =
    expense.type === "daily"
      ? `${formatUSD(expense.perDay ?? 0)}/día × ${expense.days} días`
      : "Mensual";

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX - offset;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    setOffset(Math.max(-ACTION_WIDTH, Math.min(0, dx)));
  };

  const endDrag = () => {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    setOffset((current) => (current < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0));
  };

  return (
    <div className="expense-row">
      <div className="expense-row-actions" aria-hidden={offset === 0}>
        <button
          type="button"
          className="expense-action expense-action--edit"
          onClick={() => {
            setOffset(0);
            onEdit();
          }}
        >
          <Icon name="pencil" size={16} />
          <span>Editar</span>
        </button>
        <button
          type="button"
          className="expense-action expense-action--del"
          onClick={() => {
            setOffset(0);
            onDelete();
          }}
        >
          <Icon name="trash" size={16} />
          <span>Eliminar</span>
        </button>
      </div>

      <div
        className={`expense-row-body${dragging ? " is-dragging" : ""}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
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
          onClick={() => setOffset((current) => (current === 0 ? -ACTION_WIDTH : 0))}
        >
          <Icon name="dots" size={18} />
        </button>
      </div>
    </div>
  );
}
