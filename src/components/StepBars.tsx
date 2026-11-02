export function StepBars({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="step-bars">
      <div className="step-bars-track">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`step-bar${n <= step ? " is-on" : ""}`} />
        ))}
      </div>
      <span className="step-label">Paso {step} de 3</span>
    </div>
  );
}
