import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

/** Native Google OAuth return path. */
export default function OAuthRedirectReturn() {
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
