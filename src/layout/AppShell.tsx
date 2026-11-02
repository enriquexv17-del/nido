import { Outlet } from "react-router-dom";
import { AnimatePresence, m } from "../motion";
import { useScreenTransition } from "../motion/useScreenTransition";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";

export function AppShell() {
  const { key, variants } = useScreenTransition();
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="app-scroll">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={key}
              className="app-container"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </m.div>
          </AnimatePresence>
        </div>
        <TabBar />
      </main>
    </div>
  );
}
