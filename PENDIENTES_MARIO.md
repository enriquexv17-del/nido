# Pendientes de Mario

Solo lo que **tú** puedes hacer (nadie más puede: contraseñas, cuentas, UAC,
probar en el celular). Está en orden: lo primero desbloquea lo demás.

> **Ya tienes los instaladores en tu PC** (no hace falta hacer nada para eso):
>
> - Windows: `C:\Users\mario\OneDrive\Escritorio\APP DE FINANANSAS\release\Nido-Setup-1.0.0.exe`
> - Android: `C:\Users\mario\OneDrive\Escritorio\APP DE FINANANSAS\release\Nido-1.0.0.apk` (firmado release)
>
> Para instalarlos, mira [`INSTALAR.md`](INSTALAR.md). El resto de esta lista es
> para publicarlos en internet y probarlos.

---

## 0. Subir el código a GitHub (listo)

El código ya está en `main`. Si vuelves a hacer cambios, en la carpeta del
proyecto:

```powershell
git add -A
git commit -m "Describe el cambio"
git push origin main
```

Si el push falla por permisos, ejecuta `gh auth setup-git` con una cuenta que
sea dueña del repositorio (o pide que te agreguen como colaborador).

---

## 1. Aplicar la migración 18 en Supabase (2 minutos)

Sin esto, los cambios no se ven entre dispositivos al instante (sobre todo al
**quitar** un gasto).

1. Entra a <https://supabase.com> → tu proyecto Nido → **SQL Editor**.
2. Abre el archivo `supabase/migrations/20260101000018_realtime_completo.sql`,
   copia todo su contenido y pégalo en el editor.
3. Pulsa **Run**. Debe decir «Success».
4. Repite lo mismo con la migración 17 (`20260101000017_hardening.sql`) si aún
   no la aplicaste.

> Es seguro aplicarla dos veces: si ya estaba, no hace nada.

---

## 2. URLs de redirección en Supabase (3 minutos)

Necesario para que el login con Google vuelva a la app Android y a la web.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL**:
   ```
   https://enriquexv17-del.github.io/nido/
   ```
3. **Redirect URLs** → *Add URL* (una por una):
   ```
   https://enriquexv17-del.github.io/nido/
   nido://login-callback
   ```
4. Guarda.

**Google Cloud** (solo si tú mismo creaste las credenciales de Google): en
*APIs y servicios → Credenciales → tu cliente OAuth → URIs de redirección
autorizados* debe estar:
```
https://TU_REF.supabase.co/auth/v1/callback
```
(TU_REF es el identificador de tu proyecto, el mismo que aparece en
`VITE_SUPABASE_URL`.) Si usas el Google que trae Supabase por defecto, esto ya
está y no hay que tocar nada.

---

## 3. Secretos de GitHub para publicar la versión (5 minutos)

Ve al repositorio en GitHub → **Settings** → **Secrets and variables** →
**Actions** → **New repository secret**, y crea estos:

| Nombre del secreto | Qué pegar |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | el keystore convertido a texto (comando abajo) |
| `ANDROID_KEYSTORE_PASSWORD` | la contraseña del keystore (archivo `keystore-password.txt`) |
| `VITE_SUPABASE_URL` | `https://TU_REF.supabase.co` (si no está ya) |
| `VITE_SUPABASE_ANON_KEY` | la clave **anon public** (si no está ya) |

Todo esto vive en `C:\Users\mario\nido-secrets\`.

**Keystore a texto** (copia el resultado al portapapeles; no lo pegues en un
chat). Abre PowerShell y pega:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\mario\nido-secrets\nido-release.jks")) | Set-Clipboard
```

Eso deja el texto en el portapapeles: pégalo en el secreto
`ANDROID_KEYSTORE_BASE64`.

**Contraseña del keystore** (para verla; tú la decides, está guardada ahí):

```powershell
Get-Content "C:\Users\mario\nido-secrets\keystore-password.txt"
```

---

## 4. Guardar una copia de seguridad de las claves (10 minutos)

Cópialas a un lugar seguro (un USB, un gestor de contraseñas, un disco externo):

- `C:\Users\mario\nido-secrets\nido-release.jks` (keystore de Android)
- `keystore-password.txt`

**Si pierdes el keystore o su contraseña, no podrás actualizar la app ya
instalada**: Android exige que la versión nueva esté firmada con la misma
clave. Habría que desinstalar y volver a instalar.

> Estos archivos **no están** en el repositorio y nunca deben estarlo.

---

## 5. Publicar la primera versión (2 minutos, después del paso 3)

Cuando ya estén los secretos, en la carpeta del proyecto:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Eso lanza el workflow **Publicar versión (Android + Windows)**, que compila el
APK y el instalador y crea la **Release** en GitHub. Sigue el avance en la
pestaña **Actions**. Al terminar, la release queda en:

```
https://github.com/enriquexv17-del/nido/releases/latest
```

---

## 6. Probar en un celular Android (15 minutos)

1. En el celular, abre la release y descarga **Nido.apk**.
2. Android pedirá permitir «instalar apps de esta fuente»: actívalo.
3. Instala y abre Nido. Prueba:
   - iniciar sesión con **Google** (debe abrirse el navegador y volver solo a la app);
   - agregar un gasto y ver que aparece en la PC y en la PWA del iPhone.
4. En **Más → Actualizaciones** debe decir «Estás en la última versión».

---

## 7. Instalar en Windows (5 minutos)

1. Baja **Nido-Setup-&lt;versión&gt;.exe** de la release.
2. Windows mostrará el aviso azul de **SmartScreen** («Windows protegió tu
   PC»). Es normal: el instalador no está firmado con un certificado de pago.
   Pulsa **Más información** → **Ejecutar de todas formas**.
3. Instala, abre Nido y comprueba el inicio de sesión con **Google**.

---

## 8. Probar que todo se sincroniza (15 minutos)

Sigue la lista corta de `docs/PRUEBA_SINCRONIZACION.md` con Android + PC +
iPhone.

---

## 9. (Opcional) Compilar el instalador en tu PC

Con Electron **no hace falta Rust ni Visual Studio Build Tools**: electron-builder
descarga todo lo que necesita. Solo necesitas espacio en disco.

1. Libera espacio (el empaquetado de Electron usa ~1–2 GB).
2. En la carpeta del proyecto:
   ```powershell
   npm run dist:win
   ```
3. Al terminar, los archivos quedan en `release\`:
   `Nido-Setup-<versión>.exe`, su `.blockmap` y `latest.yml`.

El **Android SDK** (Android Studio) tampoco está: hazlo solo si quieres compilar
el APK en tu PC. Con la release de GitHub no lo necesitas.
