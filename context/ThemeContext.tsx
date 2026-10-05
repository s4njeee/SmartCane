import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import { getTheme, type AppTheme } from '../constants/theme';
import { ui } from '../utils/ui';

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function syncSystemChrome(isDark: boolean) {
  const page = isDark ? '#0F172A' : '#F8FAFC';
  try {
    await SystemUI.setBackgroundColorAsync(page);
  } catch {
    /* Expo Go / unsupported */
  }
  if (Platform.OS !== 'android') return;
  try {
    // SDK 57+: setBackgroundColorAsync / setButtonStyleAsync were removed.
    // 'dark' = dark bar + light buttons; 'light' = light bar + dark buttons.
    NavigationBar.setStyle(isDark ? 'dark' : 'light');
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
    void syncSystemChrome(isDark);
  }, [isDark]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const setDarkMode = useCallback(async (value: boolean) => {
    setIsDark(value);
    await AsyncStorage.setItem('darkMode', value.toString());
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const theme = useMemo(() => getTheme(isDark), [isDark]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      toggleTheme,
      setDarkMode,
    }),
    [theme, isDark, toggleTheme, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View {...ui('screen', { flex: 1, backgroundColor: theme.colors.background })}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
