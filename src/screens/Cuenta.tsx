import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EntryScreen } from "../layout/EntryShell";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";

export function Cuenta() {
  const navigate = useNavigate();
  const [name, setName] = useState("Enrique");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <EntryScreen
      step={1}
      title="Crea tu cuenta"
      subtitle="Así tu hogar te reconoce desde cualquier dispositivo."
      footer={
        <Button block onClick={() => navigate("/hogar")}>
          Continuar
        </Button>
      }
    >
      <Field label="Tu nombre" value={name} onChange={setName} autoComplete="name" />
      <Field
        label="Correo"
        value={email}
        onChange={setEmail}
        type="email"
        inputMode="email"
        autoComplete="email"
      />
      <Field
        label="Contraseña"
        value={password}
        onChange={setPassword}
        type="password"
        autoComplete="new-password"
      />

      <div className="divider">
        <span>o</span>
      </div>

      <button type="button" className="btn btn--google btn--block">
        <Icon name="google" size={18} />
        Continuar con Google
      </button>
    </EntryScreen>
  );
}
