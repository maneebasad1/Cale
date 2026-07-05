import React, { createContext, useCallback, useContext, useState } from 'react';
import { syncDailyReminder } from '../services/notificationService';
import { getProfile } from '../services/storage';
import type { UserProfile } from '../types';

interface AppContextValue {
  profile: UserProfile | null;
  onboardingComplete: boolean;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  profile: null,
  onboardingComplete: false,
  refreshProfile: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const refreshProfile = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
    setOnboardingComplete(p?.onboardingComplete ?? false);
    if (p?.onboardingComplete) {
      await syncDailyReminder(p);
    }
  }, []);

  return (
    <AppContext.Provider value={{ profile, onboardingComplete, refreshProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
