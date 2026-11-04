import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Icon";
import { authError } from "../lib/authErrors";
import { useAuth } from "../data";
import {
  m,
  fadeUp,
  staggerContainer,
  SPRING_UI,
  type Variants
} from "../motion";

/** El logo entra con escala y fundido (resorte de interfaz). */
const logoIn: Variants = {
  hidden: { opacity: 0, scale: 0.78 },
  show: { opacity: 1, scale: 1, transition: SPRING_UI }
};

export function Welcome() {
  const navigate = useNavigate();
  const { user, loading, isDemo } = useAuth();
  const [oauthError, setOauthError] = useState<string | null>(null);

  /**
   * Si Google cancela o falla, Supabase vuelve a la app con `?error=...`.
   * Lo mostramos una sola vez y limpiamos la barra de direcciones.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const providerError = params.get("error");
    if (!providerError) return;
    const description = params.get("error_description") ?? "";
    ["error", "error_description", "error_code", "error_uri"].forEach((key) =>
      params.delete(key)
    );
    const query = params.toString();
    const clean = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", clean);
    setOauthError(authError(`${providerError} ${description}`.trim()));
  }, []);

  /**
   * Con una sesión activa la bienvenida ya no aplica: la app lleva a la
   * persona a inicio (o a la pantalla para crear/unirse a un hogar).
   * En el modo demostración se deja visible para poder probarla.
   */
  useEffect(() => {
    if (!isDemo && !loading && user) navigate("/inicio", { replace: true });
  }, [isDemo, loading, user, navigate]);

  return (
    <div className="welcome">
      <span className="welcome-deco welcome-deco--a drift" aria-hidden="true" />
      <span className="welcome-deco welcome-deco--b drift drift--slow" aria-hidden="true" />

      <m.div
        className="welcome-inner"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <m.div className="welcome-top" variants={logoIn}>
          <span className="welcome-logo">
            <Logo size={76} />
            <span className="welcome-logo-sheen" aria-hidden="true" />
          </span>
        </m.div>

        <m.div className="welcome-center" variants={staggerContainer}>
          <m.h1 className="welcome-title" variants={fadeUp}>
            Nido
          </m.h1>
          <m.p className="welcome-lead" variants={fadeUp}>
            Los gastos del hogar, repartidos justo.
          </m.p>
          <m.p className="welcome-note" variants={fadeUp}>
            Para 1, 2 o 3 personas. Todo al instante en iPhone, Android y PC.
          </m.p>
        </m.div>

        <m.div className="welcome-actions" variants={fadeUp}>
          {oauthError ? (
            <p className="form-error" role="alert">
              {oauthError}
            </p>
          ) : null}
          <Link to="/cuenta" className="btn btn--maize btn--block">
            Crear mi hogar
          </Link>
          <Link to="/entrar" className="welcome-login">
            Iniciar sesión
          </Link>
        </m.div>
      </m.div>
    </div>
  );
}
