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
import { oauthRedirectUrl, publicBaseUrl, recoveryRedirectUrl } from "../lib/paths";
import { getPlatform, nidoBridge } from "../lib/platform";
import { clearHouseholdCache } from "./api";
import { isSupabaseConfigured, supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface SignUpResult {
  /** `true` cuando Supabase exige confirmar el correo antes de entrar. */
  needsConfirmation: boolean;
}

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  /** `true` cuando no hay Supabase: la app funciona con datos de prueba. */
  isDemo: boolean;
  /** Nombre con el que crear el hogar al registrarse. */
  signUpName: string;
  setSignUpName: (name: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<SignUpResult>;
  /** Confirma la cuenta con el código de 6 dígitos que llega por correo. */
  verifySignupOtp: (email: string, token: string) => Promise<void>;
  /** Vuelve a enviar el código de confirmación. */
  resendSignupOtp: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const DEMO_USER: AuthUser = { id: "demo-enrique", email: "enrique@correo.com" };
const DEMO_SESSION_KEY = "nido.demo.session";

/**
 * Cierra el login de Google en Android: Supabase vuelve con el esquema propio
 * (`com.nido.app://auth?code=...`). Extrae el `code` y lo canjea por sesión.
 * Se usa tanto desde el botón (webview en segundo plano) como al reabrir la app
 * desde el enlace (proceso reiniciado) mediante `App.getLaunchUrl()`.
 */
async function exchangeOAuthRedirect(url: string): Promise<void> {
  if (!supabase) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  const code = parsed.searchParams.get("code");
  if (!code) return;
  try {
    await supabase.auth.exchangeCodeForSession(code);
  } catch {
    /* si el canje falla, el usuario sigue en la pantalla de entrada */
  }
  // En Android cierra la pestaña del navegador; en Electron no hace falta.
  if (getPlatform() === "android") {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.close();
    } catch {
      /* sin plugin de navegador */
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signUpName, setSignUpName] = useState("");

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
      const s = data.session;
      setUser(s ? { id: s.user.id, email: s.user.email ?? undefined } : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session ? { id: session.user.id, email: session.user.email ?? undefined } : null);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") resetCachedData();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [resetCachedData]);

  /**
   * Android: captura el enlace profundo con el que vuelve Google
   * (`com.nido.app://auth?code=...`). Se registra al arrancar para que funcione
   * aunque el sistema haya reiniciado la app; también revisa el enlace de
   * lanzamiento (`getLaunchUrl`) en el arranque en frío.
   */
  useEffect(() => {
    if (getPlatform() !== "android") return;
    let active = true;
    let handle: { remove: () => void } | undefined;
    (async () => {
      const { App } = await import("@capacitor/app");
      handle = await App.addListener("appUrlOpen", ({ url }) => {
        void exchangeOAuthRedirect(url);
      });
      const launch = await App.getLaunchUrl();
      if (active && launch?.url) await exchangeOAuthRedirect(launch.url);
    })().catch(() => undefined);
    return () => {
      active = false;
      void handle?.remove();
    };
  }, []);

  /**
   * Windows (Electron): el proceso principal registra `com.nido.app://auth` y
   * reenvía el enlace con el que vuelve Google (`window.nido.onAuthCallback`).
   */
  useEffect(() => {
    if (getPlatform() !== "desktop") return;
    const bridge = nidoBridge();
    if (!bridge?.onAuthCallback) return;
    const off = bridge.onAuthCallback((url) => {
      void exchangeOAuthRedirect(url);
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
      signUpName,
      setSignUpName,
      async signIn(email, password) {
        if (!isSupabaseConfigured || !supabase) {
          demoPersist({ id: DEMO_USER.id, email: email || DEMO_USER.email });
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password, name) {
        setSignUpName(name);
        if (!isSupabaseConfigured || !supabase) {
          demoPersist({ id: DEMO_USER.id, email });
          return { needsConfirmation: false };
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        if (error) throw error;
        return { needsConfirmation: data.session === null };
      },
      async verifySignupOtp(email, token) {
        if (!isSupabaseConfigured || !supabase) {
          demoPersist({ id: DEMO_USER.id, email });
          return;
        }
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "signup"
        });
        if (error) throw error;
      },
      async resendSignupOtp(email) {
        if (!isSupabaseConfigured || !supabase) return;
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: publicBaseUrl() }
        });
        if (error) throw error;
      },
      async signInWithGoogle() {
        if (!isSupabaseConfigured || !supabase) {
          demoPersist(DEMO_USER);
          return;
        }
        const platform = getPlatform();
        // Escritorio (Electron): navegador del sistema + regreso por
        // `com.nido.app://auth`, que reenvía el proceso principal.
        if (platform === "desktop") {
          const bridge = nidoBridge();
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: oauthRedirectUrl(), skipBrowserRedirect: true }
          });
          if (error) throw error;
          if (data?.url) {
            if (bridge?.openExternal) await bridge.openExternal(data.url);
            else window.open(data.url, "_blank", "noopener");
          }
          return;
        }
        // Android: navegador del sistema + enlace profundo (lo captura el
        // efecto de `appUrlOpen` de este proveedor).
        if (platform === "android") {
          const { Browser } = await import("@capacitor/browser");
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: oauthRedirectUrl(), skipBrowserRedirect: true }
          });
          if (error) throw error;
          if (data?.url) await Browser.open({ url: data.url });
          return;
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            // En GitHub Pages la base es `/nido/`: la URL debe terminar en
            // `/nido/` para que Supabase devuelva a la app publicada.
            redirectTo: `${window.location.origin}${
              import.meta.env.BASE_URL.endsWith("/")
                ? import.meta.env.BASE_URL
                : `${import.meta.env.BASE_URL}/`
            }`
          }
        });
        if (error) throw error;
      },
      async sendPasswordReset(email) {
        if (!isSupabaseConfigured || !supabase) return;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: recoveryRedirectUrl()
        });
        if (error) throw error;
      },
      async updatePassword(password) {
        if (!isSupabaseConfigured || !supabase) return;
        const { error } = await supabase.auth.updateUser({ password });
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
  }, [user, loading, signUpName, resetCachedData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}