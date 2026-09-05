import Constants from 'expo-constants';

/** True when running inside Expo Go (not a standalone / dev-client build). */
export function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

/**
 * Expo Go ships a broken/expired Google Maps key (SDK 55+),
 * so native MapView tiles stay blank on Android and iOS.
 * Use the OpenStreetMap WebView fallback in Expo Go on both platforms.
 */
export function shouldUseOsmMapFallback() {
  return isExpoGo();
}
