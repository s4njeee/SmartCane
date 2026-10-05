import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mapBannerTop } from '../../utils/layoutInsets';
import { elevationStyle, pressRipple } from '../../utils/platformStyle';
import { cx, isWeb, ui, uiWeb, webClassStyle } from '../../utils/ui';
import { hudStyles, useHudPalette } from './mapHud';

const FAB_SIZE = 48;

type Props = {
  expanded: boolean;
  onToggle: () => void;
  caneName?: string;
  deviceOnline?: boolean;
  isOffline?: boolean;
  battery?: number;
  address?: string;
  eyeglassOnline?: boolean;
};

/** Compact cane status — follows light / dark theme. Map switch stays bottom-right. */
export default function LiveTrackingBanner({
  expanded,
  onToggle,
  caneName,
  deviceOnline = false,
  eyeglassOnline = false,
  isOffline: _isOffline = false,
  battery,
  address,
}: Props) {
  const insets = useSafeAreaInsets();
  const hud = useHudPalette();
  const top = mapBannerTop(insets);
  const name = caneName || 'Cane';
  const hasPlace = Boolean(address?.trim());

  const batteryValue = deviceOnline
    ? battery != null
      ? `${battery}%`
      : '—'
    : 'Cane offline';
  const locationValue = hasPlace
    ? address
    : deviceOnline
      ? 'Locating…'
      : 'Last known GPS';

  if (!expanded) {
    return (
      <View
        {...uiWeb('hud-wrap', { top, zIndex: 70 }, [hudStyles.wrap, { top, zIndex: 70 }])}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={onToggle}
          android_ripple={pressRipple(hud.ripple)}
          accessibilityRole="button"
          accessibilityLabel={`Show ${name} status`}
          {...ui('hud-fab', [
            styles.fab,
            {
              backgroundColor: hud.bg,
              borderColor: hud.border,
              ...elevationStyle(4),
            },
          ])}
        >
          <Ionicons
            name="accessibility"
            size={22}
            color={isWeb ? undefined : hud.metric}
            style={isWeb ? webClassStyle('track-glyph') : undefined}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View
      {...uiWeb('hud-wrap', { top, zIndex: 70 }, [hudStyles.wrap, { top, zIndex: 70 }])}
      pointerEvents="box-none"
    >
      <View
        {...ui('hud-bar', [
          hudStyles.bar,
          { backgroundColor: hud.bg, borderColor: hud.border },
        ])}
      >
        <Pressable
          onPress={onToggle}
          android_ripple={pressRipple(hud.ripple)}
          accessibilityRole="button"
          accessibilityLabel="Hide cane status"
          {...ui('hud-bar-press', hudStyles.barPress)}
        >
          <Text {...ui('hud-title', [hudStyles.title, { color: hud.title }])} numberOfLines={1}>
            {name}
          </Text>
          <Text
            {...ui(
              cx('hud-metric', !deviceOnline && 'is-offline'),
              [hudStyles.metric, { color: deviceOnline ? hud.metric : hud.offline }],
            )}
          >
            {batteryValue}
          </Text>
          <Text {...ui('hud-sub', [hudStyles.sub, { color: hud.sub }])} numberOfLines={2}>
            {deviceOnline ? 'Cane live · ' : 'Cane offline · '}
            {eyeglassOnline ? 'Eyeglass live · ' : 'Eyeglass offline · '}
            {locationValue}
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggle}
          android_ripple={pressRipple(hud.ripple)}
          {...ui('hud-close', [styles.closeBtn, { backgroundColor: hud.closeBg }])}
          hitSlop={8}
          accessibilityLabel="Close"
        >
          <Ionicons
            name="chevron-up"
            size={18}
            color={isWeb ? undefined : hud.sub}
            style={isWeb ? webClassStyle('track-chevron-glyph') : undefined}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
