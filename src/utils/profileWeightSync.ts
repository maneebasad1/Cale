import { getProfile, saveProfile } from '../services/storage';
import type { UserProfile } from '../types';
import {
  promptCustomAdjustmentUpdate,
  shouldPromptCustomAdjustmentUpdate,
} from './profileAdjustmentPrompt';
import { buildUpdatedProfile } from './profileSave';

const WEIGHT_TOLERANCE_KG = 0.01;

/**
 * Sets the profile's current weight (recomputing maintenance/target via
 * buildUpdatedProfile) and saves it. When `promptForCustomAdjustment` is set
 * and the user has a custom deficit/surplus, asks whether to switch to auto
 * first. Resolves with the saved profile, or null if there's no profile.
 * Callers should refreshProfile() afterwards so AppContext picks it up.
 */
export async function syncProfileWeight(
  weightKg: number,
  { promptForCustomAdjustment = true }: { promptForCustomAdjustment?: boolean } = {},
): Promise<UserProfile | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  if (Math.abs(profile.weightKg - weightKg) <= WEIGHT_TOLERANCE_KG) {
    return profile;
  }

  const useAutoAdjustment =
    promptForCustomAdjustment &&
    shouldPromptCustomAdjustmentUpdate(profile, { weightKg })
      ? await new Promise<boolean>(resolve =>
          promptCustomAdjustmentUpdate(profile, { weightKg }, resolve),
        )
      : false;

  const updated = buildUpdatedProfile(profile, {
    weightKg,
    ...(useAutoAdjustment ? { adjustmentIsCustom: false } : {}),
  });
  await saveProfile(updated);
  return updated;
}
