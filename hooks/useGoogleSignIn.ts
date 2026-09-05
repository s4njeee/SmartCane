import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import {
  formatGoogleAuthError,
  isPaymentRelatedError,
  isPaymentRelatedUrl,
  promptGoogleAuthExpoGo,
  showPaymentBlockedAlert,
  signIntoFirebaseWithGoogle,
} from '../utils/googleSignIn';
import { buildGoogleClientConfig } from '../constants/googleAuth';
import { loadGoogleWebClientId } from '../utils/googleClientStore';

const PLACEHOLDER_CLIENT_ID = '000000000000-placeholder.apps.googleusercontent.com';

export function useGoogleSignIn() {
  const [webClientId, setWebClientId] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    loadGoogleWebClientId().then((id) => {
      setWebClientId(id);
      setBootstrapped(true);
    });
  }, []);

  const configured = webClientId.includes('.apps.googleusercontent.com');
  const config = configured ? buildGoogleClientConfig(webClientId) : null;

  const [request, , promptAsync] = Google.useAuthRequest(
    {
      clientId: configured ? config!.webClientId : PLACEHOLDER_CLIENT_ID,
      webClientId: configured ? config!.webClientId : PLACEHOLDER_CLIENT_ID,
      ...(configured && config!.iosClientId
        ? { iosClientId: config!.iosClientId }
        : {}),
      ...(configured && config!.androidClientId
        ? { androidClientId: config!.androidClientId }
        : {}),
      redirectUri: configured ? config!.redirectUri : undefined,
      selectAccount: true,
      ...(configured && config!.useIdTokenFlow
        ? { responseType: ResponseType.IdToken }
        : {}),
    },
    configured && config!.useExpoProxy
      ? {}
      : { scheme: 'smartcane', path: 'oauthredirect' }
  );

  const runGoogleSignIn = useCallback(async (): Promise<boolean> => {
    if (!request) {
      Alert.alert('Please wait', 'Google sign-in is still loading. Try again in a moment.');
      return false;
    }

    setLoading(true);
    try {
      const result =
        config?.useExpoProxy && config.redirectUri
          ? await promptGoogleAuthExpoGo(request, config.redirectUri, { showInRecents: true })
          : await promptAsync({ showInRecents: true });

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return false;
      }

      if (result.type === 'error') {
        if (isPaymentRelatedError(result.error)) {
          showPaymentBlockedAlert();
          return false;
        }
        Alert.alert('Google Sign-In Failed', formatGoogleAuthError(result.error));
        return false;
      }

      if (result.type !== 'success') {
        return false;
      }

      if (isPaymentRelatedUrl(result.url)) {
        showPaymentBlockedAlert();
        return false;
      }

      const idToken = result.authentication?.idToken ?? result.params?.id_token;
      if (!idToken) {
        Alert.alert(
          'Google Sign-In Failed',
          `No ID token returned. In Google Cloud OAuth, add this redirect URI:\n${config?.redirectUri ?? 'https://auth.expo.io/@sanjeeee/smartcane'}`
        );
        return false;
      }

      try {
        await signIntoFirebaseWithGoogle(idToken);
        return true;
      } catch (error) {
        if (isPaymentRelatedError(error)) {
          showPaymentBlockedAlert();
          return false;
        }
        Alert.alert('Google Sign-In Failed', formatGoogleAuthError(error));
        return false;
      }
    } catch (error) {
      if (isPaymentRelatedError(error)) {
        showPaymentBlockedAlert();
        return false;
      }
      Alert.alert('Google Sign-In Failed', formatGoogleAuthError(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [config?.redirectUri, config?.useExpoProxy, promptAsync, request]);

  const signIn = useCallback(async (): Promise<boolean> => {
    if (!bootstrapped) {
      Alert.alert('Please wait', 'Google sign-in is still loading.');
      return false;
    }

    const id = configured ? webClientId : await loadGoogleWebClientId();
    if (!id.includes('.apps.googleusercontent.com')) {
      setShowSetup(true);
      return false;
    }

    if (!configured) {
      setWebClientId(id);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return runGoogleSignIn();
  }, [bootstrapped, configured, runGoogleSignIn, webClientId]);

  const onSetupSaved = useCallback(
    async (clientId: string): Promise<boolean> => {
      setWebClientId(clientId);
      setShowSetup(false);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return runGoogleSignIn();
    },
    [runGoogleSignIn]
  );

  return {
    signIn,
    loading,
    ready: bootstrapped && (configured ? !!request : true),
    showSetup,
    closeSetup: () => setShowSetup(false),
    onSetupSaved,
  };
}