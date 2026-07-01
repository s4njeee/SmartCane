import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  obstacle: boolean;
  gps: boolean;
  routes: RoutePoint[];
  number?: string;
  caneID?: string;
};

export type AlertItem = {
  id: string;
  userId: string;
  username: string;
  type: 'fall' | 'emergency' | 'obstacle';
  message: string;
  location: string;
  active: boolean;
  timestamp?: { seconds: number };
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
  return onSnapshot(canesRef, (snapshot) => {
    const canes = snapshot.docs.map((entry) => {
      const data = entry.data();
      return {
        id: entry.id,
        username: data.username ?? '',
        connected: data.connected ?? false,
        battery: data.battery ?? 0,
        obstacle: data.obstacle ?? false,
        gps: data.gps ?? false,
        routes: data.routes ?? [],
        number: data.number,
        caneID: data.caneID,
      } satisfies CaneItem;
    });
    onData(canes);
  });
}

export async function addUserCane(
  userId: string,
  cane: Omit<CaneItem, 'id' | 'routes'>
) {
  await addDoc(collection(db, 'users', userId, 'canes'), {
    ...cane,
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

export function subscribeUserAlerts(
  userId: string,
  onData: (alerts: AlertItem[]) => void
) {
  const alertsQuery = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'));
  return onSnapshot(alertsQuery, (snapshot) => {
    onData(
      snapshot.docs
        .map((entry) => ({
          id: entry.id,
          ...(entry.data() as Omit<AlertItem, 'id'>),
        }))
        .filter((alert) => alert.userId === userId)
    );
  });
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