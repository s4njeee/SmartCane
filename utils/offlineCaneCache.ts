import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CaneDeviceTelemetry, CaneItem } from '../firebase/appData';

export type OfflineCaneSnapshot = {
  canes: CaneItem[];
  devices: Record<string, CaneDeviceTelemetry>;
  savedAt: number;
};

function storageKey(userId: string) {
  return `smartcane_offline_${userId}`;
}

export async function loadOfflineCaneSnapshot(
  userId: string
): Promise<OfflineCaneSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineCaneSnapshot;
    if (!parsed || !Array.isArray(parsed.canes) || parsed.canes.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveOfflineCaneSnapshot(
  userId: string,
  snapshot: OfflineCaneSnapshot
) {
  if (!snapshot.canes.length) return;
  try {
    await AsyncStorage.setItem(
      storageKey(userId),
      JSON.stringify({ ...snapshot, savedAt: Date.now() })
    );
  } catch {
    /* storage full / unavailable */
  }
}
