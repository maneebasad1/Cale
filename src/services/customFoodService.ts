import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodItem } from '../types/food';

const CUSTOM_FOODS_KEY = '@caltrack/custom-foods';

export interface CustomFoodInput {
  name: string;
  calories: number;
  servingLabel?: string;
}

function createCustomFoodId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getCustomFoods(): Promise<FoodItem[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_FOODS_KEY);
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as FoodItem[];
}

async function saveCustomFoods(foods: FoodItem[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_FOODS_KEY, JSON.stringify(foods));
}

export async function addCustomFood(
  input: CustomFoodInput,
): Promise<FoodItem> {
  const foods = await getCustomFoods();
  const food: FoodItem = {
    id: createCustomFoodId(),
    name: input.name.trim(),
    calories: input.calories,
    servingLabel: input.servingLabel?.trim() || '1 serving',
    region: 'general',
    source: 'user',
  };
  foods.unshift(food);
  await saveCustomFoods(foods);
  return food;
}

export async function getCustomFoodById(
  id: string,
): Promise<FoodItem | undefined> {
  const foods = await getCustomFoods();
  return foods.find(f => f.id === id);
}

export async function updateCustomFood(
  id: string,
  input: CustomFoodInput,
): Promise<FoodItem | undefined> {
  const foods = await getCustomFoods();
  const index = foods.findIndex(f => f.id === id);
  if (index === -1) {
    return undefined;
  }

  const updated: FoodItem = {
    ...foods[index],
    name: input.name.trim(),
    calories: input.calories,
    servingLabel: input.servingLabel?.trim() || '1 serving',
  };
  foods[index] = updated;
  await saveCustomFoods(foods);
  return updated;
}

export async function deleteCustomFood(id: string): Promise<void> {
  const foods = await getCustomFoods();
  await saveCustomFoods(foods.filter(f => f.id !== id));
}
