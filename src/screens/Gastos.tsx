import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { ExpenseRow } from "../components/ExpenseRow";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { Field } from "../components/Field";
import { Segmented } from "../components/Segmented";
import { Sheet } from "../components/Sheet";
import { ConfirmDelete } from "../components/Dialog";
import { Avatar } from "../components/Avatar";
import { formatUSD } from "../lib/format";
import { AnimatePresence } from "../motion";
import {
  EXPENSE_ICON_STYLE,
  useExpenseActions,
  useExpenses,
  useHousehold,
  usePeople,
  type Expense,
  type ExpenseIcon,
  type ExpenseInput,
  type ExpenseType
} from "../data";

const ICON_OPTIONS: { icon: ExpenseIcon; label: string }[] = [
  { icon: "building", label: "Renta" },
  { icon: "bolt", label: "Luz" },
  { icon: "drop", label: "Agua" },
  { icon: "wifi", label: "Internet" },
  { icon: "utensils", label: "Comida" },
  { icon: "wallet", label: "Otro" }
];

export function Gastos() {
  const household = useHousehold();
  const expenses = useExpenses();
  const people = usePeople();
  const { createExpense, updateExpense, deleteExpense, isSaving } = useExpenseActions();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const createRef = useRef<ExpenseFormHandle>(null);
  const editRef = useRef<ExpenseFormHandle>(null);

  async function onCreate(input: ExpenseInput) {
    await createExpense(input);
    setCreating(false);
  }

  async function onUpdate(input: ExpenseInput) {
    if (!editing) return;
    await updateExpense({ id: editing.id, patch: input });
    setEditing(null);
  }

  async function onDelete() {
    const target = deleting;
    setDeleting(null);
    if (target) await deleteExpense(target.id);
  }

  return (
    <div className="screen">
      <ScreenHeader title="Gastos del hogar" month={household.monthLabel} />

      <div className="dark-card income-total">
        <span className="dark-card-label">Total del mes</span>
        <span className="dark-card-value">{formatUSD(household.totalExpenses)}</span>
      </div>

      <div className="card expense-card">
        <AnimatePresence initial={false}>
          {expenses.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              onEdit={() => setEditing(e)}
              onDelete={() => setDeleting(e)}
            />
          ))}
        </AnimatePresence>
      </div>

      <p className="help-text">Desliza un gasto a la izquierda para editarlo o eliminarlo.</p>

      <button
        type="button"
        className={`fab${creating ? " is-open" : ""}`}
        aria-label="Nuevo gasto"
        onClick={() => setCreating(true)}
      >
        <span className="fab-breathe">
          <Icon name="plus" size={24} />
        </span>
      </button>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Nuevo gasto"
        footer={
          <Button block onClick={() => createRef.current?.submit()} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar gasto"}
          </Button>
        }
      >
        <ExpenseForm ref={createRef} people={people} onSubmit={onCreate} />
      </Sheet>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Editar gasto"
        footer={
          <Button block onClick={() => editRef.current?.submit()} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        }
      >
        {editing ? (
          <ExpenseForm
            ref={editRef}
            key={editing.id}
            people={people}
            initial={editing}
            onSubmit={onUpdate}
          />
        ) : null}
      </Sheet>

      <ConfirmDelete
        open={deleting !== null}
        name={deleting?.name ?? ""}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}

export interface ExpenseFormHandle {
  submit: () => void;
}

const ExpenseForm = forwardRef<
  ExpenseFormHandle,
  {
    people: ReturnType<typeof usePeople>;
    initial?: Expense;
    onSubmit: (input: ExpenseInput) => void | Promise<void>;
  }
>(function ExpenseForm({ people, initial, onSubmit }, ref) {
  const [name, setName] = useState(initial?.name ?? "Comida diaria");
  const [amount, setAmount] = useState((initial?.perDay ?? initial?.amount ?? 6).toFixed(2));
  const [type, setType] = useState<ExpenseType>(initial?.type ?? "daily");
  const [icon, setIcon] = useState<ExpenseIcon>(initial?.icon ?? "utensils");
  const [shared, setShared] = useState<string[]>(initial?.memberIds ?? people.map((p) => p.id));

  const perDay = Number.parseFloat(amount) || 0;

  const toggle = (id: string) =>
    setShared((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );

  function submit() {
    const value = Number.parseFloat(amount) || 0;
    const ids = shared.length > 0 ? shared : people.map((p) => p.id);
    const base: ExpenseInput = {
      name: name.trim() || "Gasto",
      icon,
      type,
      amount: type === "daily" ? value * 30 : value,
      memberIds: ids
    };
    if (type === "daily") {
      base.perDay = value;
      base.days = 30;
    }
    void onSubmit(base);
  }

  useImperativeHandle(ref, () => ({ submit }));

  return (
    <div className="expense-form">
      <div className="icon-picker" role="radiogroup" aria-label="Ícono del gasto">
        {ICON_OPTIONS.map((o) => {
          const style = EXPENSE_ICON_STYLE[o.icon];
          const active = icon === o.icon;
          return (
            <button
              key={o.icon}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={o.label}
              className={`icon-pick${active ? " is-active" : ""}`}
              onClick={() => setIcon(o.icon)}
            >
              <span
                className="icon-pick-square"
                style={{
                  background: active ? style.color : style.colorBg,
                  color: active ? "#fff" : style.color
                }}
              >
                <Icon name={o.icon as IconName} size={20} />
              </span>
              <span className="icon-pick-label">{o.label}</span>
            </button>
          );
        })}
      </div>

      <Field label="Nombre" value={name} onChange={setName} />

      <div className="field">
        <span className="field-label">Monto</span>
        <div className="field-row">
          <input
            className="field-input"
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value)}
          />
          {initial && initial.type === "monthly" && (
            <span className="field-old">{formatUSD(initial.amount)}</span>
          )}
        </div>
      </div>

      <Segmented<ExpenseType>
        value={type}
        onChange={setType}
        options={[
          { value: "monthly", label: "Mensual" },
          { value: "daily", label: "Por día" }
        ]}
      />

      {type === "daily" && (
        <p className="calc-line">
          {formatUSD(perDay)} × 30 días = <strong>{formatUSD(perDay * 30)}</strong> al mes
        </p>
      )}

      <span className="sheet-label">Se reparte entre</span>
      <div className="reparte-chips">
        {people.map((p) => {
          const on = shared.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              className={`reparte-chip${on ? " is-on" : ""}`}
              onClick={() => toggle(p.id)}
              aria-pressed={on}
            >
              <Avatar person={p} size={20} />
              <span>{p.name}</span>
              {on ? (
                <span className="reparte-check">
                  <Icon name="check" size={11} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export { ExpenseForm };
