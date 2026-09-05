import type { PlatformDesign } from './types';

/** Android: simple flat Material surfaces. */
export const androidDesign: PlatformDesign = {
  id: 'android',

  card: {
    radius: 12,
    borderWidth: 0.5,
    padding: 16,
    useGlass: false,
    useShine: false,
    elevationElevated: 1,
    elevationFlat: 0,
    shadowOffsetY: 1,
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  pressable: {
    glowEnabled: false,
    borderWidth: 1,
    elevation: 0,
    overlayMaxOpacity: 0.08,
    useRipple: true,
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
    contentPanning: false,
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
    mapPadExtra: 32,
    tracksViewChangesMs: 1500,
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
