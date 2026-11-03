# Edge Function: `delete-account` (sin desplegar)

Alternativa a la RPC `public.delete_my_account()` para borrar la cuenta. **La
app no la usa por defecto**: el camino funcional ya es la RPC de la migración
12, que no necesita `service_role`.

Esta función está escrita pero **no desplegada**. Sirve si tu proyecto prefiere
borrar `auth.users` desde una Edge Function en lugar de una función SQL
`security definer`.

## Qué hace

1. Lee el JWT del cliente y obtiene el usuario con `auth.getUser()`.
2. Borra los hogares que ese usuario creó (la cascada limpia miembros, sueldos,
   gastos, actividad, descuentos, ingresos extra y ahorros).
3. En los hogares de otras personas solo pone `members.user_id = null`, para no
   borrar datos ajenos.
4. Borra el perfil y, con la API de administración, el usuario de `auth.users`.

La identidad siempre sale del JWT, **nunca** de un `id` en el cuerpo: nadie
puede borrar la cuenta de otra persona.

## Variables de entorno

Supabase las inyecta solo en el servidor de la función:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secreta; nunca en el cliente ni en `.env`)

## Desplegar (cuando lo decidas)

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_REF
supabase functions deploy delete-account
```

No hace falta `--no-verify-jwt`: la función ya valida el JWT con `getUser()` y
responde `SIN_SESION` si no hay sesión.

## Usarla desde la app (opcional)

1. Cambia `src/data/auth.tsx`, en `deleteAccount()`, por:

   ```ts
   const { data, error } = await supabase.functions.invoke("delete-account", {
     method: "POST"
   });
   if (error) throw new Error(error.message);
   if (data?.error) throw new Error(data.error);
   await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
   resetCachedData();
   ```

2. Prueba con una cuenta de prueba: al confirmar «Eliminar cuenta» debe cerrar
   sesión y, al volver a entrar, el correo ya no debe existir.

## Cuándo NO usarla

- Si no quieres manejar la `service_role` en absoluto: quédate con la RPC.
- Si tu plan/entorno no permite Edge Functions.
- Si no has probado antes en un proyecto de pruebas: el borrado es irreversible.