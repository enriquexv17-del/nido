import { useState, type InputHTMLAttributes } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function Field({ label, value, onChange, className = "", ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`field${focused ? " is-focus" : ""} ${className}`.trim()}>
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
    </div>
  );
}
