import type { FoodItem } from '../types/food';
import {
  deleteCustomFoodRow,
  fetchCustomFoodById,
  fetchCustomFoods,
  insertCustomFood,
  updateCustomFoodRow,
} from './supabaseData';

export interface CustomFoodInput {
  name: string;
  calories: number;
  servingLabel?: string;
}

export async function getCustomFoods(): Promise<FoodItem[]> {
  return fetchCustomFoods();
}

export async function addCustomFood(
  input: CustomFoodInput,
): Promise<FoodItem> {
  return insertCustomFood(input);
}

export async function getCustomFoodById(
  id: string,
): Promise<FoodItem | undefined> {
  return fetchCustomFoodById(id);
}

export async function updateCustomFood(
  id: string,
  input: CustomFoodInput,
): Promise<FoodItem | undefined> {
  return updateCustomFoodRow(id, input);
}

export async function deleteCustomFood(id: string): Promise<void> {
  await deleteCustomFoodRow(id);
}
