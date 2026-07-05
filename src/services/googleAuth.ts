import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  isGoogleSignInConfigured,
} from '../config/supabase';
import { getSupabase } from '../lib/supabase';

let configured = false;

export function configureGoogleSignIn(): void {
  if (!isGoogleSignInConfigured() || configured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
  });
  configured = true;
}

export async function signInWithGoogleNative(): Promise<{
  error: string | null;
}> {
  if (!isGoogleSignInConfigured()) {
    return {
      error:
        'Google Sign-In is not configured. Add GOOGLE_WEB_CLIENT_ID in src/config/supabase.ts',
    };
  }

  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;

    if (!idToken) {
      return { error: 'Google sign-in did not return an ID token.' };
    }

    const { error } = await getSupabase().auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    return { error: error?.message ?? null };
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return { error: null };
    }
    if (code === statusCodes.IN_PROGRESS) {
      return { error: 'Sign-in already in progress.' };
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { error: 'Google Play Services is not available.' };
    }

    const message =
      error instanceof Error ? error.message : 'Google sign-in failed.';
    return { error: message };
  }
}

export async function signOutGoogle(): Promise<void> {
  if (!isGoogleSignInConfigured()) {
    return;
  }

  try {
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    // User may not have signed in with Google.
  }
}
