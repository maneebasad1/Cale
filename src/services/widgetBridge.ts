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
