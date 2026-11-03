/**
 * Nido · comprobación de aislamiento RLS y endurecimiento (migración 17).
 *
 * Uso (PowerShell):
 *   $env:SUPABASE_URL="https://TU_REF.supabase.co"
 *   $env:SUPABASE_ANON_KEY="eyJ..."
 *   $env:RLS_EMAIL_A="cuenta-a@correo.com"      # admin de su hogar
 *   $env:RLS_PASSWORD_A="..."
 *   $env:RLS_EMAIL_B="cuenta-b@correo.com"      # admin de OTRO hogar
 *   $env:RLS_PASSWORD_B="..."
 *   node scripts/rls-check.mjs
 *
 * Opcionales (para las pruebas de endurecimiento):
 *   $env:RLS_EMAIL_M / $env:RLS_PASSWORD_M       # un `member` del hogar de A
 *   $env:RLS_DELETE_EMAIL / $env:RLS_DELETE_PASSWORD  # cuenta DESECHABLE (¡se borra!)
 *
 * Las cuentas A y B deben pertenecer a hogares DISTINTOS. Las pruebas son de
 * solo lectura salvo:
 *   - el ascenso de rol, el cambio de `user_id` y la edición de fichas ajenas,
 *     que deben FALLAR (no cambian nada);
 *   - el borrado de cuenta, que solo corre si defines `RLS_DELETE_*` y es
 *     irreversible: usa una cuenta desechable.
 *
 * Nunca escribas contraseñas en el repositorio: van por variables de entorno.
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
const accountM = {
  email: process.env.RLS_EMAIL_M || "",
  password: process.env.RLS_PASSWORD_M || ""
};
const accountDelete = {
  email: process.env.RLS_DELETE_EMAIL || "",
  password: process.env.RLS_DELETE_PASSWORD || ""
};

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

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
function note(message) {
  console.log(`INFO  ${message}`);
}

/** ¿El error es «permission denied» (falta de EXECUTE / RLS)? */
function isDenied(error) {
  if (!error) return false;
  return (
    error.code === "42501" ||
    /permission denied/i.test(error.message || "") ||
    /no tiene permiso/i.test(error.message || "")
  );
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/* ---------------- Endurecimiento (migración 17) ---------------- */

async function checkAnonymousRpc() {
  const anon = makeClient();
  const calls = [
    ["preview_household", { p_code: "NIDO-XXXXXXXX" }],
    ["join_household", { p_code: "NIDO-XXXXXXXX", p_name: "X", p_color: "--p1" }],
    ["create_household", { p_name: "X", p_member_name: "X", p_color: "--p1" }],
    ["regenerate_code", {}],
    ["copy_month", { p_from: "2026-01", p_to: "2026-02" }],
    ["delete_my_account", {}],
    [
      "log_activity",
      { p_household: ZERO_UUID, p_member: null, p_icon: "x", p_text: "x", p_detail: "" }
    ],
    ["current_member", { p_household: ZERO_UUID }]
  ];

  for (const [name, args] of calls) {
    const { error } = await anon.rpc(name, args);
    check(
      `anon no tiene permiso para ${name}`,
      isDenied(error),
      error ? error.message : "¡PERMITIDO!"
    );
  }
}

async function checkSettingsLocked(client, label) {
  const { data, error } = await client
    .from("app_settings")
    .update({ afp_rate: 0.0725 })
    .eq("id", 1)
    .select("id");
  const updated = (data ?? []).length;
  check(
    `app_settings: ${label} no puede editar los ajustes globales`,
    error !== null || updated === 0,
    error ? error.message : `${updated} fila(s)`
  );
}

async function checkRoleEscalation(client, ownMembers, label) {
  const member = ownMembers.find((m) => m.role === "member");
  if (!member) {
    note(
      `${label}: no tiene una ficha con rol «member»; ` +
        "define RLS_EMAIL_M/RLS_PASSWORD_M (miembro del hogar de A) para probar el ascenso."
    );
    return;
  }

  const { data, error } = await client
    .from("members")
    .update({ role: "admin" })
    .eq("id", member.id)
    .select("id, role");
  const escalated = !error && (data ?? []).some((r) => r.role === "admin");
  check(
    `members: ${label} (member) no puede ascenderse a admin`,
    !escalated,
    error ? error.message : escalated ? "¡ASCENDIDO!" : "sin cambios"
  );

  const { data: idData, error: idError } = await client
    .from("members")
    .update({ user_id: ZERO_UUID })
    .eq("id", member.id)
    .select("id, user_id");
  const stole = !idError && (idData ?? []).some((r) => r.user_id === ZERO_UUID);
  check(
    `members: ${label} (member) no puede cambiar su user_id`,
    !stole,
    idError ? idError.message : stole ? "¡CAMBIADO!" : "sin cambios"
  );
}

async function checkMemberCannotEditOthers(client, victimIds, label) {
  if (!victimIds.length) return;
  const { data, error } = await client
    .from("members")
    .update({ name: "intruso" })
    .in("id", victimIds)
    .select("id");
  check(
    `members: ${label} no puede editar fichas ajenas`,
    error !== null || (data ?? []).length === 0,
    error ? error.message : `${(data ?? []).length} fila(s)`
  );
}

async function checkAccountDeletion() {
  if (!accountDelete.email || !accountDelete.password) {
    note(
      "borrado de cuenta no probado: define RLS_DELETE_EMAIL/RLS_DELETE_PASSWORD " +
        "con una cuenta DESECHABLE (es irreversible)."
    );
    return;
  }

  const c = makeClient();
  await signIn(c, accountDelete, "C (borrado)");

  // Asegura un hogar con un gasto para ejercitar la cascada y los disparadores.
  const households = await rows(c, "households");
  let householdId = households[0]?.id;
  if (!householdId) {
    const { data, error } = await c.rpc("create_household", {
      p_name: "Prueba de borrado",
      p_member_name: "Prueba",
      p_color: "--p1"
    });
    if (error) throw new Error(`create_household (borrado): ${error.message}`);
    householdId = data;
  }

  const { error: expenseError } = await c.from("expenses").insert({
    household_id: householdId,
    name: "Gasto de prueba",
    icon: "wallet",
    type: "monthly",
    amount: 1,
    month: currentMonth()
  });
  if (expenseError) note(`no se pudo crear el gasto de prueba: ${expenseError.message}`);

  const { error: deleteError } = await c.rpc("delete_my_account");
  check(
    "delete_my_account: borra la cuenta con hogar y gastos",
    deleteError === null,
    deleteError ? deleteError.message : "ok"
  );

  const after = makeClient();
  const { error: reError } = await after.auth.signInWithPassword({
    email: accountDelete.email,
    password: accountDelete.password
  });
  check(
    "delete_my_account: la cuenta ya no existe",
    reError !== null,
    reError ? "sin sesión" : "¡TODAVÍA ENTRA!"
  );
}

/* ---------------- Aislamiento entre dos hogares ---------------- */

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

  /* ---------------- Endurecimiento (migración 17) ---------------- */

  console.log("\n-- Endurecimiento (migración 17) --");

  await checkAnonymousRpc();
  await checkSettingsLocked(a, "A");
  await checkRoleEscalation(a, membersA.filter((m) => m.user_id === userA.id), "A");
  await checkMemberCannotEditOthers(b, [...ownedA], "B");

  if (accountM.email && accountM.password) {
    const m = makeClient();
    const userM = await signIn(m, accountM, "M (member)");
    const membersM = await rows(m, "members");
    await checkRoleEscalation(m, membersM.filter((x) => x.user_id === userM.id), "M");
    await checkMemberCannotEditOthers(m, [...ownedA], "M");
  } else {
    note(
      "ascenso de rol con una cuenta «member» real: define RLS_EMAIL_M/RLS_PASSWORD_M " +
        "(un miembro del hogar de A) para probarlo."
    );
  }

  await checkAccountDeletion();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} comprobaciones correctas.`
  );
  if (failed.length) {
    console.error("Hay fallos. Revisa supabase/RLS.md.");
    process.exit(1);
  }
  console.log("Aislamiento RLS y endurecimiento correctos.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
