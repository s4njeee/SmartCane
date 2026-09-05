import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from './firebaseConfig';

export type RoutePoint = {
  latitude: number;
  longitude: number;
  time: string;
  address?: string;
};

export type CaneItem = {
  id: string;
  username: string;
  connected: boolean;
  battery: number;
  /** Ultrasonic sensor — true when obstacle is detected */
  obstacle: boolean;
  /** PIR motion sensor — true when nearby motion is detected */
  motion?: boolean;
  gps: boolean;
  fall?: boolean;
  sos?: boolean;
  routes: RoutePoint[];
  number?: string;
  caneID?: string;
};

export type CaneDeviceTelemetry = {
  caneID: string;
  latitude: number;
  longitude: number;
  gps: boolean;
  connected: boolean;
  obstacle: boolean;
  motion: boolean;
  fall: boolean;
  sos: boolean;
  battery: number;
  updatedAt: number;
};

export type AlertItem = {
  id: string;
  userId: string;
  username: string;
  type: 'fall' | 'emergency' | 'obstacle' | 'motion';
  message: string;
  location: string;
  active: boolean;
  /** Firestore Timestamp, { seconds }, or millis */
  timestamp?: { seconds: number; nanoseconds?: number } | { toDate: () => Date } | number | null;
};

export function getCurrentUserId() {
  return auth.currentUser?.uid ?? null;
}

export async function saveUserProfile(
  userId: string,
  data: Record<string, unknown>
) {
  await setDoc(
    doc(db, 'users', userId),
    { ...data, userId, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function createUserProfileOnSignup(
  userId: string,
  profile: {
    displayName: string;
    email: string;
    phoneNumber: string;
  }
) {
  await updateProfile(auth.currentUser!, { displayName: profile.displayName });
  await saveUserProfile(userId, {
    displayName: profile.displayName,
    email: profile.email,
    phoneNumber: profile.phoneNumber,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeUserCanes(
  userId: string,
  onData: (canes: CaneItem[]) => void
) {
  const canesRef = collection(db, 'users', userId, 'canes');
  return onSnapshot(
    canesRef,
    (snapshot) => {
      const canes = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          username: data.username ?? '',
          connected: data.connected ?? false,
          battery: data.battery ?? 0,
          obstacle: data.obstacle ?? false,
          motion: data.motion ?? false,
          gps: data.gps ?? false,
          routes: data.routes ?? [],
          number: data.number,
          caneID: data.caneID,
        } satisfies CaneItem;
      });
      onData(canes);
    },
    (error) => {
      console.log('Canes subscribe error:', error.message);
      onData([]);
    }
  );
}

function readNumber(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (value == null || value === '') continue;
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

/** Reads epoch seconds from number, ms, Firestore Timestamp, or date string. */
function readTimestampSeconds(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (value == null || value === '') continue;

    if (typeof value === 'object') {
      const ts = value as {
        seconds?: number;
        toMillis?: () => number;
        _seconds?: number;
      };
      if (typeof ts.toMillis === 'function') {
        const ms = ts.toMillis();
        if (Number.isFinite(ms) && ms > 0) return ms / 1000;
      }
      if (typeof ts.seconds === 'number' && Number.isFinite(ts.seconds)) {
        return ts.seconds;
      }
      if (typeof ts._seconds === 'number' && Number.isFinite(ts._seconds)) {
        return ts._seconds;
      }
    }

    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value > 1e12 ? value / 1000 : value;
    }

    if (typeof value === 'string') {
      const asNum = Number(value);
      if (Number.isFinite(asNum) && asNum > 0) {
        return asNum > 1e12 ? asNum / 1000 : asNum;
      }
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed) && parsed > 0) return parsed / 1000;
    }
  }
  return 0;
}

function readBoolean(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (value == null) continue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
  }
  return false;
}

