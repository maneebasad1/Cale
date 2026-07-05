import { ASIAN_FOODS } from '../data/asianFoods';
import { USDA_API_BASE, USDA_API_KEY } from '../config/usda';
import {
  getCustomFoodById,
  getCustomFoods,
} from './customFoodService';
import type { FoodItem } from '../types/food';

const ENERGY_NUTRIENT_ID = 1008;

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

function getCaloriesFromNutrients(nutrients: UsdaFoodNutrient[] = []): number {
  const energy = nutrients.find(
    n => n.nutrientId === ENERGY_NUTRIENT_ID || n.nutrientNumber === '208',
  );
  return Math.round(energy?.value ?? 0);
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

export async function searchUsdaFoods(query: string): Promise<FoodItem[]> {
  if (!USDA_API_KEY || query.trim().length < 2) {
    return [];
  }

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
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as UsdaSearchResponse;
    return (data.foods ?? [])
      .map(mapUsdaFood)
      .filter((item): item is FoodItem => item !== null);
  } catch {
    return [];
  }
}

export async function searchFoods(query: string): Promise<FoodItem[]> {
  const custom = searchCustomFoods(query, await getCustomFoods());
  const local = searchLocalFoods(query);
  const usda = await searchUsdaFoods(query);

  const seen = new Set<string>();
  const merged: FoodItem[] = [];

  for (const item of [...custom, ...local, ...usda]) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
  }

  return merged.slice(0, 30);
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

  if (id.startsWith('user-') || isUuid(id)) {
    return getCustomFoodById(id);
  }

  return undefined;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
