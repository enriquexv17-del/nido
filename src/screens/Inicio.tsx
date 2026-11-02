import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Avatar, YouTag } from "../components/Avatar";
import { StackedBar } from "../components/StackedBar";
import { IconSquare } from "../components/IconSquare";
import { CountUp } from "../components/CountUp";
import { formatPct, formatUSD } from "../lib/format";
import { useActivity, useExpenses, useHousehold, usePeople } from "../data";
import { useSession } from "../lib/session";
import { AnimatePresence, m, DUR, EASE_CINE, SPRING_POP, SPRING_UI } from "../motion";

export function Inicio() {
  const household = useHousehold();
  const people = usePeople();
  const expenses = useExpenses();
  const activity = useActivity();
  const { person } = useSession();

  const monthLower = household.monthLabel.split(" ")[0].toLowerCase();
  const fill = person.net > 0 ? Math.round((person.shareAmount / person.net) * 100) : 0;

  const segments = people.map((p) => ({
    value: p.sharePct,
    color: `var(${p.color})`,
    label: p.id
  }));

  /* Aviso de actividad en vivo: se muestra 3 s al llegar un cambio. */
  const [live, setLive] = useState<{ text: string; detail: string; delta: number } | null>(null);
  const armed = useRef(false);
  const prevShare = useRef(0);
  const prevPersonId = useRef(person.id);
  const prevActivityId = useRef<string | null>(null);
  const liveTimer = useRef<number | null>(null);

  useEffect(() => {
    const latest = activity[0];
    if (!armed.current) {
      // Espera a la primera carga real (persona y actividad) antes de armar.
      if (person.id === "") return;
      armed.current = true;
      prevShare.current = person.shareAmount;
      prevPersonId.current = person.id;
      prevActivityId.current = latest?.id ?? null;
      return;
    }

    const samePerson = prevPersonId.current === person.id;
    const delta = samePerson
      ? Math.round((person.shareAmount - prevShare.current) * 100) / 100
      : 0;
    prevShare.current = person.shareAmount;
    prevPersonId.current = person.id;

    const isNewActivity = latest ? latest.id !== prevActivityId.current : false;
    prevActivityId.current = latest?.id ?? null;
    if (!isNewActivity && Math.abs(delta) < 0.005) return;

    setLive({
      text: isNewActivity && latest ? latest.text : "Se actualizó el reparto",
      detail: isNewActivity && latest ? latest.detail : "ahora",
      delta
    });
    if (liveTimer.current) window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => setLive(null), 3000);
  }, [activity, person.id, person.shareAmount]);

  useEffect(
    () => () => {
      if (liveTimer.current) window.clearTimeout(liveTimer.current);
    },
    []
  );

  return (
    <>
      <AnimatePresence>
        {live ? (
          <m.div
            key="live"
            className="live-notice"
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={SPRING_UI}
            role="status"
            aria-live="polite"
          >
            <span className="live-notice-icon">
              <Icon name={activity[0]?.icon ?? "refresh"} size={17} />
            </span>
            <span className="live-notice-text">
              <span className="live-notice-title">{live.text}</span>
              <span className="live-notice-sub">{live.detail}</span>
            </span>
          </m.div>
        ) : null}
      </AnimatePresence>
      {/* ---------------- Móvil ---------------- */}
      <div className="only-mobile home-stagger">
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
          <span className="hero-glow glow" aria-hidden="true" />
          <div className="hero-top">
            <span className="hero-title">Tu parte de {monthLower}</span>
            <AnimatePresence>
              {live && Math.abs(live.delta) >= 0.005 ? (
                <m.span
                  key="delta"
                  className="live-delta"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={SPRING_POP}
                >
                  {live.delta > 0 ? "+" : ""}
                  {live.delta.toFixed(2)} desde el cambio
                </m.span>
              ) : null}
            </AnimatePresence>
          </div>
          <span className="hero-amount">
            <CountUp value={person.shareAmount} format={formatUSD} />
          </span>
          <span className="hero-sub">
            de <CountUp value={household.totalExpenses} format={formatUSD} /> que paga el hogar
          </span>
          <div className="hero-bar">
            <m.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: fill / 100 }}
              transition={{ duration: DUR.scene, ease: EASE_CINE }}
              style={{ transformOrigin: "left center" }}
            />
          </div>
          <div className="hero-foot">
            <span>
              Tu sueldo neto <CountUp value={person.net} format={formatUSD} />
            </span>
            <span className="hero-left">
              Te queda <CountUp value={person.leftover} format={formatUSD} />
            </span>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Entre los tres</h2>
          <StackedBar segments={segments} height={10} className="bar-fill" />
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
                <span className="share-amount">
                  <CountUp value={p.shareAmount} format={formatUSD} />
                </span>
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
      <div className="only-desktop home-stagger">
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
            <strong className="desk-stat-value">
              <CountUp value={person.shareAmount} format={formatUSD} />
            </strong>
          </div>
          <div className="desk-stat">
            <span className="desk-stat-label">Total del hogar</span>
            <strong className="desk-stat-value">
              <CountUp value={household.totalExpenses} format={formatUSD} />
            </strong>
          </div>
          <div className="desk-stat">
            <span className="desk-stat-label">Te queda de tu sueldo</span>
            <strong className="desk-stat-value is-jade">
              <CountUp value={person.leftover} format={formatUSD} />
            </strong>
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
                  <span className="desk-share-amount">
                    <CountUp value={p.shareAmount} format={formatUSD} />
                  </span>
                  <div className="desk-share-track">
                    <span
                      className="bar-fill"
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
