import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "maize" | "outline" | "ghost" | "coral" | "soft" | "white";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  block,
  icon,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant}${block ? " btn--block" : ""} ${className}`.trim()}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`icon-btn ${className}`.trim()} aria-label={label} {...rest}>
      {children}
    </button>
  );
}
