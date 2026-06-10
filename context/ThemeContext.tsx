import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme, type AppTheme } from '../constants/theme';

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('darkMode').then((saved) => {
      if (saved !== null) setIsDark(saved === 'true');
    });
  }, []);

  const setDarkMode = useCallback(async (value: boolean) => {
    setIsDark(value);
    await AsyncStorage.setItem('darkMode', value.toString());
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const value = useMemo(
    () => ({
      theme: getTheme(isDark),
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
