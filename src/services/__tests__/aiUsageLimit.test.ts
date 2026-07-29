import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AI_DAILY_ESTIMATE_LIMIT,
  AI_ESTIMATE_COOLDOWN_MS,
} from '../../config/openai';
import { LOCAL_KEYS } from '../localKeys';
import {
  canUseAiEstimate,
  getAiEstimateUsage,
  recordAiEstimateUsage,
} from '../aiUsageLimit';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../config/openai', () => ({
  AI_DAILY_ESTIMATE_LIMIT: 10,
  AI_ESTIMATE_COOLDOWN_MS: 30_000,
}));

const getItemMock = AsyncStorage.getItem as jest.Mock;
const setItemMock = AsyncStorage.setItem as jest.Mock;

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('aiUsageLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getItemMock.mockResolvedValue(null);
    setItemMock.mockResolvedValue(undefined);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-16T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns full allowance when no prior usage exists', async () => {
    const usage = await getAiEstimateUsage();

    expect(usage).toEqual({
      used: 0,
      limit: AI_DAILY_ESTIMATE_LIMIT,
      remaining: AI_DAILY_ESTIMATE_LIMIT,
      cooldownSeconds: 0,
    });
  });

  it('resets count on a new calendar day', async () => {
    getItemMock.mockResolvedValue(
      JSON.stringify({
        date: '2026-07-15',
        count: 10,
        lastEstimateAt: Date.now(),
      }),
    );

    const usage = await getAiEstimateUsage();
    expect(usage.used).toBe(0);
    expect(usage.remaining).toBe(AI_DAILY_ESTIMATE_LIMIT);
  });

  it('blocks when the daily limit is reached', async () => {
    getItemMock.mockResolvedValue(
      JSON.stringify({
        date: localDateKey(),
        count: AI_DAILY_ESTIMATE_LIMIT,
        lastEstimateAt: null,
      }),
    );

    const result = await canUseAiEstimate();
    expect(result.allowed).toBe(false);
    expect(result.error).toMatch(/daily ai limit reached/i);
    expect(result.usage.remaining).toBe(0);
  });

  it('blocks during cooldown after a recent estimate', async () => {
    const now = Date.now();
    getItemMock.mockResolvedValue(
      JSON.stringify({
        date: localDateKey(),
        count: 1,
        lastEstimateAt: now - 10_000,
      }),
    );

    const result = await canUseAiEstimate();
    expect(result.allowed).toBe(false);
    expect(result.error).toMatch(/wait/i);
    expect(result.usage.cooldownSeconds).toBeGreaterThan(0);
  });

  it('records usage after a successful estimate', async () => {
    await recordAiEstimateUsage();

    expect(setItemMock).toHaveBeenCalledWith(
      LOCAL_KEYS.aiEstimateUsage,
      JSON.stringify({
        date: localDateKey(),
        count: 1,
        lastEstimateAt: Date.now(),
      }),
    );
  });
});
