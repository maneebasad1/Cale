import { OPENAI_API_KEY, isOpenAiConfigured } from '../config/openai';
import { canUseAiEstimate, recordAiEstimateUsage } from './aiUsageLimit';
import { withTimeout } from '../utils/networkTimeout';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 25_000;

export interface MealEstimate {
  calories: number;
  summary: string;
  confidence: 'low' | 'medium' | 'high';
}

interface MealEstimateResponse {
  calories?: number;
  summary?: string;
  confidence?: string;
}

function clampCalories(value: number): number {
  return Math.min(10_000, Math.max(1, Math.round(value)));
}

function parseConfidence(value: string | undefined): MealEstimate['confidence'] {
  if (value === 'low' || value === 'high') {
    return value;
  }
  return 'medium';
}

export function parseMealEstimatePayload(raw: unknown): MealEstimate | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as MealEstimateResponse;
  if (typeof data.calories !== 'number' || !Number.isFinite(data.calories)) {
    return null;
  }

  const summary =
    typeof data.summary === 'string' && data.summary.trim()
      ? data.summary.trim()
      : 'Estimated meal';

  return {
    calories: clampCalories(data.calories),
    summary,
    confidence: parseConfidence(data.confidence),
  };
}

export async function estimateMealCalories(
  description: string,
): Promise<{ data: MealEstimate | null; error: string | null }> {
  const meal = description.trim();
  if (!meal) {
    return { data: null, error: 'Describe what you ate first.' };
  }

  if (!isOpenAiConfigured()) {
    return {
      data: null,
      error: 'AI estimates are not configured. Add OPENAI_API_KEY in src/config/openai.ts.',
    };
  }

  const usageCheck = await canUseAiEstimate();
  if (!usageCheck.allowed) {
    return { data: null, error: usageCheck.error };
  }

  try {
    const response = await withTimeout(
      fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You estimate calories for meals. Return JSON only with keys: calories (integer kcal for the full meal), summary (short meal name, max 8 words), confidence ("low"|"medium"|"high"). Use typical portion sizes when unspecified. Be practical, not overly precise.',
            },
            {
              role: 'user',
              content: meal,
            },
          ],
        }),
      }),
      REQUEST_TIMEOUT_MS,
      'AI estimate timed out',
    );

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401) {
        return { data: null, error: 'Invalid OpenAI API key.' };
      }
      if (response.status === 429) {
        return {
          data: null,
          error:
            'OpenAI rate limit reached. Wait a minute and try again, or add billing at platform.openai.com.',
        };
      }
      return {
        data: null,
        error: body ? `AI estimate failed (${response.status}).` : `AI estimate failed (${response.status}).`,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return { data: null, error: 'AI returned an empty response.' };
    }

    const parsed = parseMealEstimatePayload(JSON.parse(content));
    if (!parsed) {
      return { data: null, error: 'Could not read the AI calorie estimate.' };
    }

    await recordAiEstimateUsage();

    return { data: parsed, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'AI estimate failed.';
    return { data: null, error: message };
  }
}
