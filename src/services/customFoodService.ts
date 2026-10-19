import type { FoodItem } from '../types/food';
import { createId } from '../utils/id';
import {
  localGetCustomFoods,
  localUpdateCustomFoods,
} from './localStore';
import { enqueueSync } from './syncQueue';

export interface CustomFoodInput {
  name: string;
  calories: number;
  servingLabel?: string;
}

export async function getCustomFoods(): Promise<FoodItem[]> {
  return localGetCustomFoods();
}

export async function addCustomFood(
  input: CustomFoodInput,
): Promise<FoodItem> {
  const food: FoodItem = {
    id: createId(),
    name: input.name.trim(),
    calories: input.calories,
    servingLabel: input.servingLabel?.trim() || '1 serving',
    region: 'general',
    source: 'user',
  };
  await localUpdateCustomFoods(foods => [food, ...foods]);
  await enqueueSync({
    entity: 'customFood',
    operation: 'create',
    payload: { food },
    coalesceKey: food.id,
  });
  return food;
}

export async function getCustomFoodById(
  id: string,
): Promise<FoodItem | undefined> {
  const foods = await localGetCustomFoods();
  return foods.find(f => f.id === id);
}

export async function updateCustomFood(
  id: string,
  input: CustomFoodInput,
): Promise<FoodItem | undefined> {
  let next: FoodItem | undefined;
  await localUpdateCustomFoods(foods => {
    const current = foods.find(f => f.id === id);
    if (!current) {
      return foods;
    }
    const updated: FoodItem = {
      ...current,
      name: input.name.trim(),
      calories: input.calories,
      servingLabel: input.servingLabel?.trim() || '1 serving',
    };
    next = updated;
    return foods.map(f => (f.id === id ? updated : f));
  });
  if (!next) {
    return undefined;
  }
  await enqueueSync({
    entity: 'customFood',
    operation: 'update',
    payload: { food: next },
    coalesceKey: id,
  });
  return next;
}

export async function deleteCustomFood(id: string): Promise<void> {
  await localUpdateCustomFoods(foods => foods.filter(f => f.id !== id));
  await enqueueSync({
    entity: 'customFood',
    operation: 'delete',
    payload: { id },
    coalesceKey: id,
  });
}
