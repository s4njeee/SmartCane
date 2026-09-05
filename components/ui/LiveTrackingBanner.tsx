import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { mapBannerTop } from '../../utils/layoutInsets';

const ROUTE_BLUE = '#2563EB';
const FAB_SIZE = 48;

type Props = {
  expanded: boolean;
  onToggle: () => void;
  caneName?: string;
  deviceOnline?: boolean;
  battery?: number;
  address?: string;
};

/** Compact cane status — same card as the Go bar, pinned to the left. */
export default function LiveTrackingBanner({
  expanded,
  onToggle,
  caneName,
  deviceOnline = false,
  battery,
  address,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const top = mapBannerTop(insets);
  const name = caneName || 'Cane';

  const batteryValue =
    deviceOnline && battery != null ? `${battery}%` : 'Offline';
  const locationValue = address?.trim()
    ? address
    : deviceOnline
      ? 'Locating…'
      : 'Offline';

  if (!expanded) {
    return (
      <View style={[styles.wrap, { top }]} pointerEvents="box-none">
        <Pressable
          onPress={onToggle}
          android_ripple={{ color: colors.primary + '22' }}
          accessibilityRole="button"
          accessibilityLabel={`Show ${name} status`}
          style={[
            styles.fab,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="accessibility" size={22} color={ROUTE_BLUE} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Pressable
          onPress={onToggle}
          android_ripple={{ color: colors.primary + '18' }}
          accessibilityRole="button"
          accessibilityLabel="Hide cane status"
          style={styles.barPress}
        >
          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text
              style={[
                styles.meta,
                { color: deviceOnline ? colors.primary : colors.danger },
              ]}
            >
              {batteryValue}
            </Text>
            <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={2}>
              {locationValue}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={onToggle}
          android_ripple={{ color: colors.textMuted + '33' }}
          style={[styles.closeBtn, { backgroundColor: colors.cardAlt }]}
          hitSlop={8}
          accessibilityLabel="Close"
        >
          <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 72,
    zIndex: 70,
    elevation: 12,
    alignItems: 'flex-start',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    overflow: 'hidden',
  },
  barPress: { flexShrink: 1 },
  body: { minWidth: 140, maxWidth: 220 },
  title: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  sub: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
