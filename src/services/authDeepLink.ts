import { Linking } from 'react-native';
import type { EmailOtpType } from '@supabase/supabase-js';
import { AUTH_REDIRECT_URL } from '../config/supabase';
import { getSupabase } from '../lib/supabase';

export function parseUrlParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramString =
    hashIndex >= 0
      ? url.slice(hashIndex + 1)
      : queryIndex >= 0
        ? url.slice(queryIndex + 1)
        : '';

  if (!paramString) {
    return {};
  }

  return Object.fromEntries(
    paramString
      .split('&')
      .filter(Boolean)
      .map((pair) => {
        const [key, ...rest] = pair.split('=');
        return [
          decodeURIComponent(key.replace(/\+/g, ' ')),
          decodeURIComponent(rest.join('=').replace(/\+/g, ' ')),
        ];
      }),
  );
}

export function isAuthRedirectUrl(url: string): boolean {
  return url.startsWith(AUTH_REDIRECT_URL);
}

function isEmailOtpType(value: string): value is EmailOtpType {
  return [
    'signup',
    'invite',
    'magiclink',
    'recovery',
    'email_change',
    'email',
  ].includes(value);
}

/** Exchange tokens from a Supabase auth redirect into a persisted session. */
export async function createSessionFromUrl(url: string): Promise<string | null> {
  if (!isAuthRedirectUrl(url)) {
    return null;
  }

  const params = parseUrlParams(url);

  if (params.error || params.error_description) {
    return params.error_description || params.error || 'Authentication failed.';
  }

  const tokenHash = params.token_hash;
  const otpType = params.type;

  if (tokenHash && otpType && isEmailOtpType(otpType)) {
    const { error } = await getSupabase().auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    return error?.message ?? null;
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { error } = await getSupabase().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return error?.message ?? null;
}

export function subscribeToAuthDeepLinks(
  onError?: (message: string) => void,
): () => void {
  const reportError = (message: string) => {
    try {
      onError?.(message);
    } catch {
      // Never let a UI callback crash the link handler.
    }
  };

  const handleUrl = (url: string | null | undefined) => {
    if (!url || !isAuthRedirectUrl(url)) {
      return;
    }

    // createSessionFromUrl can throw synchronously-in-async (e.g. URIError
    // from decodeURIComponent on a malformed link) or reject on network
    // errors — surface both instead of leaving an unhandled rejection.
    createSessionFromUrl(url)
      .then((errorMessage) => {
        if (errorMessage) {
          reportError(errorMessage);
        }
      })
      .catch((error: unknown) => {
        reportError(
          error instanceof Error ? error.message : 'Authentication failed.',
        );
      });
  };

  Linking.getInitialURL()
    .then(handleUrl)
    .catch(() => undefined);

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleUrl(url);
  });

  return () => subscription.remove();
}
