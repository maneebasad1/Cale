import { getSupabase } from '../lib/supabase';
import { resetLocalDataOnSignOut } from '../context/SyncContext';
import { signOutGoogle } from './googleAuth';

export async function deleteAccount(): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.rpc('delete_own_account');

    if (error) {
      return { error: error.message };
    }

    await signOutGoogle();
    await supabase.auth.signOut();
    await resetLocalDataOnSignOut();
    return { error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete account.';
    return { error: message };
  }
}
