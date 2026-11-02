import { Link } from "react-router-dom";
import { ScreenHeader } from "../components/ScreenHeader";
import { Icon, type IconName } from "../components/Icon";
import { IconSquare } from "../components/IconSquare";
import { Avatar } from "../components/Avatar";
import { DevSwitcher } from "../components/DevSwitcher";
import { useSession } from "../lib/session";

interface Row {
  icon: IconName;
  color: string;
  colorBg: string;
  title: string;
  sub: string;
  to?: string;
}

export function Mas() {
  const { person } = useSession();

  const rows: Row[] = [
    {
      icon: "users",
      color: "#2F3FA0",
      colorBg: "#E7EAFB",
      title: "Integrantes",
      sub: "3 de 3 · hogar completo",
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
      sub: "Según sueldo neto"
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
      sub: "Automática"
    },
    {
      icon: "refresh",
      color: "#D5503F",
      colorBg: "#FDE6E3",
      title: "Actualizaciones",
      sub: "Nido 1.0.0 · estás al día",
      to: "/mas/actualizaciones"
    }
  ];

  return (
    <div className="screen">
      <ScreenHeader title="Más" />

      <div className="card profile-card">
        <Avatar person={person} size={44} />
        <div className="profile-text">
          <span className="profile-name">{person.name}</span>
          <span className="profile-mail">{person.email}</span>
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
          return r.to ? (
            <Link className="settings-row" key={r.title} to={r.to}>
              {inner}
            </Link>
          ) : (
            <div className="settings-row" key={r.title}>
              {inner}
            </div>
          );
        })}
      </div>

      <DevSwitcher />
    </div>
  );
}
