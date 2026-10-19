import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { syncDailyReminder } from '../services/notificationService';
import { localGetHydratedUserId } from '../services/localStore';
import { getProfile } from '../services/storage';
import { hydrateFromRemote, subscribeHydration } from '../services/sync';
import { refreshHomeWidget } from '../services/widgetSnapshot';
import type { UserProfile } from '../types';
import { useAuth } from './AuthContext';

/**
 * Blocking first-load hydration for a signed-in user with nothing on device:
 * - idle: not blocking (data is local, guest, or the user chose to continue)
 * - loading: pulling the account from the server — show a loader
 * - failed: the pull failed — offer Retry / Continue anyway
 */
export type HydrationStatus = 'idle' | 'loading' | 'failed';

interface AppContextValue {
  profile: UserProfile | null;
  onboardingComplete: boolean;
  refreshProfile: () => Promise<void>;
  hydrationStatus: HydrationStatus;
  /** Re-run the blocking first-load pull after a failure. */
  retryHydration: () => Promise<void>;
  /** Give up on the first-load pull and continue (to onboarding). */
  continueWithoutHydration: () => void;
}

const AppContext = createContext<AppContextValue>({
  profile: null,
  onboardingComplete: false,
  refreshProfile: async () => {},
  hydrationStatus: 'idle',
  retryHydration: async () => {},
  continueWithoutHydration: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { canUseApp, isAuthenticated, isGuest, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [hydrationStatus, setHydrationStatus] =
    useState<HydrationStatus>('idle');
  const userId = isAuthenticated && !isGuest ? (user?.id ?? null) : null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!canUseApp) {
      setProfile(null);
      setOnboardingComplete(false);
    }
    setHydrationStatus('idle');
  }, [canUseApp, userId]);

  const applyProfile = useCallback((next: UserProfile | null) => {
    setProfile(next);
    setOnboardingComplete(next?.onboardingComplete ?? false);
  }, []);

  const afterProfileLoaded = useCallback(async (loaded: UserProfile | null) => {
    try {
      if (loaded?.onboardingComplete) {
        await syncDailyReminder(loaded);
      }
      await refreshHomeWidget();
    } catch {
      // Reminders / widget are best-effort.
    }
  }, []);

  /** Await the pull for a returning user on a fresh device. */
  const runBlockingHydration = useCallback(async () => {
    const forUserId = userIdRef.current;
    setHydrationStatus('loading');
    const result = await hydrateFromRemote();
    if (userIdRef.current !== forUserId) {
      return;
    }
    if (result === 'failed') {
      setHydrationStatus('failed');
      return;
    }
    const loaded = await getProfile();
    applyProfile(loaded);
    setHydrationStatus('idle');
    void afterProfileLoaded(loaded);
  }, [afterProfileLoaded, applyProfile]);

  const refreshProfile = useCallback(async () => {
    const localProfile = await getProfile();
    applyProfile(localProfile);

    const currentUserId = userIdRef.current;
    if (
      currentUserId &&
      !localProfile &&
      (await localGetHydratedUserId()) !== currentUserId
    ) {
      // Nothing on device for this account yet: wait for the server rather
      // than showing onboarding (and later overwriting their real profile).
      await runBlockingHydration();
      return;
    }

    void (async () => {
      try {
        const result = await hydrateFromRemote();
        let loaded = localProfile;
        if (result === 'hydrated') {
          loaded = await getProfile();
          applyProfile(loaded);
        }
        await afterProfileLoaded(loaded);
      } catch {
        // Background refresh; later triggers retry.
      }
    })();
  }, [afterProfileLoaded, applyProfile, runBlockingHydration]);

  // Hydrations started elsewhere (sync worker, pull-to-refresh) can replace
  // the profile — e.g. guest data claimed into an existing account.
  useEffect(
    () =>
      subscribeHydration(result => {
        if (result !== 'hydrated') {
          return;
        }
        void getProfile()
          .then(applyProfile)
          .catch(() => undefined);
      }),
    [applyProfile],
  );

  const retryHydration = useCallback(async () => {
    try {
      await runBlockingHydration();
    } catch {
      setHydrationStatus('failed');
    }
  }, [runBlockingHydration]);

  const continueWithoutHydration = useCallback(() => {
    setHydrationStatus('idle');
  }, []);

  const value = useMemo(
    () => ({
      profile,
      onboardingComplete,
      refreshProfile,
      hydrationStatus,
      retryHydration,
      continueWithoutHydration,
    }),
    [
      continueWithoutHydration,
      hydrationStatus,
      onboardingComplete,
      profile,
      refreshProfile,
      retryHydration,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
