import { useEffect } from "react";

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
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
