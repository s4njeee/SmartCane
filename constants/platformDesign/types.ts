/**
 * Shared shape for iOS vs Android visual systems.
 * Colors still come from ThemeContext; this file owns layout / chrome / motion.
 */
export type PlatformDesignId = 'ios' | 'android';

export type PlatformDesign = {
  id: PlatformDesignId;

  /** Card / surface chrome */
  card: {
    radius: number;
    borderWidth: number;
    padding: number;
    /** iOS glass blur-like fill; Android solid surface */
    useGlass: boolean;
    /** Top shine + edge glow overlays (iOS) */
    useShine: boolean;
    elevationElevated: number;
    elevationFlat: number;
    shadowOffsetY: number;
    shadowOpacity: number;
    shadowRadius: number;
  };

  /** Pressable / icon button chrome */
  pressable: {
    glowEnabled: boolean;
    borderWidth: number;
    elevation: number;
    overlayMaxOpacity: number;
    useRipple: boolean;
    radius: number;
  };

  /** Bottom tab bar */
  tabBar: {
    style: 'glow' | 'material';
    elevation: number;
    showTopGlow: boolean;
    iconSize: number;
    activeFontWeight: '700' | '800';
    inactiveFontWeight: '500' | '600';
  };

  /** Bottom sheets (Status / Directions) */
  sheet: {
    contentPanning: boolean;
    topRadius: number;
    handleWidth: number;
    useTopGlow: boolean;
  };

  /** Screen headers / section labels */
  typography: {
    screenTitleWeight: '700' | '800';
    sectionLabelLetterSpacing: number;
  };

  /** Map chrome extras */
  map: {
    fabExtraClearance: number;
    mapPadExtra: number;
    tracksViewChangesMs: number;
  };

  /** Primary buttons (AppButton / GoogleSignIn) */
  button: {
    radius: number;
    elevation: number;
    useSheen: boolean;
  };

  /** Screen shell (ScreenLayout) */
  screen: {
    /** Soft LinearGradient background vs flat color */
    useGradient: boolean;
  };
};
