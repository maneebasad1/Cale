import type { User } from '@supabase/supabase-js';

export function getUserAvatarUrl(user: User | null | undefined): string | null {
  if (!user) {
    return null;
  }

  const meta = user.user_metadata ?? {};
  const url = meta.avatar_url ?? meta.picture;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

export function getUserDisplayName(user: User | null | undefined): string | null {
  if (!user) {
    return null;
  }

  const meta = user.user_metadata ?? {};
  const name = meta.full_name ?? meta.name;
  return typeof name === 'string' && name.trim().length > 0 ? name.trim() : null;
}

export function getUserInitials(user: User | null | undefined): string {
  const name = getUserDisplayName(user);
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  const email = user?.email?.trim();
  if (email) {
    return email[0].toUpperCase();
  }

  return '?';
}
