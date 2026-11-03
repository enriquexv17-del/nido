/**
 * Nido · comprobación de aislamiento RLS con dos cuentas reales.
 *
 * Uso (PowerShell):
 *   $env:SUPABASE_URL="https://TU_REF.supabase.co"
 *   $env:SUPABASE_ANON_KEY="eyJ..."
 *   $env:RLS_EMAIL_A="cuenta-a@correo.com"
 *   $env:RLS_PASSWORD_A="..."
 *   $env:RLS_EMAIL_B="cuenta-b@correo.com"
 *   $env:RLS_PASSWORD_B="..."
 *   node scripts/rls-check.mjs
 *
 * Las cuentas A y B deben pertenecer a hogares DISTINTOS. El script solo lee:
 * no crea, edita ni borra nada. Nunca escribas contraseñas en el repositorio:
 * pásalas por variables de entorno.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const anonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const accountA = {
  email: process.env.RLS_EMAIL_A || "",
  password: process.env.RLS_PASSWORD_A || ""
};
const accountB = {
  email: process.env.RLS_EMAIL_B || "",
  password: process.env.RLS_PASSWORD_B || ""
};

const missing = [
  !url && "SUPABASE_URL",
  !anonKey && "SUPABASE_ANON_KEY",
  !accountA.email && "RLS_EMAIL_A",
  !accountA.password && "RLS_PASSWORD_A",
  !accountB.email && "RLS_EMAIL_B",
  !accountB.password && "RLS_PASSWORD_B"
].filter(Boolean);

if (missing.length) {
  console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
  console.error("Mira supabase/RLS.md para el ejemplo completo.");
  process.exit(2);
}

function makeClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function signIn(client, { email, password }, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo entrar como ${label}: ${error.message}`);
  return data.user;
}

async function rows(client, table, apply = (q) => q) {
  const { data, error } = await apply(client.from(table).select("*"));
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` · ${detail}` : ""}`);
}

async function main() {
  const a = makeClient();
  const b = makeClient();

  const userA = await signIn(a, accountA, "A");
  const userB = await signIn(b, accountB, "B");

  // Hogares visibles para cada cuenta.
  const householdsA = await rows(a, "households");
  const householdsB = await rows(b, "households");
  const idsA = householdsA.map((h) => h.id);
  const idsB = householdsB.map((h) => h.id);
  const shared = idsA.filter((id) => idsB.includes(id));

  check(
    "cuentas en hogares distintos",
    idsA.length > 0 && idsB.length > 0 && shared.length === 0,
    `A=${idsA.length} hogar(es), B=${idsB.length} hogar(es)` +
      (shared.length ? ", comparten un hogar" : "")
  );

  // Integrantes y miembros propios (para las tablas personales).
  const membersA = await rows(a, "members");
  const membersB = await rows(b, "members");
  const ownedA = new Set(
    membersA.filter((m) => m.user_id === userA.id).map((m) => m.id)
  );
  const ownedB = new Set(
    membersB.filter((m) => m.user_id === userB.id).map((m) => m.id)
  );

  check("A tiene un integrante propio", ownedA.size > 0);
  check("B tiene un integrante propio", ownedB.size > 0);

  // Tablas del hogar: B no debe poder leer filas del hogar de A.
  const householdTables = [
    ["members", "household_id"],
    ["income_entries", "household_id"],
    ["expenses", "household_id"],
    ["activity", "household_id"],
    ["deductions", "household_id"],
    ["other_incomes", "household_id"],
    ["savings_goals", "household_id"],
    ["savings_funds", "household_id"]
  ];

  for (const [table, column] of householdTables) {
    if (!idsA.length) continue;
    const leaked = await rows(b, table, (q) => q.in(column, idsA));
    check(`B no ve ${table} del hogar de A`, leaked.length === 0, `${leaked.length} fila(s)`);
  }

  const leakedHouseholds = await rows(b, "households", (q) => q.in("id", idsA));
  check("B no ve los hogares de A", leakedHouseholds.length === 0, `${leakedHouseholds.length} fila(s)`);

  // Perfiles: solo el propio.
  const profilesB = await rows(b, "profiles", (q) => q.eq("id", userA.id));
  check("B no ve el perfil de A", profilesB.length === 0, `${profilesB.length} fila(s)`);

  // Tablas personales: cada fila debe pertenecer a un integrante del usuario.
  for (const table of ["other_incomes", "savings_goals", "savings_funds"]) {
    const ownA = await rows(a, table);
    const ownB = await rows(b, table);
    check(
      `${table}: A solo ve lo suyo`,
      ownA.every((r) => ownedA.has(r.member_id)),
      `${ownA.length} fila(s)`
    );
    check(
      `${table}: B solo ve lo suyo`,
      ownB.every((r) => ownedB.has(r.member_id)),
      `${ownB.length} fila(s)`
    );

    if (ownedA.size) {
      const leaked = await rows(b, table, (q) => q.in("member_id", [...ownedA]));
      check(`${table}: B no ve lo de A`, leaked.length === 0, `${leaked.length} fila(s)`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} comprobaciones correctas.`
  );
  if (failed.length) {
    console.error("Hay fallos de aislamiento. Revisa supabase/RLS.md.");
    process.exit(1);
  }
  console.log("Aislamiento RLS correcto entre las dos cuentas.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});