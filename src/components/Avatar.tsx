import type { Person } from "../data/mock";

interface AvatarProps {
  person: Person;
  size?: number;
  ring?: boolean;
  className?: string;
}

export function Avatar({ person, size = 34, ring, className = "" }: AvatarProps) {
  return (
    <span
      className={`avatar${ring ? " avatar--ring" : ""} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        background: `var(${person.color})`,
        fontSize: Math.round(size * 0.42)
      }}
      aria-hidden="true"
    >
      {person.initial}
    </span>
  );
}

export function YouTag({ className = "" }: { className?: string }) {
  return <span className={`you-tag ${className}`.trim()}>tú</span>;
}

export function StatusPill({ tone = "neutral", children }: { tone?: "neutral" | "jade"; children: string }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
