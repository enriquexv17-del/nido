import { useEffect } from "react";
import { m, SPRING_UI } from "../motion";

export function Toast({
  message,
  onDone,
  duration = 1800
}: {
  message: string;
  onDone: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDone, duration);
    return () => window.clearTimeout(t);
  }, [message, duration, onDone]);

  return (
    <m.div
      className="toast"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING_UI}
    >
      {message}
    </m.div>
  );
}