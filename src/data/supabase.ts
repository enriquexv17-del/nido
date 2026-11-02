import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Cliente de Supabase. Es `null` cuando no hay variables de entorno
 * (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`); en ese caso la app usa el
 * modo de prueba con datos simulados.
 *
 * Solo se usa la clave **pública (anon)** en el cliente. Los datos están
 * protegidos por Row Level Security.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
