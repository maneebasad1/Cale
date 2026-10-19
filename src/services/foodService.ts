import { ASIAN_FOODS } from '../data/asianFoods';
import { USDA_API_BASE, USDA_API_KEY } from '../config/usda';
import {
  getCustomFoodById,
  getCustomFoods,
} from './customFoodService';
import type { FoodItem } from '../types/food';

/** Energy (kcal) nutrient ids, in order of preference. */
const ENERGY_NUTRIENT_ID = 1008;
/** Foundation foods often only report Atwater energy (General, then Specific). */
const ATWATER_GENERAL_NUTRIENT_ID = 2047;
const ATWATER_SPECIFIC_NUTRIENT_ID = 2048;
const USDA_TIMEOUT_MS = 10_000;
const MAX_SEARCH_RESULTS = 30;

interface UsdaFoodNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  value?: number;
}

interface UsdaSearchFood {
  fdcId: number;
  description: string;
  foodNutrients?: UsdaFoodNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

interface UsdaSearchResponse {
  foods?: UsdaSearchFood[];
}

function findNutrientValue(
  nutrients: UsdaFoodNutrient[],
  nutrientId: number,
  nutrientNumber?: string,
): number | undefined {
  const match = nutrients.find(
    n =>
      (n.nutrientId === nutrientId ||
        (nutrientNumber !== undefined && n.nutrientNumber === nutrientNumber)) &&
      typeof n.value === 'number' &&
      n.value > 0,
  );
  return match?.value;
}

export function getCaloriesFromNutrients(
  nutrients: UsdaFoodNutrient[] = [],
): number {
  const value =
    findNutrientValue(nutrients, ENERGY_NUTRIENT_ID, '208') ??
    findNutrientValue(nutrients, ATWATER_GENERAL_NUTRIENT_ID, '957') ??
    findNutrientValue(nutrients, ATWATER_SPECIFIC_NUTRIENT_ID, '958');
  return Math.round(value ?? 0);
}

function mapUsdaFood(food: UsdaSearchFood): FoodItem | null {
  const calories = getCaloriesFromNutrients(food.foodNutrients);
  if (calories <= 0) {
    return null;
  }

  const servingLabel =
    food.servingSize && food.servingSizeUnit
      ? `${food.servingSize} ${food.servingSizeUnit}`
      : '100g';

  return {
    id: `usda-${food.fdcId}`,
    name: food.description,
    calories,
    servingLabel,
    region: 'general',
    source: 'usda',
    sourceRef: `USDA FDC #${food.fdcId}`,
  };
}

export function searchLocalFoods(query: string): FoodItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return ASIAN_FOODS.slice(0, 20);
  }

  return ASIAN_FOODS.filter(
    food =>
      food.name.toLowerCase().includes(q) ||
      food.region.replace('_', ' ').includes(q),
  ).slice(0, 25);
}

export function searchCustomFoods(
  query: string,
  customFoods: FoodItem[],
): FoodItem[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? customFoods.filter(food => food.name.toLowerCase().includes(q))
    : customFoods;

  return filtered.slice(0, 15);
}

export interface UsdaSearchResult {
  items: FoodItem[];
  /** Set when the online search failed (network, timeout, HTTP error). */
  error: string | null;
}

export async function searchUsdaFoods(
  query: string,
): Promise<UsdaSearchResult> {
  if (!USDA_API_KEY || query.trim().length < 2) {
    return { items: [], error: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), USDA_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      query: query.trim(),
      pageSize: '12',
      dataType: 'Foundation,SR Legacy',
      api_key: USDA_API_KEY,
    });

    const response = await fetch(`${USDA_API_BASE}/foods/search?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { items: [], error: `USDA search failed (${response.status})` };
    }

    const data = (await response.json()) as UsdaSearchResponse;
    const items = (data.foods ?? [])
      .map(mapUsdaFood)
      .filter((item): item is FoodItem => item !== null);
    return { items, error: null };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      items: [],
      error: aborted ? 'USDA search timed out' : 'USDA search unavailable',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Merge result lists in order, dropping duplicate names. */
export function mergeFoodResults(...lists: FoodItem[][]): FoodItem[] {
  const seen = new Set<string>();
  const merged: FoodItem[] = [];

  for (const item of lists.flat()) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
  }

  return merged.slice(0, MAX_SEARCH_RESULTS);
}

/** Saved (custom) + built-in foods only — fast, no network. */
export async function searchSavedFoods(query: string): Promise<FoodItem[]> {
  const custom = searchCustomFoods(query, await getCustomFoods());
  const local = searchLocalFoods(query);
  return mergeFoodResults(custom, local);
}

export interface FoodSearchResult {
  items: FoodItem[];
  /** Non-null when the online (USDA) part of the search failed. */
  remoteError: string | null;
}

export async function searchFoods(query: string): Promise<FoodSearchResult> {
  const [saved, usda] = await Promise.all([
    searchSavedFoods(query),
    searchUsdaFoods(query),
  ]);
  return {
    items: mergeFoodResults(saved, usda.items),
    remoteError: usda.error,
  };
}

export function getFoodById(id: string): FoodItem | undefined {
  return ASIAN_FOODS.find(f => f.id === id);
}

export async function resolveFoodById(
  id: string,
): Promise<FoodItem | undefined> {
  const local = getFoodById(id);
  if (local) {
    return local;
  }

  // Custom food ids may be `user-…` (local) or server UUIDs; look up any id.
  return getCustomFoodById(id);
}
