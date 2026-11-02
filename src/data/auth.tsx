import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { isSupabaseConfigured, supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email?: string;
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
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const DEMO_USER: AuthUser = { id: "demo-enrique", email: "enrique@correo.com" };
const DEMO_SESSION_KEY = "nido.demo.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signUpName, setSignUpName] = useState("");

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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(() => {
    const demoPersist = (next: AuthUser | null) => {
      localStorage.setItem(DEMO_SESSION_KEY, next ? "1" : "0");
      setUser(next);
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
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        if (error) throw error;
      },
      async signInWithGoogle() {
        if (!isSupabaseConfigured || !supabase) {
          demoPersist(DEMO_USER);
          return;
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin }
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
      },
      async deleteAccount() {
        if (!isSupabaseConfigured || !supabase) {
          demoPersist(null);
          return;
        }
        await supabase.rpc("delete_my_account");
        await supabase.auth.signOut();
      }
    };
  }, [user, loading, signUpName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
