import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import GlowPressable from './GlowPressable';
import { radius } from '../../constants/theme';

type Props = {
  compact?: boolean;
};

export default function ThemeToggle({ compact }: Props) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { colors } = theme;

  return (
    <GlowPressable
      onPress={toggleTheme}
      glowColor={colors.primary}
      style={[
        styles.toggle,
        {
          backgroundColor: colors.glass,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.primary} />
      {!compact ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {isDark ? 'Dark' : 'Light'}
        </Text>
      ) : null}
    </GlowPressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
});
