import type { PlatformDesign } from './types';

/** iOS: simplified flat surfaces (same simple language as Android). */
export const iosDesign: PlatformDesign = {
  id: 'ios',

  card: {
    radius: 12,
    borderWidth: 1,
    padding: 16,
    useGlass: false,
    useShine: false,
    elevationElevated: 1,
    elevationFlat: 0,
    shadowOffsetY: 2,
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  pressable: {
    glowEnabled: false,
    borderWidth: 1,
    elevation: 0,
    overlayMaxOpacity: 0.1,
    useRipple: false,
    radius: 12,
  },

  tabBar: {
    style: 'material',
    elevation: 4,
    showTopGlow: false,
    iconSize: 22,
    activeFontWeight: '700',
    inactiveFontWeight: '500',
  },

  sheet: {
    contentPanning: true,
    topRadius: 16,
    handleWidth: 36,
    useTopGlow: false,
  },

  typography: {
    screenTitleWeight: '700',
    sectionLabelLetterSpacing: 0.4,
  },

  map: {
    fabExtraClearance: 16,
    mapPadExtra: 16,
    tracksViewChangesMs: 600,
  },

  button: {
    radius: 12,
    elevation: 0,
    useSheen: false,
  },

  screen: {
    useGradient: false,
  },
};
