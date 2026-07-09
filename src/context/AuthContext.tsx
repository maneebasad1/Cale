import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../config/supabase';
import { getSupabase } from '../lib/supabase';
import { signInWithGoogleNative, signOutGoogle } from '../services/googleAuth';
import { resetLocalEntityStore } from '../services/localStore';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  isAuthenticated: false,
  authLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      return;
    }

    const supabase = getSupabase();
    let lastUserId: string | null | undefined;

    const applySession = async (nextSession: Session | null) => {
      const nextUserId = nextSession?.user?.id ?? null;
      // Wipe local cache whenever the signed-in user changes (including first
      // login after another account left data behind).
      if (
        lastUserId !== undefined &&
        lastUserId !== nextUserId &&
        (lastUserId !== null || nextUserId !== null)
      ) {
        await resetLocalEntityStore();
      }
      lastUserId = nextUserId;
      setSession(nextSession);
      setAuthLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        void applySession(nextSession);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return signInWithGoogleNative();
  }, []);

  const signOut = useCallback(async () => {
    await signOutGoogle();
    await getSupabase().auth.signOut();
    await resetLocalEntityStore();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      authLoading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [authLoading, session, signIn, signInWithGoogle, signOut, signUp],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
