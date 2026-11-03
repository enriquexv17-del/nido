import { useEffect } from "react";
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";
import { m } from "./motion";
import { useScreenTransition } from "./motion/useScreenTransition";
import { NidoProvider, RealtimeBridge, useAuth } from "./data";
import { SessionProvider } from "./lib/session";
import { AppShell } from "./layout/AppShell";
import { Welcome } from "./screens/Welcome";
import { Cuenta } from "./screens/Cuenta";
import { Entrar } from "./screens/Entrar";
import { Recuperar } from "./screens/Recuperar";
import { Restablecer } from "./screens/Restablecer";
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
import { Apariencia } from "./screens/Apariencia";
import { Actualizaciones } from "./screens/Actualizaciones";
import { OtrosIngresos } from "./screens/OtrosIngresos";
import { Ahorros } from "./screens/Ahorros";

/**
 * Transición de las pantallas de entrada. Se monta una sola vez por ruta
 * (sin `AnimatePresence`) para que los formularios no pierdan lo escrito
 * mientras termina la animación.
 */
function EntryTransition() {
  const { pathname } = useLocation();
  const { variants } = useScreenTransition();
  return (
    <m.div
      key={pathname}
      className="screen-transition"
      variants={variants}
      initial="initial"
      animate="animate"
    >
      <Outlet />
    </m.div>
  );
}

/**
 * El enlace de recuperación vuelve como `.../?recuperar=1` (antes del `#`).
 * Lo limpiamos de la barra y abrimos la pantalla para la contraseña nueva.
 */
function RecoveryGate() {
  const navigate = useNavigate();
  const { loading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("recuperar") !== "1") return;
    params.delete("recuperar");
    const query = params.toString();
    const clean = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", clean);
    if (!loading) navigate("/restablecer", { replace: true });
  }, [loading, navigate]);

  return null;
}

/** Rutas de la app: sin sesión no se entra (vuelve a la bienvenida). */
function RequireSession() {
  const { user, loading } = useAuth();
  if (loading) return <div className="route-loading" aria-hidden="true" />;
  if (!user) return <Navigate to="/bienvenida" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <NidoProvider>
      <SessionProvider>
        <RealtimeBridge />
        <HashRouter>
          <RecoveryGate />
          <Routes>
            <Route path="/" element={<Navigate to="/bienvenida" replace />} />

            <Route element={<EntryTransition />}>
              <Route path="/bienvenida" element={<Welcome />} />
              <Route path="/cuenta" element={<Cuenta />} />
              <Route path="/entrar" element={<Entrar />} />
              <Route path="/recuperar" element={<Recuperar />} />
              <Route path="/restablecer" element={<Restablecer />} />
              <Route path="/hogar" element={<Hogar />} />
              <Route path="/invitar" element={<Invitar />} />
              <Route path="/unirme" element={<Unirme />} />
            </Route>

            <Route element={<RequireSession />}>
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/ingresos" element={<Ingresos />} />
              <Route path="/gastos" element={<Gastos />} />
              <Route path="/reparto" element={<Reparto />} />
              <Route path="/reparto/detalle" element={<RepartoDetalle />} />
              <Route path="/mas" element={<Mas />} />
              <Route path="/mas/integrantes" element={<Integrantes />} />
              <Route path="/mas/descuentos" element={<Descuentos />} />
              <Route path="/mas/apariencia" element={<Apariencia />} />
              <Route path="/mas/otros-ingresos" element={<OtrosIngresos />} />
              <Route path="/mas/ahorros" element={<Ahorros />} />
              <Route path="/mas/actualizaciones" element={<Actualizaciones />} />
            </Route>

            <Route path="*" element={<Navigate to="/bienvenida" replace />} />
          </Routes>
        </HashRouter>
      </SessionProvider>
    </NidoProvider>
  );
}