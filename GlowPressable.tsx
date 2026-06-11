import React, { useEffect } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  disabled?: boolean;
  active?: boolean;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export default function GlowPressable({
  children,
  onPress,
  style,
  glowColor,
  disabled,
  active,
}: Props) {
  const { theme } = useTheme();
  const color = glowColor || theme.colors.primary;
  const scale = useSharedValue(1);
  const glow = useSharedValue(active ? 0.75 : 0);

  useEffect(() => {
    glow.value = withSpring(active ? 0.75 : 0, { damping: 16, stiffness: 280 });
  }, [active, glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(glow.value, [0, 1], [0, 0.55]),
    shadowRadius: interpolate(glow.value, [0, 1], [0, 18]),
    borderColor: glow.value > 0.1 ? color : color + '35',
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.16]),
  }));

  const animateIn = () => {
    scale.value = withSpring(0.96, { damping: 14, stiffness: 420 });
    glow.value = withSpring(1, { damping: 16, stiffness: 380 });
  };

  const animateOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 320 });
    glow.value = withSpring(active ? 0.75 : 0, { damping: 14, stiffness: 300 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={disabled ? undefined : animateIn}
      onPressOut={disabled ? undefined : animateOut}
      disabled={disabled}
    >
      <AnimatedView style={[styles.glowRing, { shadowColor: color }, animatedStyle, style]}>
        <AnimatedView
          pointerEvents="none"
          style={[styles.glowOverlay, { backgroundColor: color }, overlayStyle]}
        />
        {children}
      </AnimatedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glowRing: {
    borderWidth: 1.5,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    overflow: 'hidden',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
});
