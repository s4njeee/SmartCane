export type ThemeMode = "light" | "dark";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const lightTheme = {
  mode: "light" as ThemeMode,
  colors: {
    /* Brand — buttons, links, active tabs */
    primary: "#4c81eb",
    primaryDark: "#1D4ED8",
    accent: "#3B82F6",
    navy: "#0F172A",
    navyMid: "#1E293B",
    /* Surfaces — app shell, cards */
    background: "#F8FAFC",
    backgroundGradient: ["#F8FAFC", "#F8FAFC", "#F8FAFC"] as const,
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    glass: "#FFFFFF",
    glassBorder: "#E2E8F0",
    card: "#FFFFFF",
    cardAlt: "#F1F5F9",
    /* Text */
    text: "#090e18",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    /* Borders, overlay, shadow ink */
    border: "#E2E8F0",
    shadow: "#0F172A",
    overlay: "rgba(15, 23, 42, 0.4)",
    /* Inputs */
    inputBg: "#FFFFFF",
    /* Feedback */
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    dangerSoft: "#FEE2E2",
    /* Navigation & cane status */
    navBar: "#FFFFFF",
    statusConnected: "#16A34A",
    statusObstacle: "#dc6026",
  },
};

export const darkTheme = {
  mode: "dark" as ThemeMode,
  colors: {
    /* Brand — buttons, links, active tabs */
    primary: "#3B82F6",
    primaryDark: "#2563EB",
    accent: "#60A5FA",
    navy: "#020617",
    navyMid: "#0F172A",
    /* Surfaces — app shell, cards */
    background: "#0F172A",
    backgroundGradient: ["#0F172A", "#0F172A", "#0F172A"] as const,
    surface: "#1E293B",
    surfaceElevated: "#1E293B",
    glass: "#1E293B",
    glassBorder: "#334155",
    card: "#1E293B",
    cardAlt: "#0F172A",
    /* Text */
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    /* Borders, overlay, shadow ink */
    border: "#334155",
    shadow: "#000000",
    overlay: "rgba(0, 0, 0, 0.55)",
    /* Inputs */
    inputBg: "#1E293B",
    /* Feedback */
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    dangerSoft: "rgba(239, 68, 68, 0.15)",
    /* Navigation & cane status */
    navBar: "#1E293B",
    statusConnected: "#22C55E",
    statusObstacle: "#EF4444",
  },
};

export type AppTheme = typeof lightTheme | typeof darkTheme;

export function getTheme(isDark: boolean): AppTheme {
  return isDark ? darkTheme : lightTheme;
}
