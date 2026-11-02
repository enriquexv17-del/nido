import { Icon, type IconName } from "./Icon";

interface IconSquareProps {
  icon: IconName;
  color: string;
  colorBg: string;
  size?: number;
  radius?: number;
  className?: string;
}

export function IconSquare({
  icon,
  color,
  colorBg,
  size = 38,
  radius = 12,
  className = ""
}: IconSquareProps) {
  return (
    <span
      className={`icon-square ${className}`.trim()}
      style={{
        width: size,
        height: size,
        background: colorBg,
        color,
        borderRadius: radius
      }}
      aria-hidden="true"
    >
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}
