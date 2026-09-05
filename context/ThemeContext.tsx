import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { getTheme, type AppTheme } from '../constants/theme';

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function syncAndroidSystemBars(isDark: boolean) {
  if (Platform.OS !== 'android') return;
  try {
    await SystemUI.setBackgroundColorAsync(isDark ? '#050A18' : '#ffffff');
  } catch {
    /* Expo Go / unsupported */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('darkMode').then((saved) => {
      if (saved !== null) setIsDark(saved === 'true');
    });
  }, []);

  useEffect(() => {
    syncAndroidSystemBars(isDark);
  }, [isDark]);

  const setDarkMode = useCallback(async (value: boolean) => {
    setIsDark(value);
    await AsyncStorage.setItem('darkMode', value.toString());
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const value = useMemo(
    () => ({
      theme: getTheme(isDark, Platform.OS === 'android' ? 'android' : 'ios'),
      isDark,
      toggleTheme,
      setDarkMode,
    }),
    [isDark, toggleTheme, setDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
