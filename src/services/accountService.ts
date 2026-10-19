import { getSupabase } from '../lib/supabase';

/**
 * Deletes the signed-in user's account on the server only.
 *
 * Callers must then run the full sign-out path (AuthContext.deleteAccount does
 * this) so local session, cached auth user, local store and reminders are
 * cleared. Signing out here directly would bypass AuthContext's explicit
 * sign-out handling and leave the app stuck on "Loading…".
 */
export async function deleteAccountOnServer(): Promise<{ error: string | null }> {
  try {
    const { error } = await getSupabase().rpc('delete_own_account');
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete account.';
    return { error: message };
  }
}
