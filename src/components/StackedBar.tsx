import { m, SPRING_UI } from "../motion";

interface Segment {
  value: number;
  color: string;
  label?: string;
}

export function StackedBar({
  segments,
  height = 10,
  className = ""
}: {
  segments: Segment[];
  height?: number;
  className?: string;
}) {
  return (
    <div className={`stacked-bar ${className}`.trim()} style={{ height }}>
      {segments.map((s, i) => (
        <m.span
          key={s.label ?? i}
          layout
          transition={SPRING_UI}
          className="stacked-seg"
          style={{ flex: s.value, background: s.color }}
        />
      ))}
    </div>
  );
}