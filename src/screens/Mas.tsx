import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Icon, type IconName } from "../components/Icon";
import { IconSquare } from "../components/IconSquare";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { Toast } from "../components/Toast";
import { DevSwitcher } from "../components/DevSwitcher";
import { useSession } from "../lib/session";
import { useAppUpdate } from "../lib/useAppUpdate";
import { useTheme, ACCENTS, THEME_MODES } from "../lib/theme";
import { useAuth, useGoals, useOtherIncomes, usePeople } from "../data";
import { formatUSD } from "../lib/format";

interface Row {
  icon: IconName;
  color: string;
  colorBg: string;
  title: string;
  sub: string;
  to?: string;
  /** En PC estas secciones viven en el menú lateral, no dentro de «Más». */
  mobileOnly?: boolean;
}

export function Mas() {
  const navigate = useNavigate();
  const { person } = useSession();
  const people = usePeople();
  const count = people.length;
  const { signOut, deleteAccount } = useAuth();
  const { installed, hasUpdate } = useAppUpdate();
  const { mode, accent } = useTheme();
  const otherIncomes = useOtherIncomes();
  const extraTotal = otherIncomes.reduce((sum, o) => sum + o.amount, 0);
  const goals = useGoals();
  const goalsSaved = goals.reduce((sum, g) => sum + g.saved, 0);
  const [confirm, setConfirm] = useState<null | "signout" | "delete">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeLabel = THEME_MODES.find((m) => m.value === mode)?.label ?? "Automático";
  const accentLabel = ACCENTS.find((a) => a.id === accent)?.label ?? "Índigo";

  const rows: Row[] = [
    {
      icon: "users",
      color: "#2F3FA0",
      colorBg: "#E7EAFB",
      title: "Integrantes",
      sub: `${count} de 3 · ${count >= 3 ? "hogar completo" : "hay lugar"}`,
      to: "/mas/integrantes"
    },
    {
      icon: "shield",
      color: "#0B7C60",
      colorBg: "#DDF5EC",
      title: "Descuentos de ley",
      sub: "AFP 7.25% · ISSS 3% · Renta",
      to: "/mas/descuentos"
    },
    {
      icon: "chart",
      color: "#6A4BD8",
      colorBg: "#ECE6FD",
      title: "Cómo se reparte",
      sub: "Mira y ajusta el reparto",
      to: "/reparto"
    },
    {
      icon: "dollar",
      color: "#A66F00",
      colorBg: "#FFF1CF",
      title: "Moneda",
      sub: "Dólar (US$)"
    },
    {
      icon: "moon",
      color: "#2F3FA0",
      colorBg: "#E7EAFB",
      title: "Apariencia",
      sub: `${modeLabel} · ${accentLabel}`,
      to: "/mas/apariencia"
    },
    {
      icon: "coins",
      color: "#0B7C60",
      colorBg: "#DDF5EC",
      title: "Otros ingresos",
      sub: extraTotal > 0 ? `${formatUSD(extraTotal)} este mes` : "Sin ingresos extra",
      to: "/mas/otros-ingresos",
      mobileOnly: true
    },
    {
      icon: "savings",
      color: "#6A4BD8",
      colorBg: "#ECE6FD",
      title: "Ahorros y metas",
      sub:
        goals.length > 0
          ? `${goals.length} ${goals.length === 1 ? "meta" : "metas"} · ${formatUSD(goalsSaved)}`
          : "Sin metas todavía",
      to: "/mas/ahorros",
      mobileOnly: true
    },
    {
      icon: "refresh",
      color: "#D5503F",
      colorBg: "#FDE6E3",
      title: "Actualizaciones",
      sub: `Nido ${installed} · ${hasUpdate ? "hay una nueva" : "estás al día"}`,
      to: "/mas/actualizaciones"
    }
  ];

  const accountRows: Row[] = [
    {
      icon: "logout",
      color: "#2F3FA0",
      colorBg: "#E7EAFB",
      title: "Cerrar sesión",
      sub: "Vuelve a la pantalla de entrada"
    },
    {
      icon: "trash",
      color: "#D5503F",
      colorBg: "#FDE6E3",
      title: "Eliminar cuenta",
      sub: "Borra tu cuenta y tus hogares"
    }
  ];

  async function onConfirm() {
    setBusy(true);
    setError(null);
    try {
      if (confirm === "delete") await deleteAccount();
      else await signOut();
      navigate("/bienvenida");
    } catch {
      setError(
        confirm === "delete"
          ? "No pudimos eliminar tu cuenta. Intenta de nuevo."
          : "No pudimos cerrar sesión. Intenta de nuevo."
      );
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <div className="screen home-stagger">
      <ScreenHeader title="Más" />

      <div className="card profile-card">
        <Avatar person={person} size={44} />
        <div className="profile-text">
          <span className="profile-name">{person.name}</span>
          <span className="profile-mail">{person.email ?? "—"}</span>
        </div>
      </div>

      <div className="card settings-list">
        {rows.map((r) => {
          const inner = (
            <>
              <IconSquare icon={r.icon} color={r.color} colorBg={r.colorBg} size={36} />
              <div className="settings-text">
                <span className="settings-title">{r.title}</span>
                <span className="settings-sub">{r.sub}</span>
              </div>
              <Icon name="chevron-right" size={18} className="settings-chevron" />
            </>
          );
          const className = `settings-row${r.mobileOnly ? " hide-on-pc" : ""}`;
          return r.to ? (
            <Link className={className} key={r.title} to={r.to}>
              {inner}
            </Link>
          ) : (
            <div className={className} key={r.title}>
              {inner}
            </div>
          );
        })}
      </div>

      <div className="card settings-list">
        {accountRows.map((r) => (
          <button
            type="button"
            className="settings-row"
            key={r.title}
            onClick={() => setConfirm(r.title === "Eliminar cuenta" ? "delete" : "signout")}
          >
            <IconSquare icon={r.icon} color={r.color} colorBg={r.colorBg} size={36} />
            <div className="settings-text">
              <span className="settings-title">{r.title}</span>
              <span className="settings-sub">{r.sub}</span>
            </div>
            <Icon name="chevron-right" size={18} className="settings-chevron" />
          </button>
        ))}
      </div>

      <DevSwitcher />

      {error ? <Toast message={error} onDone={() => setError(null)} /> : null}

      <Dialog open={confirm !== null} onClose={() => (busy ? null : setConfirm(null))}>
        <span className="dialog-icon">
          <Icon name={confirm === "delete" ? "trash" : "logout"} size={22} />
        </span>
        <h2 className="dialog-title">
          {confirm === "delete" ? "¿Eliminar tu cuenta?" : "¿Cerrar sesión?"}
        </h2>
        <p className="dialog-text">
          {confirm === "delete"
            ? "Se borrarán tu cuenta y los hogares que creaste. No se puede deshacer."
            : "Podrás volver a entrar cuando quieras con tu cuenta de Google."}
        </p>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="coral" onClick={onConfirm} disabled={busy}>
            {confirm === "delete" ? "Eliminar" : "Cerrar sesión"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
