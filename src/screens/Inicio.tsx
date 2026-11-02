import { Icon } from "../components/Icon";
import { Avatar, YouTag } from "../components/Avatar";
import { StackedBar } from "../components/StackedBar";
import { IconSquare } from "../components/IconSquare";
import { formatPct, formatUSD } from "../lib/format";
import { useActivity, useExpenses, useHousehold, usePeople } from "../data/mock";
import { useSession } from "../lib/session";

export function Inicio() {
  const household = useHousehold();
  const people = usePeople();
  const expenses = useExpenses();
  const activity = useActivity();
  const { person } = useSession();

  const monthLower = household.monthLabel.split(" ")[0].toLowerCase();
  const fill = Math.round((person.shareAmount / person.net) * 100);

  const segments = people.map((p) => ({
    value: p.sharePct,
    color: `var(${p.color})`,
    label: p.id
  }));

  return (
    <>
      {/* ---------------- Móvil ---------------- */}
      <div className="only-mobile">
        <header className="home-head">
          <div className="screen-head-text">
            <span className="screen-month">{household.monthLabel}</span>
            <h1 className="screen-title">Hola, {person.name}</h1>
          </div>
          <div className="avatar-stack" aria-hidden="true">
            {people.map((p) => (
              <Avatar key={p.id} person={p} size={28} ring />
            ))}
          </div>
        </header>

        <section className="hero">
          <span className="hero-title">Tu parte de {monthLower}</span>
          <span className="hero-amount">{formatUSD(person.shareAmount)}</span>
          <span className="hero-sub">
            de {formatUSD(household.totalExpenses)} que paga el hogar
          </span>
          <div className="hero-bar">
            <span style={{ width: `${fill}%` }} />
          </div>
          <div className="hero-foot">
            <span>Tu sueldo neto {formatUSD(person.net)}</span>
            <span className="hero-left">Te queda {formatUSD(person.leftover)}</span>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Entre los tres</h2>
          <StackedBar segments={segments} height={10} />
          <div className="share-rows">
            {people.map((p) => (
              <div className="share-row" key={p.id}>
                <span
                  className="share-dot"
                  style={{ background: `var(${p.color})` }}
                  aria-hidden="true"
                />
                <span className="share-name">
                  {p.name}
                  {p.isYou ? <YouTag /> : null}
                </span>
                <span className="share-pct">{formatPct(p.sharePct)}</span>
                <span className="share-amount">{formatUSD(p.shareAmount)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Última actividad</h2>
          <div className="activity-list">
            {activity.slice(0, 2).map((a) => (
              <div className="activity-row" key={a.id}>
                <span className="activity-icon">
                  <Icon name={a.icon} size={15} />
                </span>
                <div className="activity-text">
                  <span className="activity-title">{a.text}</span>
                  <span className="activity-sub">{a.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---------------- PC ---------------- */}
      <div className="only-desktop">
        <header className="desk-head">
          <div className="screen-head-text">
            <span className="screen-month">{household.monthLabel}</span>
            <h1 className="screen-title">Hola, {person.name}</h1>
          </div>
          <span className="sync-pill">
            <span className="sync-dot" aria-hidden="true" />
            Sincronizado · ahora
          </span>
        </header>

        <div className="desk-stats">
          <div className="desk-stat desk-stat--hero">
            <span className="desk-stat-label">Tu parte de {monthLower}</span>
            <strong className="desk-stat-value">{formatUSD(person.shareAmount)}</strong>
          </div>
          <div className="desk-stat">
            <span className="desk-stat-label">Total del hogar</span>
            <strong className="desk-stat-value">{formatUSD(household.totalExpenses)}</strong>
          </div>
          <div className="desk-stat">
            <span className="desk-stat-label">Te queda de tu sueldo</span>
            <strong className="desk-stat-value is-jade">{formatUSD(person.leftover)}</strong>
          </div>
        </div>

        <div className="desk-panels">
          <section className="card desk-panel">
            <h2 className="card-title">Reparto entre los tres</h2>
            <div className="desk-share">
              {people.map((p) => (
                <div className="desk-share-row" key={p.id}>
                  <Avatar person={p} size={26} />
                  <span className="desk-share-name">
                    {p.name}
                    {p.isYou ? <YouTag /> : null}
                  </span>
                  <span className="desk-share-pct">{formatPct(p.sharePct)}</span>
                  <span className="desk-share-amount">{formatUSD(p.shareAmount)}</span>
                  <div className="desk-share-track">
                    <span
                      style={{
                        width: `${p.sharePct}%`,
                        background: `var(${p.color})`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card desk-panel">
            <h2 className="card-title">
              <span>Gastos del mes</span>
              <span className="desk-cols">
                <span>Total</span>
                <span>Tu parte</span>
              </span>
            </h2>
            <div className="desk-table">
              {expenses.map((e) => {
                const mine = person.shareByExpense.find((s) => s.expenseId === e.id)?.amount ?? 0;
                return (
                  <div className="desk-table-row" key={e.id}>
                    <IconSquare
                      icon={e.icon}
                      color={e.color}
                      colorBg={e.colorBg}
                      size={34}
                    />
                    <div className="desk-table-text">
                      <span className="expense-row-name">{e.name}</span>
                      <span className="expense-row-sub">
                        {e.type === "daily" ? "Por día × 30" : "Mensual"}
                      </span>
                    </div>
                    <span className="desk-table-total">{formatUSD(e.amount)}</span>
                    <span className="desk-table-mine">{formatUSD(mine)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card desk-panel">
            <h2 className="card-title">Última actividad</h2>
            <div className="activity-list">
              {activity.map((a) => (
                <div className="activity-row" key={a.id}>
                  <span className="activity-icon">
                    <Icon name={a.icon} size={15} />
                  </span>
                  <div className="activity-text">
                    <span className="activity-title">{a.text}</span>
                    <span className="activity-sub">{a.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
