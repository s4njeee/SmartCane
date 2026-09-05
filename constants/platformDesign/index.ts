import { Platform } from 'react-native';
import { androidDesign } from './android';
import { iosDesign } from './ios';
import type { PlatformDesign, PlatformDesignId } from './types';

export type { PlatformDesign, PlatformDesignId };
export { androidDesign, iosDesign };

/**
 * Active platform visual system.
 * Prefer this over scattering `Platform.OS === 'android'` in UI components.
 */
export const platformDesign: PlatformDesign =
  Platform.OS === 'android' ? androidDesign : iosDesign;

export function isAndroidDesign() {
  return platformDesign.id === 'android';
}

export function isIosDesign() {
  return platformDesign.id === 'ios';
}
