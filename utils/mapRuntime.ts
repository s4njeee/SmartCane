import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** True when running inside Expo Go (not a standalone / dev-client build). */
export function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

export function getGoogleMapsApiKey() {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    googleMapsApiKey?: string;
  };
  return extra.googleMapsApiKey?.trim() || '';
}

/**
 * Expo Go ships a broken/expired Google Maps key (SDK 55+).
 * Standalone Android also crashes if Google MapView is mounted without a
 * working Maps SDK key — use OpenStreetMap there until one is configured.
 */
export function shouldUseOsmMapFallback() {
  if (isExpoGo()) return true;
  if (Platform.OS === 'android' && !getGoogleMapsApiKey()) return true;
  return false;
}
