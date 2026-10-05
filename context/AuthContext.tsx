import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { useTheme } from './ThemeContext';
import { ui } from '../utils/ui';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/expo-auth-session',
  '/oauthredirect',
];

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
  }, []);

  const value = useMemo(
    () => ({ user, initializing }),
    [user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AuthGate() {
  const { user, initializing } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (initializing) return;
    if (!navigationState?.key) return;

    const isPublicRoute = PUBLIC_PATHS.includes(pathname);

    if (user && isPublicRoute) {
      router.replace('/home');
    } else if (!user && !isPublicRoute) {
      router.replace('/login');
    }
  }, [user, initializing, pathname, router, navigationState?.key]);

  return null;
}

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { initializing } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <>
      {children}
      {initializing ? (
        <View {...ui('auth-boot', [styles.loading, { backgroundColor: colors.background }])}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <AuthGate />
      )}
    </>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
});
