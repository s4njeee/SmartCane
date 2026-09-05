import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { platformDesign } from '../../constants/platformDesign';
import { useNavigation, type TravelMode } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { sheetBottomInset } from '../../utils/layoutInsets';

const MODES: {
  id: TravelMode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { id: 'driving', icon: 'car', label: 'Drive' },
  { id: 'foot', icon: 'walk', label: 'Walk' },
];

type Props = {
  bothReady: boolean;
  routing: boolean;
  routeError: boolean;
  distanceLabel: string;
  durationLabel: string;
  caneName?: string;
};

/** Bottom panel to pick Drive/Walk and press Go. */
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
  const {
    directionsOpen,
    closeDirections,
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

  // While navigating, top bar is in AppShell — hide this sheet
  if (isNavigating || !directionsOpen) return null;

  const bottom = sheetBottomInset(insets);
  const radius = platformDesign.sheet.topRadius;

  const etaText = routing
    ? 'Finding route…'
    : routeError
      ? distanceLabel
      : `${durationLabel} · ${distanceLabel}`;

  const handleClose = () => {
    resetNavigation();
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View
        style={[
          styles.panel,
          {
            marginBottom: bottom,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Directions</Text>
          <Pressable
            onPress={handleClose}
            android_ripple={{ color: colors.textMuted + '33', borderless: true }}
            style={[styles.closeBtn, { backgroundColor: colors.cardAlt }]}
            hitSlop={8}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.routeBox, { backgroundColor: colors.cardAlt }]}>
          <View style={styles.routeLine}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <View style={[styles.dash, { backgroundColor: colors.border }]} />
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.routeText}>
            <Text style={[styles.from, { color: colors.text }]}>My location</Text>
            <Text style={[styles.to, { color: colors.text }]} numberOfLines={1}>
              {caneName || 'SmartCane'}
            </Text>
          </View>
        </View>

        <View style={styles.modeRow}>
          {MODES.map((mode) => {
            const active = travelMode === mode.id;
            return (
              <Pressable
                key={mode.id}
                onPress={() => {
                  setTravelMode(mode.id);
                  setFollowDirection(true);
                }}
                android_ripple={{ color: colors.primary + '22' }}
                style={[
                  styles.modeBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.cardAlt,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={mode.icon}
                  size={18}
                  color={active ? '#fff' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    { color: active ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {mode.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!bothReady ? (
          <Text style={[styles.hint, { color: colors.warning }]}>
            Waiting for cane GPS and phone GPS…
          </Text>
        ) : (
          <View style={styles.etaRow}>
            {routing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            )}
            <Text style={[styles.eta, { color: colors.primary }]}>{etaText}</Text>
          </View>
        )}

        <Pressable
          onPress={() => {
            if (!bothReady) return;
            startGo();
          }}
          disabled={!bothReady || routing}
          android_ripple={{ color: '#ffffff33' }}
          style={[
            styles.goBtn,
            {
              backgroundColor: colors.primary,
              opacity: !bothReady || routing ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="navigate" size={20} color="#fff" />
          <Text style={styles.goText}>Go</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 40,
    elevation: 12,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  panel: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 6,
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
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  routeLine: { alignItems: 'center', width: 16 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dash: {
    width: 2,
    height: 16,
    marginVertical: 3,
    borderRadius: 1,
  },
  routeText: { flex: 1, gap: 10 },
  from: { fontSize: 15, fontWeight: '600' },
  to: { fontSize: 15, fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  modeLabel: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  eta: { fontSize: 15, fontWeight: '700' },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 0,
    overflow: 'hidden',
  },
  goText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
