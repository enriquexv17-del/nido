import type { ReactNode } from "react";

interface ChipProps {
  active?: boolean;
  tone?: "default" | "maize";
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function Chip({ active, tone = "default", onClick, children, className = "" }: ChipProps) {
  return (
    <button
      type="button"
      className={`chip chip--${tone}${active ? " is-active" : ""} ${className}`.trim()}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
