import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

export function ScreenHeader({
  title,
  month,
  right
}: {
  title: string;
  month?: string;
  right?: ReactNode;
}) {
  return (
    <header className="screen-head">
      <div className="screen-head-text">
        {month ? <span className="screen-month">{month}</span> : null}
        <h1 className="screen-title">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function BackHeader({
  title,
  over,
  backTo
}: {
  title: string;
  over?: string;
  backTo?: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="back-head">
      <button
        type="button"
        className="back-btn"
        aria-label="Volver"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
      >
        <Icon name="chevron-left" size={18} />
      </button>
      <div className="screen-head-text">
        {over ? <span className="screen-month">{over}</span> : null}
        <h1 className="screen-title">{title}</h1>
      </div>
    </header>
  );
}