export function subscribeCaneDevices(
  onData: (devices: Record<string, CaneDeviceTelemetry>) => void
) {
  return onSnapshot(
    collection(db, 'devices'),
    (snapshot) => {
      const devices: Record<string, CaneDeviceTelemetry> = {};
      snapshot.docs.forEach((entry) => {
        const data = entry.data() as Record<string, unknown>;
        const ids = extractDeviceIds(entry.id, data);
        const primaryId = ids[0] ?? entry.id;
        const latitude = readNumber(data, ['latitude', 'lat', 'Latitude', 'LAT']);
        const longitude = readNumber(data, [
          'longitude',
          'lng',
          'lon',
          'long',
          'Longitude',
          'LNG',
        ]);
        const hasFix =
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          !(latitude === 0 && longitude === 0);
        const reportedGps = readBoolean(data, ['gps', 'GPS', 'gpsFix', 'fix']);
        const reportedOnline = readBoolean(data, [
          'connected',
          'online',
          'Connected',
        ]);
        const rawBattery = readNumber(data, [
          'battery',
          'Battery',
          'batteryPercent',
        ]);
        const telemetry: CaneDeviceTelemetry = {
          caneID: primaryId,
          latitude,
          longitude,
          // Last-known fix only — live/offline is decided by freshness in the app
          gps: reportedGps || hasFix,
          connected: reportedOnline,
          obstacle: readBoolean(data, [
            'obstacle',
            'Obstacle',
            'ultrasonic',
            'Ultrasonic',
            'ultraSonic',
          ]),
          motion: readBoolean(data, ['motion', 'Motion', 'pir', 'PIR', 'pirSensor']),
          fall: readBoolean(data, ['fall', 'Fall']),
          sos: readBoolean(data, ['sos', 'SOS', 'Sos']),
          battery: Math.max(0, Math.min(100, Math.round(rawBattery))),
          updatedAt: readTimestampSeconds(data, [
            'updatedAt',
            'timestamp',
            'time',
            'ts',
            'lastSeen',
            'lastUpdate',
          ]),
        };

        ids.forEach((id) => {
          devices[id] = telemetry;
          devices[id.toLowerCase()] = telemetry;
        });
      });
      onData(devices);
    },
    (error) => {
      console.log('Devices subscribe error:', error.message);
      onData({});
    }
  );
}

function extractDeviceIds(entryId: string, data: Record<string, unknown>) {
  const raw = [
    entryId,
    data.caneID,
    data.caneId,
    data.deviceId,
    data.deviceID,
    data.device_id,
    data.id,
  ];

  const ids: string[] = [];
  raw.forEach((value) => {
    if (value == null) return;
    const text = String(value).trim();
    if (!text) return;
    if (!ids.some((id) => id.toLowerCase() === text.toLowerCase())) {
      ids.push(text);
    }
  });
  return ids;
}

export function isKnownCaneDevice(
  caneID: string,
  devices: Record<string, CaneDeviceTelemetry>
) {
  const target = caneID.trim();
  if (!target) return false;
  return Boolean(devices[target] || devices[target.toLowerCase()]);
}

export async function findCaneDevice(caneID: string): Promise<string | null> {
  const trimmed = caneID.trim();
  if (!trimmed) return null;

  try {
    const byId = await getDoc(doc(db, 'devices', trimmed));
    if (byId.exists()) {
      const ids = extractDeviceIds(byId.id, byId.data() as Record<string, unknown>);
      return ids.find((id) => id.toLowerCase() === trimmed.toLowerCase()) ?? ids[0] ?? byId.id;
    }
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      throw new Error(
        'Cannot read devices. Publish Firestore rules for /devices in Firebase Console.'
      );
    }
  }

  let snapshot;
  try {
    snapshot = await getDocs(collection(db, 'devices'));
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      throw new Error(
        'Cannot read devices. Publish Firestore rules for /devices in Firebase Console.'
      );
    }
    throw new Error(error?.message || 'Could not search devices.');
  }

  const target = trimmed.toLowerCase();
  for (const entry of snapshot.docs) {
    const data = entry.data() as Record<string, unknown>;
    const ids = extractDeviceIds(entry.id, data);
    const matched = ids.find((id) => id.toLowerCase() === target);
    if (matched) return matched;
  }

  return null;
}

