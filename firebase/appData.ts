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
  stolen?: boolean;
  frontCm?: number;
  upperCm?: number;
  holeCm?: number;
  accel?: number;
  gyro?: number;
  routes: RoutePoint[];
  number?: string;
  caneID?: string;
  eyeglassConnected?: boolean;
  eyeglassVoice?: string;
  eyeglassObstacle?: boolean;
  eyeglassBattery?: number;
};

export type CaneDeviceTelemetry = {
  caneID: string;
  deviceType?: string;
  pairedCaneID?: string;
  voiceCommand?: string;
  eyeglassConnected?: boolean;
  /** True only when the payload explicitly said the glasses are off. */
  eyeglassPowerOff?: boolean;
  eyeglassBattery?: number;
  eyeglassObstacle?: boolean;
  eyeglassUpdatedAt?: number;
  eyeglassSeq?: number;
  latitude: number;
  longitude: number;
  gps: boolean;
  connected: boolean;
  obstacle: boolean;
  motion: boolean;
  fall: boolean;
  sos: boolean;
  stolen?: boolean;
  eyeglassSos?: boolean;
  emergencyReason?: string;
  frontCm?: number;
  upperCm?: number;
  holeCm?: number;
  accel?: number;
  gyro?: number;
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

/**
 * Wi‑Fi / power flag. `null` means the device did not send one
 * (missing is not the same as turned off).
 */
function readOnlineState(
  data: Record<string, unknown>,
  keys: string[]
): boolean | null {
  for (const key of keys) {
    const value = data[key];
    if (value == null) continue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (
        normalized === 'true' ||
        normalized === '1' ||
        normalized === 'on' ||
        normalized === 'online' ||
        normalized === 'yes' ||
        normalized === 'connected'
      ) {
        return true;
      }
      if (
        normalized === 'false' ||
        normalized === '0' ||
        normalized === 'off' ||
        normalized === 'offline' ||
        normalized === 'no' ||
        normalized === 'disconnected'
      ) {
        return false;
      }
    }
  }
  return null;
}

/** Like readBoolean, but also accepts on/online/yes style Wi‑Fi flags. */
function readOnlineFlag(data: Record<string, unknown>, keys: string[]) {
  return readOnlineState(data, keys) === true;
}

const eyeglassLiveAt: Record<string, number> = {};
const eyeglassLastSeq: Record<string, number> = {};
const eyeglassLastServerAt: Record<string, number> = {};

