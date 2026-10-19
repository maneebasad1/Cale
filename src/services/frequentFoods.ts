import type { CalorieEntry, DailyLog } from '../types';
import type { FoodItem } from '../types/food';
import { getAllLogs } from './storage';
import { getCustomFoods } from './customFoodService';
import { getFoodById } from './foodService';

interface FoodTally {
  key: string;
  count: number;
  lastLogged: string;
  entry: CalorieEntry;
}

function foodKey(entry: CalorieEntry): string {
  return entry.foodId ?? entry.foodName?.toLowerCase() ?? entry.id;
}

function scoreTally(tally: FoodTally): number {
  const recencyBoost = new Date(tally.lastLogged).getTime() / 1_000_000_000_000;
  return tally.count * 10 + recencyBoost;
}

export async function getFrequentFoods(limit = 15): Promise<FoodItem[]> {
  const logs = await getAllLogs();
  const tallies = new Map<string, FoodTally>();

  Object.values(logs).forEach((log: DailyLog) => {
    log.entries.forEach(entry => {
      if (entry.entryMode !== 'food' && !entry.foodName) {
        return;
      }

      const key = foodKey(entry);
      const existing = tallies.get(key);
      if (existing) {
        existing.count += 1;
        if (log.date >= existing.lastLogged) {
          existing.lastLogged = log.date;
          existing.entry = entry;
        }
      } else {
        tallies.set(key, {
          key,
          count: 1,
          lastLogged: log.date,
          entry,
        });
      }
    });
  });

  const sorted = [...tallies.values()].sort(
    (a, b) => scoreTally(b) - scoreTally(a),
  );

  const customFoods = await getCustomFoods();
  const customById = new Map(customFoods.map(food => [food.id, food]));

  const foods: FoodItem[] = [];
  for (const tally of sorted.slice(0, limit)) {
    const food = entryToFoodItem(tally.entry, customById);
    if (food) {
      foods.push(food);
    }
  }

  return foods;
}

function entryToFoodItem(
  entry: CalorieEntry,
  customById: Map<string, FoodItem>,
): FoodItem | null {
  if (entry.foodId) {
    // Custom foods can have `user-` ids (local) or server UUIDs (synced).
    const custom = customById.get(entry.foodId);
    if (custom) {
      return custom;
    }
    const local = getFoodById(entry.foodId);
    if (local) {
      return local;
    }
  }

  if (!entry.foodName) {
    return null;
  }

  return {
    id: entry.foodId ?? `freq-${entry.foodName.toLowerCase().replace(/\s+/g, '-')}`,
    name: entry.foodName,
    calories: entry.calories,
    servingLabel: entry.servingLabel ?? '1 serving',
    region: 'general',
    source: entry.foodId?.startsWith('user-') ? 'user' : 'local',
  };
}
