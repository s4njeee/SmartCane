import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { radius } from '../../constants/theme';

export type TabKey = 'home' | 'messages' | 'status' | 'profile';

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

const AnimatedView = Animated.createAnimatedComponent(View);

export default function BottomTabBar({ active, onPress }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.navBar,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
          shadowColor: colors.primary,
        },
      ]}
    >
      <View style={[styles.barGlow, { backgroundColor: colors.primary + '10' }]} />
      {TABS.map((tab) => (
        <TabItem
          key={tab.key}
          tab={tab}
          isActive={active === tab.key}
          onPress={() => onPress(tab.key)}
          primaryColor={colors.primary}
          mutedColor={colors.textMuted}
          glassColor={colors.glass}
        />
      ))}
    </View>
  );
}

function TabItem({
  tab,
  isActive,
  onPress,
  primaryColor,
  mutedColor,
  glassColor,
}: {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
  primaryColor: string;
  mutedColor: string;
  glassColor: string;
}) {
  const scale = useSharedValue(1);
  const activeGlow = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    activeGlow.value = withTiming(isActive ? 1 : 0, { duration: 220 });
  }, [isActive, activeGlow]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(activeGlow.value, [0, 1], [0, 0.45]),
    shadowRadius: interpolate(activeGlow.value, [0, 1], [0, 12]),
  }));

  const animateIn = () => {
    scale.value = withSpring(0.92, { damping: 18, stiffness: 380 });
  };

  const animateOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 280 });
  };

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
    >
      <AnimatedView
        style={[
          styles.iconWrap,
          {
            backgroundColor: isActive ? glassColor : 'transparent',
            borderColor: primaryColor + '45',
            borderWidth: isActive ? 1 : 0,
            shadowColor: primaryColor,
          },
          iconStyle,
        ]}
      >
        <Ionicons
          name={isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
          size={22}
          color={isActive ? primaryColor : mutedColor}
        />
      </AnimatedView>
      <Text
        style={[
          styles.label,
          { color: isActive ? primaryColor : mutedColor, fontWeight: isActive ? '800' : '600' },
        ]}
      >
        {tab.label}
      </Text>
    </Pressable>
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
    paddingTop: 10,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  barGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  item: { alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  label: { fontSize: 11, marginTop: 3 },
});
