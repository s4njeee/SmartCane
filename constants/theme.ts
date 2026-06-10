export type ThemeMode = 'light' | 'dark';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const lightTheme = {
  mode: 'light' as ThemeMode,
  colors: {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    accent: '#3B82F6',
    navy: '#0A1628',
    navyMid: '#1E3A5F',
    background: '#F0F4FA',
    backgroundGradient: ['#E8EEF8', '#F5F7FA', '#FFFFFF'] as const,
    surface: '#FFFFFF',
    surfaceElevated: 'rgba(255, 255, 255, 0.92)',
    glass: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.9)',
    card: '#FFFFFF',
    cardAlt: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    inputBg: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    dangerSoft: '#FEE2E2',
    shadow: '#0A1628',
    overlay: 'rgba(15, 23, 42, 0.45)',
    navBar: 'rgba(255, 255, 255, 0.95)',
    statusConnected: '#10B981',
    statusObstacle: '#EF4444',
  },
};

export const darkTheme = {
  mode: 'dark' as ThemeMode,
  colors: {
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    accent: '#60A5FA',
    navy: '#050A18',
    navyMid: '#0F172A',
    background: '#050A18',
    backgroundGradient: ['#050A18', '#0A1128', '#0F172A'] as const,
    surface: '#1E293B',
    surfaceElevated: 'rgba(30, 41, 59, 0.95)',
    glass: 'rgba(255, 255, 255, 0.08)',
    glassBorder: 'rgba(255, 255, 255, 0.14)',
    card: '#1E293B',
    cardAlt: '#0F172A',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: 'rgba(255, 255, 255, 0.1)',
    inputBg: 'rgba(255, 255, 255, 0.06)',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    dangerSoft: 'rgba(239, 68, 68, 0.15)',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.6)',
    navBar: 'rgba(15, 23, 42, 0.95)',
    statusConnected: '#34D399',
    statusObstacle: '#F87171',
  },
};

export type AppTheme = typeof lightTheme | typeof darkTheme;

export function getTheme(isDark: boolean): AppTheme {
  return isDark ? darkTheme : lightTheme;
}
