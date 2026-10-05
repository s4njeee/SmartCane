import { Platform, type ViewStyle } from 'react-native';
import { platformDesign } from '../constants/platformDesign';

/** Android elevation + iOS shadow so floating UI matches on both. */
export function elevationStyle(
  elevation: number,
  shadowColor = '#000000'
): ViewStyle {
  if (elevation <= 0) {
    return Platform.OS === 'android'
      ? { elevation: 0 }
      : {
          shadowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        };
  }

  if (Platform.OS === 'android') {
    return { elevation };
  }

  return {
    shadowColor,
    shadowOffset: { width: 0, height: Math.min(6, Math.max(1, elevation / 3)) },
    shadowOpacity: Math.min(0.28, 0.08 + elevation * 0.015),
    shadowRadius: Math.min(18, 4 + elevation * 0.5),
  };
}

/** Material ripple on Android. iOS uses Pressable opacity instead. */
export function pressRipple(color: string) {
  return platformDesign.pressable.useRipple ? { color } : undefined;
}
