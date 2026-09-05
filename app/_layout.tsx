import 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import { Stack } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthBootstrap, AuthProvider } from '../context/AuthContext';
import { CaneStatusProvider } from '../context/CaneStatusContext';
import { NavigationProvider } from '../context/NavigationContext';
import GoNavigationBanner from '../components/ui/GoNavigationBanner';
import { StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  addEmergencyNotificationResponseListener,
  configureEmergencyNotifications,
} from '../utils/emergencyNotifications';

const fadeScreen = { animation: 'fade' as const, animationDuration: 220 };
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
        <Stack.Screen name="index" options={fadeScreen} />
        <Stack.Screen name="login" options={sheetScreen} />
        <Stack.Screen name="signup" options={sheetScreen} />
        <Stack.Screen name="home" options={fadeScreen} />
        <Stack.Screen name="messages" options={fadeScreen} />
        <Stack.Screen name="profile" options={fadeScreen} />
        <Stack.Screen name="editprofile" options={sheetScreen} />
        <Stack.Screen name="changepassword" options={sheetScreen} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <BottomSheetModalProvider>
            <NavigationProvider>
              <CaneStatusProvider>
                <AuthBootstrap>
                  <RootStack />
                </AuthBootstrap>
                <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                  <GoNavigationBanner />
                </View>
              </CaneStatusProvider>
            </NavigationProvider>
          </BottomSheetModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
