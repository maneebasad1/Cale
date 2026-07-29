import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../config/supabase';
import { getSupabase } from '../lib/supabase';
import {
  cachedAuthUserToUser,
  clearCachedAuthUser,
  getCachedAuthUser,
  saveCachedAuthUser,
} from '../services/authCache';
import { subscribeToAuthDeepLinks } from '../services/authDeepLink';
import { signInWithGoogleNative, signOutGoogle } from '../services/googleAuth';
import { localIsEmpty, resetLocalEntityStore } from '../services/localStore';
import { withTimeout } from '../utils/networkTimeout';

const SESSION_INIT_TIMEOUT_MS = 4_000;
/** Match Supabase SMTP “minimum interval per user” (default 60s). */
const OTP_SEND_COOLDOWN_MS = 60_000;

const lastOtpSentAtByEmail = new Map<string, number>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function otpCooldownRemainingMs(email: string): number {
  const lastSentAt = lastOtpSentAtByEmail.get(normalizeEmail(email));
  if (!lastSentAt) {
    return 0;
  }
  return Math.max(0, OTP_SEND_COOLDOWN_MS - (Date.now() - lastSentAt));
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  sendEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (
    email: string,
    token: string,
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  isAuthenticated: false,
  authLoading: true,
  sendEmailOtp: async () => ({ error: null }),
  verifyEmailOtp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

async function getSessionWithTimeout(): Promise<Session | null> {
  try {
    return await withTimeout(
      getSupabase()
        .auth.getSession()
        .then(({ data }) => data.session),
      SESSION_INIT_TIMEOUT_MS,
      'Session init timed out',
    );
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [offlineUser, setOfflineUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const explicitSignOutRef = useRef(false);
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      return;
    }

    const supabase = getSupabase();

    const restoreOfflineUser = async (): Promise<boolean> => {
      const cached = await getCachedAuthUser();
      if (!cached) {
        return false;
      }
      const empty = await localIsEmpty();
      if (empty) {
        return false;
      }
      lastUserIdRef.current = cached.id;
      setOfflineUser(cachedAuthUserToUser(cached));
      setAuthLoading(false);
      return true;
    };

    const applySession = async (
      event: AuthChangeEvent,
      nextSession: Session | null,
    ) => {
      const nextUserId = nextSession?.user?.id ?? null;

      if (nextSession?.user) {
        const signedInUserId = nextSession.user.id;
        if (
          lastUserIdRef.current !== undefined &&
          lastUserIdRef.current !== null &&
          lastUserIdRef.current !== signedInUserId
        ) {
          await resetLocalEntityStore();
        }
        lastUserIdRef.current = signedInUserId;
        await saveCachedAuthUser({
          id: signedInUserId,
          email: nextSession.user.email,
        });
        setOfflineUser(null);
        setSession(nextSession);
        setAuthLoading(false);
        return;
      }

      if (explicitSignOutRef.current) {
        explicitSignOutRef.current = false;
        lastUserIdRef.current = null;
        await clearCachedAuthUser();
        setOfflineUser(null);
        setSession(null);
        setAuthLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT' && lastUserIdRef.current) {
        setAuthLoading(false);
        return;
      }

      if (await restoreOfflineUser()) {
        return;
      }

      lastUserIdRef.current = null;
      setOfflineUser(null);
      setSession(null);
      setAuthLoading(false);
    };

    void (async () => {
      const initialSession = await getSessionWithTimeout();
      await applySession('INITIAL_SESSION', initialSession);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        void applySession(event, nextSession);
      },
    );

    supabase.auth.startAutoRefresh();

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    const appStateSub = AppState.addEventListener('change', onAppStateChange);
    const unsubscribeDeepLinks = subscribeToAuthDeepLinks();

    return () => {
      listener.subscription.unsubscribe();
      supabase.auth.stopAutoRefresh();
      appStateSub.remove();
      unsubscribeDeepLinks();
    };
  }, []);

  const sendEmailOtp = useCallback(async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    const cooldownMs = otpCooldownRemainingMs(normalizedEmail);
    if (cooldownMs > 0) {
      const seconds = Math.ceil(cooldownMs / 1000);
      return {
        error: `Please wait ${seconds}s before requesting another code.`,
      };
    }

    const { error } = await getSupabase().auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (!error) {
      lastOtpSentAtByEmail.set(normalizeEmail(email), Date.now());
    }

    return { error: error?.message ?? null };
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const normalizedEmail = normalizeEmail(email);
    const cleanToken = token.replace(/\D/g, '');

    const { error } = await getSupabase().auth.verifyOtp({
      email: normalizedEmail,
      token: cleanToken,
      type: 'email',
    });

    if (!error) {
      return { error: null };
    }

    const message = error.message.toLowerCase();
    if (
      message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('token') ||
      error.status === 403
    ) {
      return {
        error:
          'Invalid or expired code. Tap “Resend code” and enter the newest email only.',
      };
    }

    return { error: error.message };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return signInWithGoogleNative();
  }, []);

  const signOut = useCallback(async () => {
    explicitSignOutRef.current = true;
    await signOutGoogle();
    await getSupabase().auth.signOut();
    await clearCachedAuthUser();
    await resetLocalEntityStore();
    lastUserIdRef.current = null;
    setOfflineUser(null);
    setSession(null);
  }, []);

  const user = session?.user ?? offlineUser;
  const isAuthenticated = Boolean(user);

  const value = useMemo(
    () => ({
      session,
      user,
      isAuthenticated,
      authLoading,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithGoogle,
      signOut,
    }),
    [
      authLoading,
      isAuthenticated,
      sendEmailOtp,
      session,
      signInWithGoogle,
      signOut,
      user,
      verifyEmailOtp,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
