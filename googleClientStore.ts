import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleWebClientId as firebaseGoogleClientId } from '../constants/googleOAuth';

const STORAGE_KEY = 'smartcane.googleWebClientId';

let cachedClientId: string | null = null;

function normalizeClientId(value?: string | null): string {
  return value?.trim() ?? '';
}

export function isValidGoogleClientId(value?: string | null): boolean {
  const id = normalizeClientId(value);
  return id.length > 0 && id.includes('.apps.googleusercontent.com');
}

export async function loadGoogleWebClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;

  const fromStorage = normalizeClientId(await AsyncStorage.getItem(STORAGE_KEY));
  if (isValidGoogleClientId(fromStorage)) {
    cachedClientId = fromStorage;
    return fromStorage;
  }

  const fromFirebase = normalizeClientId(firebaseGoogleClientId);
  if (isValidGoogleClientId(fromFirebase)) {
    cachedClientId = fromFirebase;
    return fromFirebase;
  }

  return '';
}

export async function saveGoogleWebClientId(clientId: string): Promise<void> {
  const normalized = normalizeClientId(clientId);
  if (!isValidGoogleClientId(normalized)) {
    throw new Error('Invalid Google Web Client ID.');
  }
  cachedClientId = normalized;
  await AsyncStorage.setItem(STORAGE_KEY, normalized);
}

export function clearGoogleClientIdCache() {
  cachedClientId = null;
}
