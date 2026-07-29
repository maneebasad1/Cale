/**
 * OpenAI API key for AI meal calorie estimates.
 * Get a key at https://platform.openai.com/api-keys
 *
 * Leave empty to hide the "Describe meal" option in Add entry.
 * Do not commit real keys — paste locally only.
 */
export const OPENAI_API_KEY = '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';

/** Max successful AI meal estimates per device per calendar day. */
export const AI_DAILY_ESTIMATE_LIMIT = 10;

/** Minimum wait between AI estimates on this device. */
export const AI_ESTIMATE_COOLDOWN_MS = 30_000;

export function isOpenAiConfigured(): boolean {
  return Boolean(OPENAI_API_KEY.trim());
}
