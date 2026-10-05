import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_CANE_NAME } from '../../constants/demo';
import { platformDesign } from '../../constants/platformDesign';
import { useNavigation, type TravelMode } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { sheetBottomInset } from '../../utils/layoutInsets';
import { elevationStyle, pressRipple } from '../../utils/platformStyle';
import { colorId, cx, isWeb, ui, uiWeb, webClassStyle } from '../../utils/ui';

const MODES: {
  id: TravelMode;
  ionIcon?: keyof typeof Ionicons.glyphMap;
  mciIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'driving', ionIcon: 'car', label: 'Drive', shortLabel: 'Drive' },
  {
    id: 'motorcycle',
    mciIcon: 'motorbike',
    label: 'Motorcycle',
    shortLabel: 'Moto',
  },
  { id: 'foot', ionIcon: 'walk', label: 'Walk', shortLabel: 'Walk' },
];

const TEXT_SCALE = { maxFontSizeMultiplier: 1.2 } as const;

type Props = {
  bothReady: boolean;
  routing: boolean;
  routeError: boolean;
  distanceLabel: string;
  durationLabel: string;
  caneName?: string;
};

/** Bottom panel to pick Drive, Motorcycle, or Walk and press Go. */
export default function DirectionsSheet({
  bothReady,
  routing,
  routeError,
  distanceLabel,
  durationLabel,
  caneName,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = width < 360 || height < 640;
  const stackEta = width < 400;
  const {
    directionsOpen,
    travelMode,
    setTravelMode,
    setFollowDirection,
    startGo,
    resetNavigation,
    isNavigating,
  } = useNavigation();

  useEffect(() => {
    if (!directionsOpen || isNavigating) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      resetNavigation();
      return true;
    });
    return () => sub.remove();
  }, [directionsOpen, isNavigating, resetNavigation]);

  if (isNavigating || !directionsOpen) return null;

  const bottom = sheetBottomInset(insets);
  const radius = platformDesign.sheet.topRadius;
  const panelWidth = Math.min(width, 560);
  const padX = compact ? 14 : 20;

  const handleClose = () => {
    resetNavigation();
  };

  return (
    <View {...ui('dir-overlay', styles.overlay)} pointerEvents="box-none">
      <Pressable
        {...uiWeb('dir-backdrop', { bottom }, [styles.backdrop, { bottom }])}
        onPress={handleClose}
      />

      <View
        {...uiWeb(
          'dir-panel',
          {
            bottom,
            width: panelWidth,
            left: (width - panelWidth) / 2,
            paddingHorizontal: padX,
            paddingBottom: compact ? 8 : 10,
          },
          [
            styles.panel,
            {
              bottom,
              width: panelWidth,
              left: (width - panelWidth) / 2,
              paddingHorizontal: padX,
              paddingBottom: compact ? 8 : 10,
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
              borderColor: colors.border,
              ...elevationStyle(
                Platform.OS === 'android' ? 0 : 8,
                colors.shadow
              ),
            },
          ],
        )}
      >
        <View {...ui('dir-handle', [styles.handle, { backgroundColor: colors.textMuted }])} />

        <View {...ui('dir-header', styles.header)}>
          <Text
            {...TEXT_SCALE}
            {...ui('dir-title', [styles.title, { color: colors.text }])}
          >
            Directions
          </Text>
          <Pressable
            onPress={handleClose}
            android_ripple={pressRipple(colors.textMuted + '33')}
            {...ui('dir-close', [styles.closeBtn, { backgroundColor: colors.cardAlt }])}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close directions"
          >
            <Ionicons
              name="close"
              size={20}
              color={isWeb ? undefined : colors.textSecondary}
              style={isWeb ? webClassStyle('dir-close-glyph') : undefined}
            />
          </Pressable>
        </View>

        <View {...ui('dir-route-box', [styles.routeBox, { backgroundColor: colors.cardAlt }])}>
          <View {...ui('dir-route-line', styles.routeLine)}>
            <View {...ui('dir-dot is-from', [styles.dot, { backgroundColor: colors.danger }])} />
            <View {...ui('dir-dash', [styles.dash, { backgroundColor: colors.border }])} />
            <View {...ui('dir-dot is-to', [styles.dot, { backgroundColor: colors.primary }])} />
          </View>
          <View {...ui('dir-route-text', styles.routeText)}>
            <Text
              {...TEXT_SCALE}
              numberOfLines={1}
              {...ui('dir-from', [styles.from, { color: colors.text }])}
            >
              My location
            </Text>
            <Text
              {...TEXT_SCALE}
              {...ui('dir-to', [styles.to, { color: colors.text }])}
              numberOfLines={1}
            >
              {caneName || DEMO_CANE_NAME}
            </Text>
          </View>
        </View>

        <View {...ui('dir-mode-row', styles.modeRow)}>
          {MODES.map((mode) => {
            const active = travelMode === mode.id;
            const label = compact ? mode.shortLabel : mode.label;
            return (
              <Pressable
                key={mode.id}
                onPress={() => {
                  setTravelMode(mode.id);
                  setFollowDirection(true);
                }}
                android_ripple={pressRipple(colors.primary + '22')}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={mode.label}
                {...ui(
                  cx('dir-mode-btn', active && 'is-active'),
                  [
                    styles.modeBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.cardAlt,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ],
                )}
              >
                {mode.mciIcon ? (
                  <MaterialCommunityIcons
                    name={mode.mciIcon}
                    size={compact ? 18 : 20}
                    color={isWeb ? undefined : active ? '#fff' : colors.textSecondary}
                    style={
                      isWeb
                        ? webClassStyle(cx('dir-mode-glyph', colorId(mode.id), active && 'is-active'))
                        : undefined
                    }
                  />
                ) : (
                  <Ionicons
                    name={mode.ionIcon!}
                    size={compact ? 16 : 18}
                    color={isWeb ? undefined : active ? '#fff' : colors.textSecondary}
                    style={
                      isWeb
                        ? webClassStyle(cx('dir-mode-glyph', colorId(mode.id), active && 'is-active'))
                        : undefined
                    }
                  />
                )}
                <Text
                  {...TEXT_SCALE}
                  {...ui(
                    'dir-mode-label',
                    [
                      styles.modeLabel,
                      { color: active ? '#fff' : colors.textSecondary },
                    ],
                  )}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!bothReady ? (
          <Text
            {...TEXT_SCALE}
            {...ui('dir-hint', [styles.hint, { color: colors.warning }])}
          >
            Waiting for cane GPS and phone GPS…
          </Text>
        ) : (
          <View {...ui('dir-eta-row', styles.etaRow)}>
            {routing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="time-outline"
                size={18}
                color={isWeb ? undefined : colors.primary}
                style={isWeb ? webClassStyle('dir-time-glyph') : undefined}
              />
            )}
            {routing ? (
              <Text
                {...TEXT_SCALE}
                style={[styles.eta, styles.etaBeside, { color: colors.primary }]}
                numberOfLines={1}
              >
                Finding route…
              </Text>
            ) : routeError ? (
              <Text
                {...TEXT_SCALE}
                style={[styles.eta, styles.etaBeside, { color: colors.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {distanceLabel}
              </Text>
            ) : stackEta ? (
              <View style={styles.etaStack}>
                <Text
                  {...TEXT_SCALE}
                  style={[styles.eta, { color: colors.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {durationLabel}
                </Text>
                <Text
                  {...TEXT_SCALE}
                  style={[styles.etaDistance, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {distanceLabel}
                </Text>
              </View>
            ) : (
              <Text
                {...TEXT_SCALE}
                style={[styles.eta, styles.etaBeside, { color: colors.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {durationLabel} · {distanceLabel}
              </Text>
            )}
          </View>
        )}

        <Pressable
          onPress={() => {
            if (!bothReady) return;
            startGo();
          }}
          disabled={!bothReady || routing}
          android_ripple={pressRipple('#ffffff33')}
          accessibilityRole="button"
          accessibilityLabel="Start navigation"
          {...ui('dir-go', [
            styles.goBtn,
            {
              backgroundColor: colors.primary,
              opacity: !bothReady || routing ? 0.5 : 1,
            },
          ])}
        >
          <Ionicons
            name="navigate"
            size={20}
            color={isWeb ? undefined : '#fff'}
            style={isWeb ? webClassStyle('dir-go-glyph') : undefined}
          />
          <Text {...TEXT_SCALE} {...ui('dir-go-text', styles.goText)}>
            Go
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 40,
    elevation: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    alignSelf: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    opacity: 0.45,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    includeFontPadding: false,
    flexShrink: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  routeLine: { alignItems: 'center', width: 16, marginRight: 14 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dash: {
    width: 2,
    height: 16,
    marginVertical: 3,
    borderRadius: 1,
  },
  routeText: { flex: 1, minWidth: 0 },
  from: {
    fontSize: 15,
    fontWeight: '600',
    includeFontPadding: false,
    marginBottom: 10,
  },
  to: {
    fontSize: 15,
    fontWeight: '700',
    includeFontPadding: false,
  },
  modeRow: { flexDirection: 'row', marginBottom: 12 },
  modeBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    marginHorizontal: 4,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'center',
    marginTop: 4,
    width: '100%',
  },
  hint: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    includeFontPadding: false,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    minWidth: 0,
  },
  etaStack: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },
  etaBeside: {
    flex: 1,
    marginLeft: 8,
  },
  eta: {
    fontSize: 15,
    fontWeight: '700',
    includeFontPadding: false,
    minWidth: 0,
  },
  etaDistance: {
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
    marginTop: 2,
    opacity: 0.9,
  },
  etaDistance: {
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
    marginTop: 2,
    opacity: 0.9,
  },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 0,
    overflow: 'hidden',
  },
  goText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    includeFontPadding: false,
    marginLeft: 8,
  },
});
