import 'react-native-reanimated';
import '../styles/applyWebCss';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthBootstrap, AuthProvider } from '../context/AuthContext';
import { CaneStatusProvider } from '../context/CaneStatusContext';
import { GoogleAuthProvider } from '../context/GoogleAuthContext';
import { NavigationProvider } from '../context/NavigationContext';
import GoNavigationBanner from '../components/ui/GoNavigationBanner';
import { StyleSheet, View } from 'react-native';
import { ui } from '../utils/ui';
import React, { useEffect, useRef } from 'react';
import {
  addEmergencyNotificationResponseListener,
  configureEmergencyNotifications,
} from '../utils/emergencyNotifications';

WebBrowser.maybeCompleteAuthSession();

const fadeScreen = { animation: 'fade' as const, animationDuration: 220 };
const authScreen = { animation: 'none' as const };
const sheetScreen = { animation: 'slide_from_bottom' as const, animationDuration: 280 };

function EmergencyNotificationBridge() {
  const router = useRouter();

  useEffect(() => {
    void configureEmergencyNotifications();
    return addEmergencyNotificationResponseListener(() => {
      router.push('/messages');
    });
  }, [router]);

  return null;
}

function RootStack() {
  const { isDark } = useTheme();

  return (
    <>
      <EmergencyNotificationBridge />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, ...fadeScreen }}>
        <Stack.Screen name="index" options={authScreen} />
        <Stack.Screen name="login" options={authScreen} />
        <Stack.Screen name="signup" options={authScreen} />
        <Stack.Screen name="home" options={fadeScreen} />
        <Stack.Screen name="messages" options={fadeScreen} />
        <Stack.Screen name="profile" options={fadeScreen} />
        <Stack.Screen name="editprofile" options={sheetScreen} />
        <Stack.Screen name="changepassword" options={sheetScreen} />
        <Stack.Screen name="reportproblem" options={sheetScreen} />
        <Stack.Screen name="adminreports" options={sheetScreen} />
        <Stack.Screen
          name="expo-auth-session"
          options={{ animation: 'none', gestureEnabled: false }}
        />
        <Stack.Screen
          name="oauthredirect"
          options={{ animation: 'none', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}

export default function Layout() {
  const inspectRootRef = useRef<View | null>(null);

  useEffect(() => {
    if (!__DEV__) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setInspectRootRef } = require('../dev/inspector/inspectRoot');
      setInspectRootRef(inspectRootRef);
      return () => setInspectRootRef(null);
    } catch {
      // inspector absent
    }
  }, []);

  return (
    <GestureHandlerRootView {...ui('flex-1', { flex: 1 })}>
      <View ref={inspectRootRef} {...ui('app-root', styles.appRoot)} collapsable={false}>
        <ThemeProvider>
          <AuthProvider>
            <GoogleAuthProvider>
              <BottomSheetModalProvider>
                <NavigationProvider>
                  <CaneStatusProvider>
                    <AuthBootstrap>
                      <RootStack />
                    </AuthBootstrap>
                    <View pointerEvents="box-none" {...ui('banner-layer', StyleSheet.absoluteFill)}>
                      <GoNavigationBanner />
                    </View>
                  </CaneStatusProvider>
                </NavigationProvider>
              </BottomSheetModalProvider>
            </GoogleAuthProvider>
          </AuthProvider>
        </ThemeProvider>
      </View>
      {__DEV__
        ? React.createElement(
            // Require inside DEV so release bundles drop the inspector.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('../dev/inspector').UiInspector,
          )
        : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
});
