import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_MODE_KEY = '@caltrack/guest-mode';
const SAVE_BANNER_DISMISSED_KEY = '@caltrack/save-progress-banner-dismissed';

export async function getGuestMode(): Promise<boolean> {
  const value = await AsyncStorage.getItem(GUEST_MODE_KEY);
  return value === '1';
}

export async function setGuestMode(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(GUEST_MODE_KEY, '1');
    return;
  }
  await AsyncStorage.removeItem(GUEST_MODE_KEY);
}

export async function isSaveProgressBannerDismissed(): Promise<boolean> {
  const value = await AsyncStorage.getItem(SAVE_BANNER_DISMISSED_KEY);
  return value === '1';
}

export async function dismissSaveProgressBanner(): Promise<void> {
  await AsyncStorage.setItem(SAVE_BANNER_DISMISSED_KEY, '1');
}
