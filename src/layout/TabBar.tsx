import { NavLink, useLocation } from "react-router-dom";
import { Icon, type IconName } from "../components/Icon";

export const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: "/inicio", label: "Inicio", icon: "home" },
  { to: "/ingresos", label: "Ingresos", icon: "wallet" },
  { to: "/gastos", label: "Gastos", icon: "receipt" },
  { to: "/reparto", label: "Reparto", icon: "chart" },
  { to: "/mas", label: "Más", icon: "sliders" }
];

export function TabBar() {
  const location = useLocation();
  return (
    <nav className="tabbar" aria-label="Principal">
      {TABS.map((t) => {
        const active = location.pathname.startsWith(t.to);
        return (
          <NavLink
            key={t.to}
            to={t.to}
            className={`tabbar-item${active ? " is-active" : ""}`}
          >
            <span className="tabbar-icon">
              <Icon name={t.icon} size={20} />
            </span>
            <span className="tabbar-label">{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
