import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { useTheme } from './ThemeContext';

const PUBLIC_PATHS = ['/', '/login', '/signup'];

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

  useEffect(() => {
    if (initializing) return;

    const isPublicRoute = PUBLIC_PATHS.includes(pathname);

    if (user && isPublicRoute) {
      router.replace('/home');
    } else if (!user && !isPublicRoute) {
      router.replace('/login');
    }
  }, [user, initializing, pathname, router]);

  return null;
}

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { initializing } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;

  if (initializing) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <AuthGate />
      {children}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
