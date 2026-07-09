import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  drainSyncQueue,
  getSyncStatusSnapshot,
  hydrateFromRemoteIfNeeded,
  refreshSyncStatus,
  retryFailedSync,
  startSyncWorker,
  stopSyncWorker,
  subscribeSyncStatus,
  type SyncStatusSnapshot,
} from '../services/sync';

interface SyncContextValue {
  snapshot: SyncStatusSnapshot;
  retrySync: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  snapshot: getSyncStatusSnapshot(),
  retrySync: async () => {},
  refresh: async () => {},
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState(getSyncStatusSnapshot());

  useEffect(() => subscribeSyncStatus(setSnapshot), []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      stopSyncWorker();
      return;
    }

    startSyncWorker();
    return () => {
      stopSyncWorker();
    };
  }, [authLoading, isAuthenticated]);

  const retrySync = useCallback(async () => {
    await retryFailedSync();
  }, []);

  const refresh = useCallback(async () => {
    await hydrateFromRemoteIfNeeded();
    await drainSyncQueue();
    await refreshSyncStatus();
  }, []);

  const value = useMemo(
    () => ({ snapshot, retrySync, refresh }),
    [snapshot, retrySync, refresh],
  );

  return (
    <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
