import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius } from '../../constants/theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
};

export default function GlassCard({ children, style, elevated = true }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.glass,
          borderColor: colors.glassBorder,
          shadowColor: colors.primary,
        },
        style,
      ]}
    >
      <View style={[styles.topShine, { backgroundColor: colors.primary + '18' }]} />
      <View style={[styles.edgeGlow, { borderColor: colors.primary + '12' }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
    overflow: 'hidden',
  },
  topShine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    borderRadius: 1,
  },
  edgeGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
});
