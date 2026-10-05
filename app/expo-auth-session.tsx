import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

/** Catch Google OAuth return so Expo Router does not show a missing-route page. */
export default function ExpoAuthSessionReturn() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/');
    }, 400);
    return () => clearTimeout(timer);
  }, [router]);

  return <View style={{ flex: 1 }} />;
}