export function subscribeCaneDevices(
  onData: (devices: Record<string, CaneDeviceTelemetry>) => void
) {
  return onSnapshot(
    collection(db, 'devices'),
    (snapshot) => {
      const devices: Record<string, CaneDeviceTelemetry> = {};
      snapshot.docs.forEach((entry) => {
        const data = entry.data() as Record<string, unknown>;
        // Problem reports are bridged through /devices for admin delivery.
        const reportType = String(data.deviceType ?? data.type ?? '').toLowerCase();
        if (
          data.isProblemReport === true ||
          reportType === 'problem_report' ||
          reportType === 'problem-report' ||
          reportType === 'admin_report' ||
          String(data.caneID ?? '').toUpperCase() === 'ADMIN-REPORT'
        ) {
          return;
        }
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
        const deviceOnlineState = readOnlineState(data, [
          'connected',
          'online',
          'Connected',
          'wifi',
          'WiFi',
          'isOnline',
          'isConnected',
        ]);
        const reportedOnline = deviceOnlineState === true;
        const glassOnlineState = readOnlineState(data, [
          'eyeglassConnected',
          'eyeglassOnline',
          'smartglassConnected',
          'smartglassOnline',
          'glassConnected',
          'glassOnline',
        ]);
        const glassRecord = isEyeglassRecord(entry.id, data);
        const rawBattery = readNumber(data, [
          'battery',
          'Battery',
          'batteryPercent',
        ]);
        const rawGlassBattery = readNumber(
          data,
          glassRecord
            ? [
                'eyeglassBattery',
                'eyeglassBatteryPercent',
                'battery',
                'Battery',
                'batteryPercent',
              ]
            : ['eyeglassBattery', 'eyeglassBatteryPercent']
        );
        // Only treat generic `seq` as a glasses beat on dedicated glass docs —
        // cane `seq` must not mark the eyeglass online.
        const glassSeq = readNumber(
          data,
          glassRecord
            ? ['eyeglassSeq', 'eyeglassBeat', 'seq', 'beat']
            : ['eyeglassSeq', 'eyeglassBeat']
        );
        let glassUpdated = readTimestampSeconds(data, [
          'eyeglassUpdatedAt',
          'eyeglassUpdated',
          'eyeglassUpdatedMs',
          'eyeglassSeenAt',
        ]);
        const previousSeq = eyeglassLastSeq[primaryId];
        if (glassSeq > 0 && previousSeq != null && previousSeq !== glassSeq) {
          eyeglassLastSeq[primaryId] = glassSeq;
          eyeglassLiveAt[primaryId] = Date.now() / 1000;
        } else if (glassSeq > 0 && previousSeq == null) {
          eyeglassLastSeq[primaryId] = glassSeq;
        }
        const serverUpdated =
          typeof entry.updateTime?.toMillis === 'function'
            ? entry.updateTime.toMillis() / 1000
            : (entry.updateTime?.seconds ?? 0);
        // New Firestore write from the glasses ESP = on + on Wi‑Fi.
        if (glassRecord && serverUpdated > 0) {
          const prevServer = eyeglassLastServerAt[primaryId];
          if (prevServer != null && serverUpdated !== prevServer) {
            eyeglassLiveAt[primaryId] = Date.now() / 1000;
          }
          eyeglassLastServerAt[primaryId] = serverUpdated;
        }
        const unixOk = glassUpdated >= 1_600_000_000;
        const liveAt = eyeglassLiveAt[primaryId] || 0;
        glassUpdated = unixOk ? Math.max(glassUpdated, liveAt) : liveAt || glassUpdated;
        const fieldUpdated = readTimestampSeconds(data, [
          'updatedAt',
          'timestamp',
          'time',
          'ts',
          'lastSeen',
          'lastUpdate',
        ]);
        const fieldSec =
          fieldUpdated > 1e12 ? fieldUpdated / 1000 : fieldUpdated;
        const fieldPlausible =
          fieldSec >= 1_600_000_000 && fieldSec <= Date.now() / 1000 + 120;
        const updatedAt = Math.max(fieldPlausible ? fieldSec : 0, serverUpdated);
        const telemetry: CaneDeviceTelemetry = {
          caneID: primaryId,
          deviceType:
            typeof data.deviceType === 'string'
              ? data.deviceType
              : glassRecord
                ? 'eyeglass'
                : 'cane',
          pairedCaneID:
            typeof data.pairedCaneID === 'string' ? data.pairedCaneID : undefined,
          voiceCommand:
            typeof data.voiceCommand === 'string' ? data.voiceCommand : undefined,
          eyeglassConnected:
            glassOnlineState === true || (glassRecord && reportedOnline),
          eyeglassPowerOff: glassRecord
            ? deviceOnlineState === false || glassOnlineState === false
            : glassOnlineState === false,
          eyeglassBattery: Math.max(0, Math.min(100, Math.round(rawGlassBattery))),
          eyeglassObstacle: readBoolean(data, [
            'eyeglassObstacle',
            'eyeglassObstacleAhead',
          ]),
          eyeglassUpdatedAt: glassRecord
            ? Math.max(glassUpdated || 0, updatedAt || 0)
            : glassUpdated,
          eyeglassSeq: glassSeq || undefined,
          latitude,
          longitude,
          // Last-known fix only — live/offline is decided by freshness in the app
          gps: reportedGps || hasFix,
          connected: reportedOnline,
          obstacle: readBoolean(data, [
            'obstacle',
            'Obstacle',
            'obstacleAhead',
            'ultrasonic',
            'Ultrasonic',
            'ultraSonic',
          ]),
          motion: readBoolean(data, ['motion', 'Motion', 'pir', 'PIR', 'pirSensor']),
          fall: readBoolean(data, ['fall', 'Fall']),
          sos: readBoolean(data, ['sos', 'SOS', 'Sos', 'eyeglassSos']),
          stolen: readBoolean(data, ['stolen', 'Stolen', 'caneStolen']),
          eyeglassSos: readBoolean(data, ['eyeglassSos', 'eyeglassSOS']),
          emergencyReason:
            typeof data.emergencyReason === 'string' ? data.emergencyReason : undefined,
          frontCm: readNumber(data, ['frontCm', 'front', 'Front']),
          upperCm: readNumber(data, ['upperCm', 'upper', 'Upper']),
          holeCm: readNumber(data, ['holeCm', 'hole', 'Hole']),
          accel: readNumber(data, ['accel', 'accelMag', 'acceleration']),
          gyro: readNumber(data, ['gyro', 'gyroMag']),
          battery: Math.max(0, Math.min(100, Math.round(rawBattery))),
          updatedAt,
        };

        if (glassRecord) {
          telemetry.deviceType = 'eyeglass';
          const glassKeys = new Set<string>([entry.id, entry.id.toLowerCase()]);
          const fromFields = String(
            data.pairedCaneID ||
              (typeof data.caneID === 'string' ? data.caneID : '') ||
              ''
          )
            .trim()
            .toUpperCase()
            .replace(/-(EYEGLASS|SMARTGLASS|GLASS|GLASSES)$/i, '');
          const fromDocId = entry.id
            .toUpperCase()
            .replace(/-(EYEGLASS|SMARTGLASS|GLASS|GLASSES)$/i, '');
          const paired =
            fromFields ||
            (fromDocId !== entry.id.toUpperCase() ? fromDocId : '');
          if (paired) {
            telemetry.pairedCaneID = paired;
            telemetry.caneID = paired;
            glassKeys.add(`${paired}-EYEGLASS`);
            glassKeys.add(`${paired}-EYEGLASS`.toLowerCase());
            glassKeys.add(`${paired}-SMARTGLASS`);
            glassKeys.add(`${paired}-SMARTGLASS`.toLowerCase());
            glassKeys.add(`eyeglass:${paired}`);
            glassKeys.add(`eyeglass:${paired.toLowerCase()}`);
            glassKeys.add(`smartglass:${paired}`);
            glassKeys.add(`smartglass:${paired.toLowerCase()}`);
          }
          glassKeys.forEach((key) => {
            devices[key] = telemetry;
          });
          return;
        }

        ids.forEach((id) => {
          if (/-(EYEGLASS|SMARTGLASS|GLASS|GLASSES)$/i.test(id)) return;
          if (id.toLowerCase().startsWith('eyeglass:')) return;
          if (id.toLowerCase().startsWith('smartglass:')) return;
          devices[id] = telemetry;
          devices[id.toLowerCase()] = telemetry;
        });
      });
      onData(devices);
    },
    (error) => {
      console.log('Devices subscribe error:', error.message);
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

function isEyeglassRecord(entryId: string, data: Record<string, unknown>) {
  const type = String(data.deviceType ?? '').toLowerCase();
  if (
    type === 'eyeglass' ||
    type === 'glasses' ||
    type === 'smartglass' ||
    type === 'smart_glass' ||
    type === 'smart-glass' ||
    type === 'glass'
  ) {
    return true;
  }
  return /-(EYEGLASS|SMARTGLASS|GLASS|GLASSES)$/i.test(entryId);
}

export function isKnownCaneDevice(
  caneID: string,
  devices: Record<string, CaneDeviceTelemetry>
) {
  const target = caneID.trim();
  if (!target) return false;
  const device = devices[target] || devices[target.toLowerCase()];
  return Boolean(device && device.deviceType !== 'eyeglass');
}

export async function findCaneDevice(caneID: string): Promise<string | null> {
  const trimmed = caneID.trim();
  if (!trimmed) return null;

  try {
    const byId = await getDoc(doc(db, 'devices', trimmed));
    if (byId.exists()) {
      if (isEyeglassRecord(byId.id, byId.data() as Record<string, unknown>)) return null;
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
    if (isEyeglassRecord(entry.id, data)) continue;
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

  // Block wrong / unregistered Cane IDs (must exist in Firebase devices)
  let resolvedId: string | null = null;

  if (options?.knownDevices) {
    const local =
      options.knownDevices[inputId] ||
      options.knownDevices[inputId.toLowerCase()] ||
      options.knownDevices[cane.caneID?.trim() ?? ''];
    if (local && local.deviceType !== 'eyeglass') resolvedId = (local.caneID || inputId).toUpperCase();
  }

  if (!resolvedId) {
    const found = await findCaneDevice(inputId);
    resolvedId = found ? found.toUpperCase() : null;
  }

  if (!resolvedId) {
    throw new Error(
      'Wrong Cane ID. Enter the exact ID printed on your cane device.'
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

export type ProblemReportItem = {
  id: string;
  userId: string;
  email?: string | null;
  displayName?: string | null;
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  createdAtMs: number;
};

/** Save a user problem report for admin inbox (`problemReports` collection). */
export async function submitProblemReport(
  userId: string,
  report: {
    subject: string;
    message: string;
    email?: string | null;
    displayName?: string | null;
  }
) {
  const subject = report.subject.trim();
  const message = report.message.trim();
  if (!subject || !message) {
    throw new Error('Subject and message are required.');
  }

  const payload = {
    userId,
    email: report.email ?? null,
    displayName: report.displayName ?? null,
    subject,
    message,
    status: 'open' as const,
    toAdmin: true,
    source: 'smartcane-app',
    app: 'SmartGuide',
    target: 'smartcane-admin',
  };

  // Write to every path the admin console can see. `/devices` is currently
  // open in Firestore rules, so it guarantees delivery even before new rules publish.
  const jobs: Promise<unknown>[] = [
    addDoc(collection(db, 'problemReports'), {
      ...payload,
      createdAt: serverTimestamp(),
    }),
    addDoc(collection(db, 'alerts'), {
      userId,
      username: report.displayName || report.email || 'User',
      type: 'problem_report',
      message: `${subject}: ${message}`,
      location: report.email || 'App report',
      active: true,
      subject,
      email: report.email ?? null,
      displayName: report.displayName ?? null,
      source: 'smartcane-app',
      target: 'smartcane-admin',
      timestamp: serverTimestamp(),
    }),
    addDoc(collection(db, 'devices'), {
      ...payload,
      deviceType: 'problem_report',
      isProblemReport: true,
      caneID: 'ADMIN-REPORT',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  ];

  const results = await Promise.allSettled(jobs);
  if (results.every((result) => result.status === 'rejected')) {
    const first = results[0] as PromiseRejectedResult;
    throw first.reason;
  }
}

/** Live inbox for admins — new reports appear as users submit them. */
export function subscribeProblemReports(
  onData: (reports: ProblemReportItem[]) => void
) {
  return onSnapshot(
    collection(db, 'problemReports'),
    (snapshot) => {
      const reports = snapshot.docs
        .map((entry) => {
          const data = entry.data();
          const created = data.createdAt as
            | { toMillis?: () => number; seconds?: number }
            | undefined;
          const createdAtMs =
            typeof created?.toMillis === 'function'
              ? created.toMillis()
              : typeof created?.seconds === 'number'
                ? created.seconds * 1000
                : 0;
          return {
            id: entry.id,
            userId: String(data.userId ?? ''),
            email: typeof data.email === 'string' ? data.email : null,
            displayName:
              typeof data.displayName === 'string' ? data.displayName : null,
            subject: String(data.subject ?? ''),
            message: String(data.message ?? ''),
            status: data.status === 'resolved' ? 'resolved' : 'open',
            createdAtMs,
          } satisfies ProblemReportItem;
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(reports);
    },
    (error) => {
      console.log('Problem reports subscribe error:', error.message);
      onData([]);
    }
  );
}

export async function resolveProblemReport(
  reportId: string,
  adminUserId: string
) {
  await updateDoc(doc(db, 'problemReports', reportId), {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    resolvedBy: adminUserId,
  });
}