import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radius } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  fullWidth?: boolean;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading,
  icon,
  style,
  fullWidth = true,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const scale = useSharedValue(1);
  const press = useSharedValue(0);

  const variantStyles = {
    primary: {
      bg: colors.primary,
      text: '#FFFFFF',
      border: colors.primary,
      glow: colors.primary,
    },
    secondary: {
      bg: colors.glass,
      text: colors.primary,
      border: colors.border,
      glow: colors.primary,
    },
    ghost: {
      bg: 'transparent',
      text: colors.textSecondary,
      border: 'transparent',
      glow: colors.textMuted,
    },
    danger: {
      bg: colors.danger,
      text: '#FFFFFF',
      border: colors.danger,
      glow: colors.danger,
    },
  }[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(press.value, [0, 1], [0.2, 0.55]),
    shadowRadius: interpolate(press.value, [0, 1], [8, 20]),
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(press.value, [0, 1], [0, 0.22]),
  }));

  const animateIn = () => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 360 });
    press.value = withSpring(1, { damping: 20, stiffness: 320 });
  };

  const animateOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 260 });
    press.value = withSpring(0, { damping: 18, stiffness: 280 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      disabled={loading}
      style={fullWidth ? styles.fullWidth : undefined}
    >
      <AnimatedView
        style={[
          styles.button,
          {
            backgroundColor: variantStyles.bg,
            borderColor: variantStyles.border,
            shadowColor: variantStyles.glow,
          },
          animatedStyle,
          style,
        ]}
      >
        <AnimatedView pointerEvents="none" style={[styles.sheen, sheenStyle]} />
        {loading ? (
          <ActivityIndicator color={variantStyles.text} />
        ) : (
          <>
            {icon && (
              <Ionicons name={icon} size={20} color={variantStyles.text} style={styles.icon} />
            )}
            <Text style={[styles.text, { color: variantStyles.text }]}>{title}</Text>
          </>
        )}
      </AnimatedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 54,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
    overflow: 'hidden',
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  fullWidth: { width: '100%' },
  text: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  icon: { marginRight: 8 },
});