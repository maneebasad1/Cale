import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from '../config/supabase';

let client: SupabaseClient | null = null;

/** RN's fetch never times out on its own; a stalled request would hang sync forever. */
const REQUEST_TIMEOUT_MS = 20_000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Honor a caller-supplied signal too.
  const outer = init?.signal;
  if (outer) {
    if (outer.aborted) {
      controller.abort();
    } else {
      outer.addEventListener('abort', () => controller.abort());
    }
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
};

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY in src/config/supabase.ts',
    );
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: fetchWithTimeout,
      },
    });
  }

  return client;
}
