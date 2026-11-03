# Publicar Nido en GitHub Pages

La app se publica sola con GitHub Actions: cada push a `main` compila y la sube
a Pages. No hace falta ejecutar nada a mano.

## 1. Subir el proyecto a GitHub

Crea un repositorio **público** en GitHub (por ejemplo `nido`) y sube este
código a la rama `main`:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

## 2. Activar Pages

En el repositorio: **Settings → Pages → Build and deployment → Source:
GitHub Actions**. No hace falta elegir una rama: el workflow publica el
artefacto compilado.

## 3. Conectar Supabase (opcional)

Si quieres el modo real, agrega los secretos en **Settings → Secrets and
variables → Actions → New repository secret**:

| Secreto | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://TU_REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | la clave **anon public** de tu proyecto |

**Nunca** agregues aquí la `service_role`: es secreta y no debe llegar al
navegador. Si no pones estos secretos, la app se publica igual en **modo
demostración** (datos de prueba en el dispositivo).

## 4. Publicar

Cualquier push a `main` lanza el workflow **Publicar en GitHub Pages**
(visible en la pestaña **Actions**). También puedes lanzarlo a mano con
**Run workflow**.

Cuando termina, la app queda en:

```
https://TU_USUARIO.github.io/TU_REPO/
```

Por ejemplo, para el usuario `mario` y el repo `nido`:
`https://mario.github.io/nido/`.

## Cómo funciona la ruta base

GitHub Pages sirve la app bajo `/TU_REPO/`, no en la raíz. El workflow pasa
`VITE_BASE=/TU_REPO/` (el nombre del repo se toma solo) y Vite genera todas las
rutas relativas a esa base. El enrutado por hash (`#/inicio`, `#/mas`) sigue
funcionando porque el fragmento no lo toca el servidor.

## Si usas Supabase

En **Authentication → URL Configuration** de tu proyecto, agrega a *Redirect
URLs* la dirección publicada:

```
https://TU_USUARIO.github.io/TU_REPO/
```

El enlace de recuperación de contraseña vuelve con `?recuperar=1` a esa misma
base y abre la pantalla «Nueva contraseña».

## Publicar una actualización

La pantalla **Más → Actualizaciones** compara la versión instalada
(`package.json`) con `public/version.json`. Para avisar de una versión nueva:

1. Sube `version` en `package.json` y en `public/version.json`.
2. Actualiza `notes` en `public/version.json` con lo que cambió.
3. Haz push a `main`.

`version.json` se pide siempre por red (no se guarda en caché), así que los
dispositivos ya instalados detectan la versión nueva y ofrecen
**Instalar y reiniciar**.

## Probar la compilación de Pages en local

```powershell
$env:VITE_BASE="/nido/"
npm run build
npm run preview
```

Abre `http://localhost:4173/nido/` y comprueba que la app carga y que las rutas
`#/...` funcionan.

## Problemas frecuentes

- **Página en blanco tras publicar:** revisa que Pages esté en *GitHub
  Actions* y que el último workflow haya terminado en verde.
- **«404» al entrar a una ruta:** la app usa hash (`#/ruta`); no escribas
  rutas sin `#`. Si usas un enlace externo, incluye el `#`.
- **Sin datos reales:** faltan los secretos `VITE_SUPABASE_*` o el proyecto
  está vacío. Crea tu hogar desde la app y, si quieres, carga datos de ejemplo.
