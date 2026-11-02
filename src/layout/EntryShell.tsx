import type { ReactNode } from "react";
import { StepBars } from "../components/StepBars";

export function EntryShell({ children }: { children: ReactNode }) {
  return (
    <div className="entry-shell">
      <div className="entry-card">{children}</div>
    </div>
  );
}

interface EntryScreenProps {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function EntryScreen({ step, title, subtitle, children, footer }: EntryScreenProps) {
  return (
    <EntryShell>
      <div className="entry-screen">
        <header className="entry-head">
          <StepBars step={step} />
          <h1 className="screen-title">{title}</h1>
          <p className="screen-sub">{subtitle}</p>
        </header>
        <div className="entry-body">{children}</div>
        <div className="entry-footer">{footer}</div>
      </div>
    </EntryShell>
  );
}