export async function addUserCane(
  userId: string,
  cane: Omit<CaneItem, 'id' | 'routes'>,
  options?: {
    knownDevices?: Record<string, CaneDeviceTelemetry>;
    existingCanes?: CaneItem[];
  }
) {
  const inputId = cane.caneID?.trim().toUpperCase();
  if (!inputId) {
    throw new Error('Cane ID is required.');
  }

  // Block wrong / unregistered Cane IDs (must exist in Firebase devices, e.g. SC001)
  let resolvedId: string | null = null;

  if (options?.knownDevices) {
    const local =
      options.knownDevices[inputId] ||
      options.knownDevices[inputId.toLowerCase()] ||
      options.knownDevices[cane.caneID?.trim() ?? ''];
    if (local) resolvedId = (local.caneID || inputId).toUpperCase();
  }

  if (!resolvedId) {
    const found = await findCaneDevice(inputId);
    resolvedId = found ? found.toUpperCase() : null;
  }

  if (!resolvedId) {
    throw new Error(
      `Wrong Cane ID "${inputId}". Use the exact ID set on your cane device (example: SC001).`
    );
  }

  const alreadyAdded = options?.existingCanes?.some(
    (item) => item.caneID?.trim().toUpperCase() === resolvedId
  );
  if (alreadyAdded) {
    throw new Error(`Cane ID "${resolvedId}" is already added to your account.`);
  }

  await addDoc(collection(db, 'users', userId, 'canes'), {
    ...cane,
    caneID: resolvedId,
    motion: cane.motion ?? false,
    routes: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserCane(userId: string, caneId: string) {
  await deleteDoc(doc(db, 'users', userId, 'canes', caneId));
}

export async function syncCaneState(
  userId: string,
  caneId: string,
  data: Partial<CaneItem>
) {
  const { id: _id, ...payload } = data as CaneItem;
  await updateDoc(doc(db, 'users', userId, 'canes', caneId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

function alertTimestampMs(value: AlertItem['timestamp']): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const seconds = (value as { seconds?: number }).seconds;
  return typeof seconds === 'number' ? seconds * 1000 : 0;
}

export function formatAlertTime(value: AlertItem['timestamp']): string {
  const ms = alertTimestampMs(value);
  if (!ms) return '';
  return new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Subscribe without orderBy so no composite index is required. */
export function subscribeUserAlerts(
  userId: string,
  onData: (alerts: AlertItem[]) => void,
  onError?: (message: string) => void
) {
  const alertsQuery = query(
    collection(db, 'alerts'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    alertsQuery,
    (snapshot) => {
      const alerts = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as Omit<AlertItem, 'id'>),
      }));
      alerts.sort(
        (a, b) => alertTimestampMs(b.timestamp) - alertTimestampMs(a.timestamp)
      );
      onData(alerts);
    },
    (error) => {
      console.log('Alerts subscribe error:', error.message);
      onError?.(error.message);
      onData([]);
    }
  );
}

export async function createAlert(
  userId: string,
  alert: Omit<AlertItem, 'id' | 'userId' | 'timestamp'>
) {
  await addDoc(collection(db, 'alerts'), {
    ...alert,
    userId,
    active: alert.active ?? true,
    timestamp: serverTimestamp(),
  });
}

/** Mark matching active alerts as inactive (sensor cleared / user dismissed). */
export async function deactivateAlerts(
  userId: string,
  match: { type: AlertItem['type']; username?: string }
) {
  const snapshot = await getDocs(
    query(collection(db, 'alerts'), where('userId', '==', userId))
  );
  const jobs = snapshot.docs
    .filter((entry) => {
      const data = entry.data();
      if (!data.active) return false;
      if (data.type !== match.type) return false;
      if (match.username && data.username !== match.username) return false;
      return true;
    })
    .map((entry) => updateDoc(entry.ref, { active: false }));
  await Promise.all(jobs);
}

export async function resolveAlert(alertId: string) {
  await updateDoc(doc(db, 'alerts', alertId), { active: false });
}