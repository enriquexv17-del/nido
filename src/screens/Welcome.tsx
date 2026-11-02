import { Link } from "react-router-dom";
import { Logo } from "../components/Icon";
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
          <Link to="/cuenta" className="btn btn--maize btn--block">
            Crear mi hogar
          </Link>
          <Link to="/unirme" className="btn btn--outline btn--block">
            Ya tengo un código
          </Link>
        </m.div>
      </m.div>
    </div>
  );
}
