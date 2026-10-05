import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { platformDesign } from '../../constants/platformDesign';
import { elevationStyle, pressRipple } from '../../utils/platformStyle';
import { cx, isWeb, ui, uiWeb, webClassStyle } from '../../utils/ui';
import type { TabKey } from './tabTypes';

export type { TabKey };

type Tab = {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
};

const TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'messages', label: 'Alerts', icon: 'notifications-outline', activeIcon: 'notifications' },
  { key: 'status', label: 'Status', icon: 'pulse-outline', activeIcon: 'pulse' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

type Props = {
  active: TabKey;
  onPress: (key: TabKey) => void;
};

/** Simple bottom tabs — ripple on Android, same layout on iOS. */
export default function BottomTabBar({ active, onPress }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const d = platformDesign.tabBar;
  const padBottom = Math.max(insets.bottom, 10);

  return (
    <View
      {...uiWeb(
        'tab-bar',
        { paddingBottom: padBottom },
        [
          styles.bar,
          {
            backgroundColor: colors.navBar,
            borderTopColor: colors.border,
            paddingBottom: padBottom,
            ...elevationStyle(d.elevation, colors.shadow),
          },
        ],
      )}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            {...ui(cx('tab-item', `is-${tab.key}`), styles.item)}
            onPress={() => onPress(tab.key)}
            android_ripple={pressRipple(colors.primary + '18')}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View
              {...ui(
                cx('tab-icon-slot', `is-${tab.key}`, isActive && 'is-active'),
                [styles.iconSlot, isActive && { backgroundColor: colors.primary + '14' }],
              )}
            >
              <Ionicons
                name={isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
                size={d.iconSize}
                color={isWeb ? undefined : isActive ? colors.primary : colors.textMuted}
                style={isWeb ? webClassStyle(cx('tab-glyph', `is-${tab.key}`, isActive && 'is-active')) : undefined}
              />
            </View>
            <Text
              {...ui(
                cx('tab-label', `is-${tab.key}`, isActive && 'is-active'),
                [
                  styles.label,
                  {
                    color: isActive ? colors.primary : colors.textMuted,
                    fontWeight: isActive ? d.activeFontWeight : d.inactiveFontWeight,
                  },
                ],
              )}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 200,
    elevation: 16,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 48,
    paddingVertical: 4,
  },
  iconSlot: {
    width: 56,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: { fontSize: 11 },
});
