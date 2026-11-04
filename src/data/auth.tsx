import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authError as describeAuthError } from "../lib/authErrors";
import { oauthRedirectUrl } from "../lib/paths";
import { getPlatform, nidoBridge } from "../lib/platform";
import { clearHouseholdCache } from "./api";
import { isSupabaseConfigured, supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email?: string;
  /** Nombre del perfil de Google, para prellenar el hogar. */
  name?: string;
}

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  /** `true` cuando no hay Supabase: la app funciona con datos de prueba. */
  isDemo: boolean;
  /** Error del regreso de Google (cancelación, proveedor, etc.). */
  googleError: string | null;
  clearGoogleError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const DEMO_USER: AuthUser = {
  id: "demo-enrique",
  email: "enrique@correo.com",
  name: "Enrique"
};
const DEMO_SESSION_KEY = "nido.demo.session";

/** Nombre visible a partir del perfil de Google (o del correo). */
function sessionUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): AuthUser {
  const meta = user.user_metadata ?? {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  return {
    id: user.id,
    email: user.email ?? undefined,
    name: fullName || name || user.email?.split("@")[0] || undefined
  };
}

function closeAndroidBrowser(): void {
  if (getPlatform() !== "android") return;
  void import("@capacitor/browser")
    .then(({ Browser }) => Browser.close())
    .catch(() => undefined);
}

/**
 * Canjea el regreso de Google por una sesión de Supabase.
 *
 * Acepta el `code` de PKCE (`nido://login-callback?code=...`) y, como respaldo,
 * tokens en el fragmento (`#access_token=...&refresh_token=...`).
 */
async function exchangeOAuthRedirect(
  url: string,
  onError: (message: string | null) => void
): Promise<void> {
  if (!supabase) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  try {
    const providerError = parsed.searchParams.get("error");
    if (providerError) {
      const description = parsed.searchParams.get("error_description") ?? "";
      onError(describeAuthError(`${providerError} ${description}`.trim()));
      return;
    }

    const code = parsed.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      onError(null);
      return;
    }

    // Respaldo para proveedores que devuelven los tokens en el fragmento.
    const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const fragmentError = fragment.get("error");
    if (fragmentError) {
      const description = fragment.get("error_description") ?? "";
      onError(describeAuthError(`${fragmentError} ${description}`.trim()));
      return;
    }
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
      onError(null);
    }
  } catch (e) {
    onError(describeAuthError(e instanceof Error ? e.message : ""));
  } finally {
    closeAndroidBrowser();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);

  /** Identidad estable: las pantallas lo usan en efectos de limpieza. */
  const clearGoogleError = useCallback(() => setGoogleError(null), []);

  /**
   * Al cambiar de cuenta hay que vaciar la caché de React Query y la del
   * hogar; si no, una persona podría ver durante unos segundos los datos de
   * la cuenta anterior que quedaron en memoria.
   */
  const resetCachedData = useCallback(() => {
    clearHouseholdCache();
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured || !supabase) {
      // Modo prueba: hay sesión por defecto para poder ver la app.
      const stored = localStorage.getItem(DEMO_SESSION_KEY);
      const logged = stored === null ? true : stored === "1";
      if (active) {
        setUser(logged ? DEMO_USER : null);
        setLoading(false);
      }
      return () => {
        active = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session ? sessionUser(data.session.user) : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session ? sessionUser(session.user) : null);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        resetCachedData();
        setGoogleError(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [resetCachedData]);

  /**
   * Android (Capacitor): captura `nido://login-callback` con `appUrlOpen`.
   * Se registra al arrancar para funcionar aunque el sistema haya reiniciado
   * la app; también revisa el enlace de lanzamiento (`getLaunchUrl`).
   */
  useEffect(() => {
    if (getPlatform() !== "android") return;
    let active = true;
    let handle: { remove: () => void } | undefined;
    (async () => {
      const { App } = await import("@capacitor/app");
      handle = await App.addListener("appUrlOpen", ({ url }) => {
        void exchangeOAuthRedirect(url, setGoogleError);
      });
      const launch = await App.getLaunchUrl();
      if (active && launch?.url) {
        await exchangeOAuthRedirect(launch.url, setGoogleError);
      }
    })().catch(() => undefined);
    return () => {
      active = false;
      void handle?.remove();
    };
  }, []);

  /**
   * Windows (Electron): el proceso principal registra el protocolo `nido://`
   * y reenvía el enlace de regreso con `window.nido.onAuthCallback`.
   */
  useEffect(() => {
    if (getPlatform() !== "desktop") return;
    const bridge = nidoBridge();
    if (!bridge?.onAuthCallback) return;
    const off = bridge.onAuthCallback((url) => {
      void exchangeOAuthRedirect(url, setGoogleError);
    });
    return () => off();
  }, []);

  const value = useMemo<AuthValue>(() => {
    const demoPersist = (next: AuthUser | null) => {
      localStorage.setItem(DEMO_SESSION_KEY, next ? "1" : "0");
      setUser(next);
      resetCachedData();
    };

    return {
      user,
      loading,
      isDemo: !isSupabaseConfigured,
      googleError,
      clearGoogleError,
      async signInWithGoogle() {
        setGoogleError(null);
        if (!isSupabaseConfigured || !supabase) {
          demoPersist(DEMO_USER);
          return;
        }

        const platform = getPlatform();

        // Android (Capacitor): navegador del sistema, nunca el WebView.
        if (platform === "android") {
          const { Browser } = await import("@capacitor/browser");
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: oauthRedirectUrl(),
              skipBrowserRedirect: true
            }
          });
          if (error) throw error;
          if (!data?.url) throw new Error("GOOGLE_SIN_URL");
          await Browser.open({ url: data.url });
          return;
        }

        // Windows (Electron): navegador externo + protocolo nido://.
        if (platform === "desktop") {
          const bridge = nidoBridge();
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: oauthRedirectUrl(),
              skipBrowserRedirect: true
            }
          });
          if (error) throw error;
          if (!data?.url) throw new Error("GOOGLE_SIN_URL");
          if (bridge?.openExternal) await bridge.openExternal(data.url);
          else window.open(data.url, "_blank", "noopener");
          return;
        }

        // Web / PWA instalada: vuelve a la base publicada (`/nido/`).
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: oauthRedirectUrl() }
        });
        if (error) throw error;
      },
      async signOut() {
        if (!isSupabaseConfigured || !supabase) {
          demoPersist(null);
          return;
        }
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        resetCachedData();
      },
      async deleteAccount() {
        if (!isSupabaseConfigured || !supabase) {
          demoPersist(null);
          return;
        }
        const { error } = await supabase.rpc("delete_my_account");
        if (error) throw new Error(error.message);
        // La cuenta ya no existe: cerramos la sesión local igualmente.
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        resetCachedData();
      }
    };
  }, [user, loading, googleError, clearGoogleError, resetCachedData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}