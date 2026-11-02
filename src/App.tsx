import { HashRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AnimatePresence, m } from "./motion";
import { useScreenTransition } from "./motion/useScreenTransition";
import { NidoProvider, RealtimeBridge } from "./data";
import { SessionProvider } from "./lib/session";
import { AppShell } from "./layout/AppShell";
import { Welcome } from "./screens/Welcome";
import { Cuenta } from "./screens/Cuenta";
import { Hogar } from "./screens/Hogar";
import { Invitar } from "./screens/Invitar";
import { Unirme } from "./screens/Unirme";
import { Inicio } from "./screens/Inicio";
import { Ingresos } from "./screens/Ingresos";
import { Gastos } from "./screens/Gastos";
import { Reparto } from "./screens/Reparto";
import { RepartoDetalle } from "./screens/RepartoDetalle";
import { Mas } from "./screens/Mas";
import { Integrantes } from "./screens/Integrantes";
import { Descuentos } from "./screens/Descuentos";
import { Actualizaciones } from "./screens/Actualizaciones";

/** Transición de las pantallas de entrada (bienvenida, cuenta, hogar...). */
function EntryTransition() {
  const { key, variants } = useScreenTransition();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={key}
        className="screen-transition"
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <Outlet />
      </m.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <NidoProvider>
      <SessionProvider>
        <RealtimeBridge />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/bienvenida" replace />} />

            <Route element={<EntryTransition />}>
              <Route path="/bienvenida" element={<Welcome />} />
              <Route path="/cuenta" element={<Cuenta />} />
              <Route path="/hogar" element={<Hogar />} />
              <Route path="/invitar" element={<Invitar />} />
              <Route path="/unirme" element={<Unirme />} />
            </Route>

            <Route element={<AppShell />}>
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/ingresos" element={<Ingresos />} />
              <Route path="/gastos" element={<Gastos />} />
              <Route path="/reparto" element={<Reparto />} />
              <Route path="/reparto/detalle" element={<RepartoDetalle />} />
              <Route path="/mas" element={<Mas />} />
              <Route path="/mas/integrantes" element={<Integrantes />} />
              <Route path="/mas/descuentos" element={<Descuentos />} />
              <Route path="/mas/actualizaciones" element={<Actualizaciones />} />
            </Route>

            <Route path="*" element={<Navigate to="/bienvenida" replace />} />
          </Routes>
        </HashRouter>
      </SessionProvider>
    </NidoProvider>
  );
}
