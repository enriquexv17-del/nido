import { Link } from "react-router-dom";
import { Logo } from "../components/Icon";

export function Welcome() {
  return (
    <div className="welcome">
      <span className="welcome-deco welcome-deco--a" aria-hidden="true" />
      <span className="welcome-deco welcome-deco--b" aria-hidden="true" />
      <div className="welcome-inner">
        <div className="welcome-top">
          <Logo size={76} />
        </div>
        <div className="welcome-center">
          <h1 className="welcome-title">Nido</h1>
          <p className="welcome-lead">Los gastos del hogar, repartidos justo.</p>
          <p className="welcome-note">
            Para 1, 2 o 3 personas. Todo al instante en iPhone, Android y PC.
          </p>
        </div>
        <div className="welcome-actions">
          <Link to="/cuenta" className="btn btn--maize btn--block">
            Crear mi hogar
          </Link>
          <Link to="/unirme" className="btn btn--outline btn--block">
            Ya tengo un código
          </Link>
        </div>
      </div>
    </div>
  );
}
