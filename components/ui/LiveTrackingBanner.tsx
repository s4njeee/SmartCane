import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { mapBannerTop } from '../../utils/layoutInsets';

const YOU_RED = '#EF4444';
const ROUTE_BLUE = '#2563EB';
const ROUTE_OUTLINE = '#1D4ED8';

type Props = {
  expanded: boolean;
  onToggle: () => void;
  caneName?: string;
  latitude?: number;
  longitude?: number;
  gpsLive?: boolean;
  deviceOnline?: boolean;
  battery?: number;
  obstacle?: boolean;
  motion?: boolean;
};

type StatusLineProps = {
  label: string;
  value: string;
  ok?: boolean;
};

export default function LiveTrackingBanner({
  expanded,
  onToggle,
  caneName,
  latitude,
  longitude,
  gpsLive = false,
  deviceOnline = false,
  battery,
  obstacle = false,
  motion = false,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const top = mapBannerTop(insets);
  const name = caneName || 'Cane';

  const connectedValue = deviceOnline ? 'Online' : 'Offline';
  const batteryValue =
    deviceOnline && battery != null ? `${battery}%` : 'Offline';
  const ultrasonicValue = !deviceOnline
    ? 'Offline'
    : obstacle
      ? 'Detected'
      : 'Active';
  const motionValue = !deviceOnline
    ? 'Offline'
    : motion
      ? 'Detected'
      : 'Active';
  const gpsValue = !deviceOnline ? 'Offline' : gpsLive ? 'Active' : 'No fix';
  const locationValue = !deviceOnline
    ? 'Offline'
    : latitude != null && longitude != null
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      : 'Locating…';

  const statusLines: StatusLineProps[] = [
    { label: 'Connected', value: connectedValue, ok: deviceOnline },
    {
      label: 'Battery',
      value: batteryValue,
      ok: deviceOnline ? undefined : false,
    },
    {
      label: 'Ultrasonic',
      value: ultrasonicValue,
      ok: deviceOnline ? !obstacle : false,
    },
    {
      label: 'Motion',
      value: motionValue,
      ok: deviceOnline ? !motion : false,
    },
    { label: 'GPS', value: gpsValue, ok: deviceOnline && gpsLive },
    {
      label: 'Location',
      value: locationValue,
      ok: deviceOnline ? undefined : false,
    },
  ];

  return (
    <View style={[styles.wrap, { top }]}>
      <Pressable
        onPress={onToggle}
        android_ripple={{ color: colors.primary + '14' }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded ? 'Hide cane status' : 'Show cane status'
        }
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.legendYou} />
            <Text style={[styles.legendText, { color: colors.text }]}>You</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendCane} />
            <Text style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <View style={styles.headerEnd}>
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: deviceOnline
                    ? colors.success + '18'
                    : colors.danger + '18',
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: deviceOnline ? colors.success : colors.danger },
                ]}
              >
                {deviceOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textMuted}
            />
          </View>
        </View>

        {expanded && (
          <View style={[styles.statusBlock, { borderTopColor: colors.border }]}>
            {statusLines.map((line) => {
              const valueColor =
                line.ok === undefined
                  ? colors.text
                  : line.ok
                    ? colors.success
                    : colors.danger;
              return (
                <View key={line.label} style={styles.statusLine}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                    {line.label}
                  </Text>
                  <Text
                    style={[styles.statusValue, { color: valueColor }]}
                    numberOfLines={1}
                  >
                    {line.value}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 70,
    elevation: 12,
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  legendYou: {
    width: 10,
    height: 14,
    borderRadius: 4,
    backgroundColor: YOU_RED,
  },
  legendCane: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ROUTE_BLUE,
    borderWidth: 2,
    borderColor: ROUTE_OUTLINE,
  },
  legendText: { fontSize: 12, fontWeight: '700' },
  headerEnd: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  statusBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  statusValue: { fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
