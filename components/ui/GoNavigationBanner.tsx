import { Ionicons } from '@expo/vector-icons';
import { usePathname, useSegments } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaneStatus } from '../../context/CaneStatusContext';
import { useNavigation } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { mapBannerTop } from '../../utils/layoutInsets';

/** Simple Go bar — tap to minimize, End to stop. Home only. */
export default function GoNavigationBanner() {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const { isStatusOpen } = useCaneStatus();
  const {
    isNavigating,
    destinationName,
    distanceLabel,
    durationLabel,
    travelModeLabel,
    endGo,
  } = useNavigation();
  const [expanded, setExpanded] = useState(true);

  const onHome =
    pathname === '/home' ||
    pathname === 'home' ||
    segments[0] === 'home';
  if (!isNavigating || !onHome || isStatusOpen) return null;

  const top = mapBannerTop(insets);
  const eta =
    durationLabel !== '—'
      ? `${durationLabel} · ${distanceLabel}`
      : distanceLabel;

  if (!expanded) {
    return (
      <View style={[styles.wrap, { top }]}>
        <Pressable
          onPress={() => setExpanded(true)}
          android_ripple={{ color: colors.primary + '18' }}
          style={[
            styles.pill,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="navigate" size={16} color={colors.primary} />
          <Text style={[styles.pillText, { color: colors.text }]}>{eta}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { top }]}>
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Pressable onPress={() => setExpanded(false)} style={styles.barPress}>
          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              To {destinationName || 'SmartCane'}
            </Text>
            <Text style={[styles.meta, { color: colors.primary }]}>{eta}</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              {travelModeLabel}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={endGo}
          android_ripple={{ color: '#ffffff33' }}
          style={[styles.endBtn, { backgroundColor: colors.danger }]}
        >
          <Text style={styles.endText}>End</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 200,
    elevation: 28,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    overflow: 'hidden',
  },
  pillText: { fontSize: 14, fontWeight: '600' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    overflow: 'hidden',
  },
  barPress: { flex: 1 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  sub: { fontSize: 12, marginTop: 2 },
  endBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  endText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
