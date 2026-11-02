import { useLocation } from "react-router-dom";
import { BackHeader } from "../components/ScreenHeader";
import { Avatar } from "../components/Avatar";
import { IconSquare } from "../components/IconSquare";
import { CountUp } from "../components/CountUp";
import { formatPct, formatUSD } from "../lib/format";
import { useExpenses, usePeopleMode } from "../data";
import { useSession } from "../lib/session";

type Mode = "salary" | "equal";

export function RepartoDetalle() {
  const expenses = useExpenses();
  const { person: you } = useSession();
  const location = useLocation();
  const mode: Mode =
    (location.state as { mode?: Mode } | null)?.mode === "equal" ? "equal" : "salary";
  const people = usePeopleMode(mode);
  const person = people.find((p) => p.id === you.id) ?? you;

  return (
    <div className="screen">
      <BackHeader over="Gasto por gasto" title="Tu parte" backTo="/reparto" />

      <div className="card detalle-person">
        <Avatar person={person} size={38} />
        <div className="detalle-person-text">
          <span className="reparto-name">{person.name}</span>
          <span className="reparto-pct">
            <CountUp value={person.sharePct} format={formatPct} /> del sueldo del hogar
          </span>
        </div>
      </div>

      <div className="card detalle-list stagger-list" key={mode}>
        {expenses.map((e) => {
          const mine = person.shareByExpense.find((s) => s.expenseId === e.id)?.amount ?? 0;
          return (
            <div className="detalle-row" key={e.id}>
              <IconSquare icon={e.icon} color={e.color} colorBg={e.colorBg} />
              <div className="detalle-text">
                <span className="expense-row-name">{e.name}</span>
                <span className="expense-row-sub">
                  {formatUSD(e.amount)} × {formatPct(person.sharePct)}
                </span>
              </div>
              <span className="detalle-amount">
                <CountUp value={mine} format={formatUSD} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="jade-card">
        <span>Tu parte de noviembre</span>
        <strong>
          <CountUp value={person.shareAmount} format={formatUSD} />
        </strong>
      </div>
    </div>
  );
}