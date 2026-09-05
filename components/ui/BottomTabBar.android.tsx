import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { androidDesign } from '../../constants/platformDesign/android';
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

/** Simple Android bottom tabs. */
export default function BottomTabBar({ active, onPress }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const d = androidDesign.tabBar;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.navBar,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
          elevation: d.elevation,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={styles.item}
            onPress={() => onPress(tab.key)}
            android_ripple={{ color: colors.primary + '18', borderless: true, radius: 28 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View
              style={[
                styles.iconSlot,
                isActive && { backgroundColor: colors.primary + '14' },
              ]}
            >
              <Ionicons
                name={isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
                size={d.iconSize}
                color={isActive ? colors.primary : colors.textMuted}
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? colors.primary : colors.textMuted,
                  fontWeight: isActive ? d.activeFontWeight : d.inactiveFontWeight,
                },
              ]}
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
    zIndex: 60,
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
