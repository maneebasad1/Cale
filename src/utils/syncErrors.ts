/**
 * Classify sync failures. Transient failures (offline, timeouts, expired or
 * missing auth) say nothing about the item itself, so they must not count
 * toward the "needs attention" retry cap.
 */
const TRANSIENT_PATTERNS = [
  'network',
  'timed out',
  'timeout',
  'failed to fetch',
  'aborted',
  'abort',
  'not authenticated',
  'jwt',
  'auth session missing',
  'refresh token',
  'fetch failed',
];

function errorText(error: unknown): string {
  if (!error) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return [record.name, record.message, record.details, record.code]
      .filter(part => typeof part === 'string')
      .join(' ');
  }
  return String(error);
}

export function isTransientSyncError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    // PostgREST: PGRST301 = JWT expired / invalid; HTTP 401 = unauthorized.
    if (record.code === 'PGRST301' || record.status === 401) {
      return true;
    }
    if (record.name === 'AbortError' || record.name === 'NetworkTimeoutError') {
      return true;
    }
  }
  const text = errorText(error).toLowerCase();
  if (!text) {
    return false;
  }
  return TRANSIENT_PATTERNS.some(pattern => text.includes(pattern));
}

export function syncErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  return 'Sync failed';
}
