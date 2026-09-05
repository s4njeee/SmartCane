import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import GlowPressable from './GlowPressable';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  align?: 'left' | 'center' | 'right';
  containerStyle?: StyleProp<ViewStyle>;
};

export default function AnimatedLink({
  onPress,
  children,
  style,
  align = 'center',
  containerStyle,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <GlowPressable
      onPress={onPress}
      glowColor={colors.primary}
      style={[
        styles.wrap,
        align === 'left' && styles.left,
        align === 'right' && styles.right,
        containerStyle,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, { color: colors.textSecondary }, style]}>{children}</Text>
      ) : (
        children
      )}
    </GlowPressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 4 },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  text: { fontSize: 15 },
});