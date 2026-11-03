// Nido · Edge Function alternativa para eliminar la cuenta.
//
// NO está desplegada. Es una opción si prefieres no borrar `auth.users` desde
// una función SQL. Usa la `service_role` desde el entorno de Supabase, nunca
// desde el cliente ni desde el repositorio.
//
// La identidad sale SIEMPRE del JWT que envía el cliente (`getUser()`), nunca
// de un id en el cuerpo: así una persona no puede borrar la cuenta de otra.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "METODO_NO_PERMITIDO" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRole) {
    return json({ error: "FALTAN_VARIABLES_DEL_ENTORNO" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "SIN_SESION" }, 401);
  }

  // Cliente con el JWT del usuario: solo sirve para saber quién llama.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "SIN_SESION" }, 401);
  }
  const userId = authData.user.id;

  // Cliente administrador: borra datos y el usuario, saltando RLS.
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // 1. Hogares creados por el usuario (cascada a miembros, gastos, etc.).
  const { error: householdsError } = await admin
    .from("households")
    .delete()
    .eq("created_by", userId);
  if (householdsError) {
    return json({ error: "NO_SE_PUDIERON_BORRAR_LOS_HOGARES" }, 500);
  }

  // 2. En los hogares ajenos solo se desvincula la ficha (no se borra el dato
  //    del hogar, que pertenece a otra persona).
  const { error: membersError } = await admin
    .from("members")
    .update({ user_id: null })
    .eq("user_id", userId);
  if (membersError) {
    return json({ error: "NO_SE_PUDO_DESVINCULAR_EL_HOGAR" }, 500);
  }

  // 3. Perfil y usuario de Auth (el resto cae por `on delete cascade`).
  await admin.from("profiles").delete().eq("id", userId);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return json({ error: "NO_SE_PUDO_BORRAR_EL_USUARIO" }, 500);
  }

  return json({ ok: true });
});