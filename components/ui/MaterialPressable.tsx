import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { androidDesign } from '../../constants/platformDesign/android';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Kept for API parity with GlowPressable; used for ripple tint. */
  glowColor?: string;
  disabled?: boolean;
  active?: boolean;
};

/**
 * Android Material pressable — ripple + light elevation, no glow.
 */
export default function MaterialPressable({
  children,
  onPress,
  style,
  glowColor,
  disabled,
  active,
}: Props) {
  const { theme } = useTheme();
  const color = glowColor || theme.colors.primary;
  const d = androidDesign.pressable;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={
        disabled ? undefined : { color: color + '22', borderless: false }
      }
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: d.radius,
          elevation: disabled ? 0 : d.elevation,
          backgroundColor: active ? color + '14' : undefined,
          opacity: pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
