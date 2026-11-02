import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { NidoProvider } from "./data";
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

export default function App() {
  return (
    <NidoProvider>
      <SessionProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/bienvenida" replace />} />
            <Route path="/bienvenida" element={<Welcome />} />
            <Route path="/cuenta" element={<Cuenta />} />
            <Route path="/hogar" element={<Hogar />} />
            <Route path="/invitar" element={<Invitar />} />
            <Route path="/unirme" element={<Unirme />} />

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
