import { NavLink, useLocation } from "react-router-dom";
import { Icon, Logo } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { useHousehold } from "../data";
import { useSession } from "../lib/session";
import { TABS } from "./TabBar";

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
        {TABS.map((t) => {
          const active = location.pathname.startsWith(t.to);
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
        <span className="sidebar-version">Versión 1.0.0</span>
      </div>
    </aside>
  );
}
