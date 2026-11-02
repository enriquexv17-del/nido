import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="app-scroll">
          <div className="app-container">
            <Outlet />
          </div>
        </div>
        <TabBar />
      </main>
    </div>
  );
}
