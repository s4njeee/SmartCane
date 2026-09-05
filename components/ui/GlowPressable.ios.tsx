import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { iosDesign } from '../../constants/platformDesign/ios';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  disabled?: boolean;
  active?: boolean;
};

/** Simple iOS pressable — no glow. */
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
  const d = iosDesign.pressable;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: d.radius,
          backgroundColor: active ? color + '14' : undefined,
          opacity: pressed ? 0.85 : 1,
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
