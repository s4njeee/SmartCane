import { Ionicons } from '@expo/vector-icons';
import { usePathname, useSegments } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_CANE_NAME } from '../../constants/demo';
import { useCaneStatus } from '../../context/CaneStatusContext';
import { useNavigation } from '../../context/NavigationContext';
import { mapBannerTop } from '../../utils/layoutInsets';
import { pressRipple } from '../../utils/platformStyle';
import { isWeb, ui, uiWeb, webClassStyle } from '../../utils/ui';
import { hudStyles, useHudPalette } from './mapHud';

/** Full-width Go bar — follows light / dark theme. */
export default function GoNavigationBanner() {
  const insets = useSafeAreaInsets();
  const hud = useHudPalette();
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

  if (!expanded) {
    return (
      <View
        {...uiWeb('hud-wrap', { top, zIndex: 200 }, [hudStyles.wrap, { top, zIndex: 200 }])}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => setExpanded(true)}
          android_ripple={pressRipple(hud.ripple)}
          {...ui('hud-pill', [
            hudStyles.pill,
            { backgroundColor: hud.bg, borderColor: hud.border },
          ])}
        >
          <Ionicons
            name="navigate"
            size={16}
            color={isWeb ? undefined : hud.metric}
            style={isWeb ? webClassStyle('hud-nav-glyph') : undefined}
          />
          <Text
            {...ui('hud-pill-text', [hudStyles.pillText, { color: hud.title }])}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            maxFontSizeMultiplier={1.2}
          >
            {durationLabel} · {distanceLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={isWeb ? undefined : hud.sub}
            style={isWeb ? webClassStyle('hud-chevron-glyph') : undefined}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View
      {...uiWeb('hud-wrap', { top, zIndex: 200 }, [hudStyles.wrap, { top, zIndex: 200 }])}
      pointerEvents="box-none"
    >
      <View
        {...ui('hud-bar', [
          hudStyles.bar,
          { backgroundColor: hud.bg, borderColor: hud.border },
        ])}
      >
        <Pressable onPress={() => setExpanded(false)} {...ui('hud-bar-press', hudStyles.barPress)}>
          <Text
            {...ui('hud-title', [hudStyles.title, { color: hud.title }])}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            To {destinationName || DEMO_CANE_NAME}
          </Text>
          <Text
            {...ui('hud-metric', [hudStyles.metric, { color: hud.metric }])}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            maxFontSizeMultiplier={1.2}
          >
            {durationLabel} · {distanceLabel}
          </Text>
          <Text
            {...ui('hud-sub', [hudStyles.sub, { color: hud.sub }])}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {travelModeLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={endGo}
          android_ripple={pressRipple('#ffffff33')}
          {...ui('hud-action', [
            hudStyles.actionBtn,
            {
              backgroundColor: hud.end,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 10,
            },
          ])}
        >
          <Text {...ui('hud-action-label', { color: '#fff', fontWeight: '700', fontSize: 15 })}>
            End
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
