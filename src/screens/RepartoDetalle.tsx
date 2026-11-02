import { BackHeader } from "../components/ScreenHeader";
import { Avatar } from "../components/Avatar";
import { IconSquare } from "../components/IconSquare";
import { formatPct, formatUSD } from "../lib/format";
import { useExpenses } from "../data/mock";
import { useSession } from "../lib/session";

export function RepartoDetalle() {
  const expenses = useExpenses();
  const { person } = useSession();

  return (
    <div className="screen">
      <BackHeader over="Gasto por gasto" title="Tu parte" backTo="/reparto" />

      <div className="card detalle-person">
        <Avatar person={person} size={38} />
        <div className="detalle-person-text">
          <span className="reparto-name">{person.name}</span>
          <span className="reparto-pct">{formatPct(person.sharePct)} del sueldo del hogar</span>
        </div>
      </div>

      <div className="card detalle-list">
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
              <span className="detalle-amount">{formatUSD(mine)}</span>
            </div>
          );
        })}
      </div>

      <div className="jade-card">
        <span>Tu parte de noviembre</span>
        <strong>{formatUSD(person.shareAmount)}</strong>
      </div>
    </div>
  );
}
