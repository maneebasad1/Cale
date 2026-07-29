import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AI_DAILY_ESTIMATE_LIMIT,
  AI_ESTIMATE_COOLDOWN_MS,
} from '../config/openai';
import { LOCAL_KEYS } from './localKeys';

interface AiUsageRecord {
  date: string;
  count: number;
  lastEstimateAt: number | null;
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function readUsageRecord(): Promise<AiUsageRecord> {
  const raw = await AsyncStorage.getItem(LOCAL_KEYS.aiEstimateUsage);
  if (!raw) {
    return { date: localDateKey(), count: 0, lastEstimateAt: null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AiUsageRecord>;
    const today = localDateKey();
    if (parsed.date !== today) {
      return { date: today, count: 0, lastEstimateAt: null };
    }

    return {
      date: today,
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      lastEstimateAt:
        typeof parsed.lastEstimateAt === 'number' ? parsed.lastEstimateAt : null,
    };
  } catch {
    return { date: localDateKey(), count: 0, lastEstimateAt: null };
  }
}

async function writeUsageRecord(record: AiUsageRecord): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEYS.aiEstimateUsage, JSON.stringify(record));
}

export interface AiEstimateUsage {
  used: number;
  limit: number;
  remaining: number;
  cooldownSeconds: number;
}

export async function getAiEstimateUsage(): Promise<AiEstimateUsage> {
  const record = await readUsageRecord();
  const remaining = Math.max(0, AI_DAILY_ESTIMATE_LIMIT - record.count);
  const cooldownMs = record.lastEstimateAt
    ? Math.max(0, AI_ESTIMATE_COOLDOWN_MS - (Date.now() - record.lastEstimateAt))
    : 0;

  return {
    used: record.count,
    limit: AI_DAILY_ESTIMATE_LIMIT,
    remaining,
    cooldownSeconds: Math.ceil(cooldownMs / 1000),
  };
}

export async function canUseAiEstimate(): Promise<{
  allowed: boolean;
  error: string | null;
  usage: AiEstimateUsage;
}> {
  const usage = await getAiEstimateUsage();

  if (usage.remaining <= 0) {
    return {
      allowed: false,
      error: `Daily AI limit reached (${AI_DAILY_ESTIMATE_LIMIT}/day). Try again tomorrow or use Custom kcal.`,
      usage,
    };
  }

  if (usage.cooldownSeconds > 0) {
    return {
      allowed: false,
      error: `Please wait ${usage.cooldownSeconds}s before the next AI estimate.`,
      usage,
    };
  }

  return { allowed: true, error: null, usage };
}

export async function recordAiEstimateUsage(): Promise<AiEstimateUsage> {
  const record = await readUsageRecord();
  const next: AiUsageRecord = {
    date: localDateKey(),
    count: record.count + 1,
    lastEstimateAt: Date.now(),
  };
  await writeUsageRecord(next);
  return getAiEstimateUsage();
}
