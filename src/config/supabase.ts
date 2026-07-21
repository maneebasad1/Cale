/**
 * Supabase project credentials.
 * Create a project at https://supabase.com, then paste your URL and anon key here.
 * Run the SQL in supabase/schema.sql in the Supabase SQL editor.
 */
export const SUPABASE_URL = 'https://wpwvbdcvdjvdmwokdxua.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_0Ip66e_KMMYvfb8F7HxY-g_a_zkrAUa';

/** Web Client ID from Google Cloud Console (OAuth 2.0 → Web application) */
export const GOOGLE_WEB_CLIENT_ID =
  '337201354722-3racson416dc8bhkev2llb71k6qn1bl1.apps.googleusercontent.com';

/** iOS Client ID from Google Cloud Console */
export const GOOGLE_IOS_CLIENT_ID =
  '337201354722-kd91j1j46f6t7ug4hhqikv60jbhnhk9e.apps.googleusercontent.com';

/** Deep link used for email confirmation and password-reset redirects. */
export const AUTH_REDIRECT_URL = 'cale://auth/callback';

/**
 * HTTPS page that receives Supabase email confirmation, then opens the app.
 * Deploy web/auth-callback/ (see README there), then paste your URL here.
 * Required when Supabase custom SMTP is not set up (default email template).
 *
 * Example: 'https://your-site.netlify.app'
 */
export const AUTH_WEB_REDIRECT_URL = '';

/** Redirect target for sign-up / magic-link emails. */
export function getEmailRedirectUrl(): string {
  return AUTH_WEB_REDIRECT_URL.trim() || AUTH_REDIRECT_URL;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(GOOGLE_WEB_CLIENT_ID);
}
