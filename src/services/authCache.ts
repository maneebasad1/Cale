import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';

const CACHED_AUTH_USER_KEY = '@caltrack/cached-auth-user';

export interface CachedAuthUser {
  id: string;
  email?: string;
}

export async function saveCachedAuthUser(user: CachedAuthUser): Promise<void> {
  await AsyncStorage.setItem(CACHED_AUTH_USER_KEY, JSON.stringify(user));
}

export async function getCachedAuthUser(): Promise<CachedAuthUser | null> {
  const raw = await AsyncStorage.getItem(CACHED_AUTH_USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as CachedAuthUser;
  } catch {
    return null;
  }
}

export async function clearCachedAuthUser(): Promise<void> {
  await AsyncStorage.removeItem(CACHED_AUTH_USER_KEY);
}

/** Minimal user for offline UI when Supabase session was cleared by failed refresh. */
export function cachedAuthUserToUser(cached: CachedAuthUser): User {
  return {
    id: cached.id,
    email: cached.email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
  } as User;
}
