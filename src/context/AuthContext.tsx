import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../config/supabase';
import { getSupabase } from '../lib/supabase';
import {
  cachedAuthUserToUser,
  clearCachedAuthUser,
  getCachedAuthUser,
  saveCachedAuthUser,
} from '../services/authCache';
import { deleteAccountOnServer } from '../services/accountService';
import { subscribeToAuthDeepLinks } from '../services/authDeepLink';
import { getGuestMode, setGuestMode } from '../services/guestMode';
import { signInWithGoogleNative, signOutGoogle } from '../services/googleAuth';
import {
  localGetHydratedUserId,
  localIsEmpty,
  resetLocalEntityStore,
} from '../services/localStore';
import { cancelAllReminders } from '../services/notificationService';
import { withTimeout } from '../utils/networkTimeout';

const SESSION_INIT_TIMEOUT_MS = 4_000;
const SIGN_OUT_TIMEOUT_MS = 5_000;
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
  isGuest: boolean;
  canUseApp: boolean;
  authLoading: boolean;
  sendEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (
    email: string,
    token: string,
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Deletes the account on the server, then runs the full sign-out path. */
  deleteAccount: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  isAuthenticated: false,
  isGuest: false,
  canUseApp: false,
  authLoading: true,
  sendEmailOtp: async () => ({ error: null }),
  verifyEmailOtp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  continueAsGuest: async () => {},
  signOut: async () => {},
  deleteAccount: async () => ({ error: null }),
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

async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected) && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

/**
 * Clears the Supabase session from storage even when offline. A global
 * sign-out needs the network and, on failure, keeps the stored session —
 * which would sign the user straight back in on next launch.
 */
async function signOutSupabase(): Promise<void> {
  const auth = getSupabase().auth;
  try {
    const { error } = await withTimeout(
      auth.signOut(),
      SIGN_OUT_TIMEOUT_MS,
      'Sign out timed out',
    );
    if (!error) {
      return;
    }
  } catch {
    // Fall through to local sign-out.
  }
  try {
    await withTimeout(
      auth.signOut({ scope: 'local' }),
      SIGN_OUT_TIMEOUT_MS,
      'Local sign out timed out',
    );
  } catch {
    // Local state is still cleared by the caller.
  }
}

const AUTH_LINK_ERROR_MESSAGE =
  'This link has expired or was already used. Request a new code.';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [offlineUser, setOfflineUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const explicitSignOutRef = useRef(false);
  const lastUserIdRef = useRef<string | null | undefined>(undefined);
  /** Avoid repeating the "session expired" alert for duplicate SIGNED_OUT events. */
  const sessionExpiredAlertedRef = useRef(false);

  useEffect(() => {
    const restoreGuest = async (): Promise<boolean> => {
      if (!(await getGuestMode())) {
        return false;
      }
      lastUserIdRef.current = null;
      setIsGuest(true);
      setAuthLoading(false);
      return true;
    };

    if (!isSupabaseConfigured()) {
      void restoreGuest().then(ok => {
        if (!ok) {
          setAuthLoading(false);
        }
      });
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
      setIsGuest(false);
      setOfflineUser(cachedAuthUserToUser(cached));
      setAuthLoading(false);
      return true;
    };

    const applySession = async (
      event: AuthChangeEvent,
      nextSession: Session | null,
    ) => {
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
        sessionExpiredAlertedRef.current = false;
        await saveCachedAuthUser({
          id: signedInUserId,
          email: nextSession.user.email,
        });
        await setGuestMode(false);
        setIsGuest(false);
        setOfflineUser(null);
        setSession(nextSession);
        setAuthLoading(false);
        return;
      }

      if (explicitSignOutRef.current) {
        explicitSignOutRef.current = false;
        lastUserIdRef.current = null;
        await clearCachedAuthUser();
        await setGuestMode(false);
        setIsGuest(false);
        setOfflineUser(null);
        setSession(null);
        setAuthLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT' && lastUserIdRef.current) {
        if (!(await isOnline())) {
          // Failed refresh while offline: keep the user in the app on the
          // cached/offline user; sync resumes when the session recovers.
          setAuthLoading(false);
          return;
        }

        // Online and not explicit: the server ended the session (revoked /
        // expired refresh token). Drop auth state but KEEP the local store
        // and sync queue so signing back in as the same user uploads pending
        // changes. lastUserIdRef keeps the old id so a different account
        // signing in still resets the local store.
        await clearCachedAuthUser();
        setIsGuest(false);
        setOfflineUser(null);
        setSession(null);
        setAuthLoading(false);
        if (!sessionExpiredAlertedRef.current) {
          sessionExpiredAlertedRef.current = true;
          Alert.alert(
            'Signed out',
            'Your session expired. Please sign in again.',
          );
        }
        return;
      }

      if (await restoreOfflineUser()) {
        return;
      }

      if (await restoreGuest()) {
        return;
      }

      lastUserIdRef.current = null;
      setIsGuest(false);
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
    const unsubscribeDeepLinks = subscribeToAuthDeepLinks(() => {
      Alert.alert('Sign-in link failed', AUTH_LINK_ERROR_MESSAGE);
    });

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

  const continueAsGuest = useCallback(async () => {
    // Local data left behind by an expired account session belongs to that
    // account — don't hand it to a guest.
    if (lastUserIdRef.current || (await localGetHydratedUserId())) {
      await resetLocalEntityStore();
    }
    await setGuestMode(true);
    lastUserIdRef.current = null;
    setIsGuest(true);
  }, []);

  const signOut = useCallback(async () => {
    explicitSignOutRef.current = true;
    try {
      await cancelAllReminders().catch(() => undefined);
      await signOutGoogle();
      if (isSupabaseConfigured()) {
        await signOutSupabase();
      }
      await clearCachedAuthUser();
      await resetLocalEntityStore();
      await setGuestMode(false);
      lastUserIdRef.current = null;
      setIsGuest(false);
      setOfflineUser(null);
      setSession(null);
      setAuthLoading(false);
    } finally {
      // Supabase delivers SIGNED_OUT synchronously inside signOut(), so the
      // flag has been consumed by now. If no event fired (timeout / no
      // session), don't let a stale flag swallow a later real session end.
      explicitSignOutRef.current = false;
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    const { error } = await deleteAccountOnServer();
    if (error) {
      return { error };
    }
    await signOut();
    return { error: null };
  }, [signOut]);

  const user = session?.user ?? offlineUser;
  const isAuthenticated = Boolean(user);
  const canUseApp = isAuthenticated || isGuest;

  const value = useMemo(
    () => ({
      session,
      user,
      isAuthenticated,
      isGuest,
      canUseApp,
      authLoading,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithGoogle,
      continueAsGuest,
      signOut,
      deleteAccount,
    }),
    [
      authLoading,
      canUseApp,
      continueAsGuest,
      deleteAccount,
      isAuthenticated,
      isGuest,
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
