import { NavLink, useLocation } from "react-router-dom";
import { Icon, Logo, type IconName } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { useHousehold } from "../data";
import { APP_VERSION } from "../lib/appInfo";
import { useSession } from "../lib/session";
import { TABS } from "./TabBar";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

/**
 * Ítems del menú lateral de PC. En móvil no se usa (ahí manda la barra
 * inferior con las 5 pestañas). «Otros ingresos» y «Ahorros y metas» son
 * secciones propias aquí, así que en PC no aparecen dentro de «Más».
 */
const DESKTOP_ITEMS: NavItem[] = [
  ...TABS.slice(0, 4),
  { to: "/mas/otros-ingresos", label: "Otros ingresos", icon: "coins" },
  { to: "/mas/ahorros", label: "Ahorros y metas", icon: "savings" },
  TABS[4]
];

/** Rutas que tienen su propio ítem para que «Más» no se marque dos veces. */
const OWN_PATHS = ["/mas/otros-ingresos", "/mas/ahorros"];

function isActive(pathname: string, to: string): boolean {
  if (to === "/mas") {
    return (
      pathname === "/mas" ||
      (pathname.startsWith("/mas/") && !OWN_PATHS.some((p) => pathname.startsWith(p)))
    );
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Sidebar() {
  const location = useLocation();
  const household = useHousehold();
  const { person } = useSession();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo size={30} />
        <span className="sidebar-brand-name">Nido</span>
      </div>

      <nav className="sidebar-nav" aria-label="Principal">
        {DESKTOP_ITEMS.map((t) => {
          const active = isActive(location.pathname, t.to);
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={`sidebar-item${active ? " is-active" : ""}`}
            >
              <Icon name={t.icon} size={19} />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <Avatar person={person} size={38} />
          <div className="sidebar-user-text">
            <span className="sidebar-user-name">{person.name}</span>
            <span className="sidebar-user-home">{household.name}</span>
          </div>
        </div>
        <span className="sidebar-version">Versión {APP_VERSION}</span>
      </div>
    </aside>
  );
}
