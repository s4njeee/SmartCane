import { Platform, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { elevationStyle } from '../../utils/platformStyle';

export function useHudPalette() {
  const { theme } = useTheme();
  const { colors } = theme;
  return {
    bg: colors.surface,
    title: colors.text,
    metric: colors.primary,
    sub: colors.textMuted,
    end: colors.danger,
    offline: colors.danger,
    closeBg: colors.cardAlt,
    border: colors.border,
    ripple: colors.primary + '22',
  };
}

/** Shared map overlay layout — colors come from useHudPalette(). */
export const hudStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...elevationStyle(4),
  },
  pillText: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '700',
    includeFontPadding: false,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...elevationStyle(6),
  },
  barPress: { flex: 1, minWidth: 0, marginRight: 12 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    includeFontPadding: false,
  },
  metric: {
    fontSize: Platform.OS === 'android' ? 18 : 22,
    fontWeight: '700',
    marginTop: 2,
    includeFontPadding: false,
    flexShrink: 1,
  },
  sub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
    includeFontPadding: false,
  },
  actionBtn: {
    flexShrink: 0,
    overflow: 'hidden',
  },
});
