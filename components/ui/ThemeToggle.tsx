import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import GlowPressable from './GlowPressable';

type Props = {
  compact?: boolean;
};

export default function ThemeToggle({ compact }: Props) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { colors } = theme;

  return (
    <GlowPressable
      onPress={toggleTheme}
      style={[
        styles.toggle,
        {
          backgroundColor: colors.cardAlt,
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
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
});
