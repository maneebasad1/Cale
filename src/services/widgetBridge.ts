import { NativeModules, Platform } from 'react-native';

export interface WidgetSnapshotPayload {
  hero: string;
  heroSub: string;
  eaten: string;
  target: string;
  streak: string;
  dateLabel: string;
  isOver: boolean;
  ready: boolean;
  /** Local date (YYYY-MM-DD) the snapshot was built for. */
  dateKey: string;
  /** Raw daily target, so the widget can render a fresh day after midnight. */
  targetValue: number;
  /** Current streak length at snapshot time. */
  streakCount: number;
  /** Whether anything was logged on `dateKey` (streak survives into tomorrow). */
  loggedToday: boolean;
}

type WidgetBridgeNative = {
  updateSnapshot: (data: WidgetSnapshotPayload) => Promise<boolean>;
};

const NativeWidgetBridge =
  NativeModules.WidgetBridge as WidgetBridgeNative | undefined;

export async function pushWidgetSnapshot(
  payload: WidgetSnapshotPayload,
): Promise<void> {
  if (Platform.OS !== 'android' || !NativeWidgetBridge?.updateSnapshot) {
    return;
  }
  try {
    await NativeWidgetBridge.updateSnapshot(payload);
  } catch {
    // Widget updates must never break the local write path.
  }
}
