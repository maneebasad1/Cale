import {
  estimateMealCalories,
  parseMealEstimatePayload,
} from '../mealEstimateService';
import { canUseAiEstimate, recordAiEstimateUsage } from '../aiUsageLimit';

jest.mock('../../config/openai', () => ({
  OPENAI_API_KEY: 'test-key',
  isOpenAiConfigured: () => true,
}));

jest.mock('../aiUsageLimit', () => ({
  canUseAiEstimate: jest.fn().mockResolvedValue({
    allowed: true,
    error: null,
    usage: { used: 0, limit: 10, remaining: 10, cooldownSeconds: 0 },
  }),
  recordAiEstimateUsage: jest.fn().mockResolvedValue({
    used: 1,
    limit: 10,
    remaining: 9,
    cooldownSeconds: 30,
  }),
}));

describe('parseMealEstimatePayload', () => {
  it('parses a valid estimate', () => {
    expect(
      parseMealEstimatePayload({
        calories: 620.4,
        summary: 'Chicken biryani plate',
        confidence: 'medium',
      }),
    ).toEqual({
      calories: 620,
      summary: 'Chicken biryani plate',
      confidence: 'medium',
    });
  });

  it('rejects invalid payloads', () => {
    expect(parseMealEstimatePayload({ summary: 'No calories' })).toBeNull();
  });
});

describe('estimateMealCalories', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns error when description is empty', async () => {
    const result = await estimateMealCalories('   ');
    expect(result.error).toMatch(/describe/i);
  });

  it('returns error when daily limit is reached', async () => {
    (canUseAiEstimate as jest.Mock).mockResolvedValueOnce({
      allowed: false,
      error: 'Daily AI limit reached (10/day). Try again tomorrow or use Custom kcal.',
      usage: { used: 10, limit: 10, remaining: 0, cooldownSeconds: 0 },
    });

    const result = await estimateMealCalories('2 eggs and toast');
    expect(result.error).toMatch(/daily ai limit/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls OpenAI and returns parsed calories', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                calories: 450,
                summary: 'Two eggs and toast',
                confidence: 'high',
              }),
            },
          },
        ],
      }),
    });

    const result = await estimateMealCalories('2 eggs and toast with butter');
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      calories: 450,
      summary: 'Two eggs and toast',
      confidence: 'high',
    });
    expect(recordAiEstimateUsage).toHaveBeenCalled();
  });
});
