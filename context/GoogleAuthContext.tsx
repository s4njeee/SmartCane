import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';
import { ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { buildGoogleClientConfig } from '../constants/googleAuth';
import { loadGoogleWebClientId } from '../utils/googleClientStore';
import {
  canUseNativeGoogleSignIn,
  signInWithNativeGoogle,
} from '../utils/nativeGoogleSignIn';
import {
  formatGoogleAuthError,
  isPaymentRelatedError,
  isPaymentRelatedUrl,
  promptGoogleAuthExpoGo,
  showPaymentBlockedAlert,
  signIntoFirebaseWithGoogle,
} from '../utils/googleSignIn';

WebBrowser.maybeCompleteAuthSession();

const PLACEHOLDER_CLIENT_ID =
  '000000000000-placeholder.apps.googleusercontent.com';

type GoogleAuthContextValue = {
  signIn: () => Promise<boolean>;
  loading: boolean;
  ready: boolean;
  showSetup: boolean;
  closeSetup: () => void;
  onSetupSaved: (clientId: string) => Promise<boolean>;
};

const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  const [webClientId, setWebClientId] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const nativeAvailable = canUseNativeGoogleSignIn();

  useEffect(() => {
    loadGoogleWebClientId().then((id) => {
      setWebClientId(id);
      setBootstrapped(true);
    });
  }, []);

  const configured = webClientId.includes('.apps.googleusercontent.com');
  const config = useMemo(
    () => (configured ? buildGoogleClientConfig(webClientId) : null),
    [configured, webClientId]
  );

  // Browser OAuth is only kept as a fallback for Expo Go / web.
  const authRequestConfig = useMemo(
    () => ({
      clientId: configured && config ? config.webClientId : PLACEHOLDER_CLIENT_ID,
      webClientId: configured && config ? config.webClientId : PLACEHOLDER_CLIENT_ID,
      ...(configured && config?.iosClientId
        ? { iosClientId: config.iosClientId }
        : {}),
      ...(configured && config?.androidClientId
        ? { androidClientId: config.androidClientId }
        : {}),
      redirectUri: configured && config ? config.redirectUri : undefined,
      selectAccount: true,
      ...(configured && config?.useIdTokenFlow
        ? { responseType: ResponseType.IdToken }
        : {}),
    }),
    [configured, config]
  );

  const redirectUriOptions = useMemo(
    () =>
      configured && config?.useExpoProxy
        ? {}
        : { scheme: 'smartcane', path: 'oauthredirect' },
    [configured, config?.useExpoProxy]
  );

  const [request, , promptAsync] = Google.useAuthRequest(
    authRequestConfig,
    redirectUriOptions
  );

  const finishWithIdToken = useCallback(async (idToken: string) => {
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
  }, []);

  const runNativeGoogleSignIn = useCallback(
    async (clientId: string): Promise<boolean> => {
      try {
        const native = await signInWithNativeGoogle(clientId);
        if (!native?.idToken) return false;
        return finishWithIdToken(native.idToken);
      } catch (error) {
        if (isPaymentRelatedError(error)) {
          showPaymentBlockedAlert();
          return false;
        }
        Alert.alert('Google Sign-In Failed', formatGoogleAuthError(error));
        return false;
      }
    },
    [finishWithIdToken]
  );

  const runBrowserGoogleSignIn = useCallback(async (): Promise<boolean> => {
    if (!request) {
      Alert.alert(
        'Please wait',
        'Google sign-in is still loading. Try again in a moment.'
      );
      return false;
    }

    try {
      const result =
        config?.useExpoProxy && config.redirectUri
          ? await promptGoogleAuthExpoGo(request, config.redirectUri, {
              showInRecents: true,
            })
          : await promptAsync({ showInRecents: true });

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return false;
      }

      const idTokenFromError =
        result.type === 'error'
          ? result.params?.id_token ?? result.authentication?.idToken
          : undefined;

      if (result.type === 'error' && !idTokenFromError) {
        if (isPaymentRelatedError(result.error)) {
          showPaymentBlockedAlert();
          return false;
        }
        Alert.alert(
          'Google Sign-In Failed',
          formatGoogleAuthError(result.error)
        );
        return false;
      }

      if (result.type !== 'success' && !idTokenFromError) {
        return false;
      }

      if (isPaymentRelatedUrl(result.url)) {
        showPaymentBlockedAlert();
        return false;
      }

      const idToken =
        result.authentication?.idToken ??
        result.params?.id_token ??
        idTokenFromError;
      if (!idToken) {
        Alert.alert(
          'Google Sign-In Failed',
          'No ID token returned. Rebuild the app with native Google Sign-In, or check your Google OAuth client setup.'
        );
        return false;
      }

      return finishWithIdToken(idToken);
    } catch (error) {
      if (isPaymentRelatedError(error)) {
        showPaymentBlockedAlert();
        return false;
      }
      Alert.alert('Google Sign-In Failed', formatGoogleAuthError(error));
      return false;
    }
  }, [
    config?.redirectUri,
    config?.useExpoProxy,
    finishWithIdToken,
    promptAsync,
    request,
  ]);

  const runGoogleSignIn = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const clientId = configured
        ? webClientId
        : await loadGoogleWebClientId();

      // Phone: native Google account picker only (no website redirect).
      if (Platform.OS !== 'web') {
        if (nativeAvailable) {
          return runNativeGoogleSignIn(clientId);
        }
        Alert.alert(
          'Native Google Sign-In required',
          'Continue with Google now uses the phone’s Google account picker.\n\nIt does not open a website. Rebuild and install the app:\n\nnpx expo run:android\n\n(Expo Go cannot use native Google Sign-In.)'
        );
        return false;
      }

      // Web only: browser OAuth.
      return runBrowserGoogleSignIn();
    } finally {
      setLoading(false);
    }
  }, [
    configured,
    nativeAvailable,
    runBrowserGoogleSignIn,
    runNativeGoogleSignIn,
    webClientId,
  ]);

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

  const value = useMemo(
    () => ({
      signIn,
      loading,
      ready:
        bootstrapped &&
        (nativeAvailable || !configured || !!request || Platform.OS === 'web'),
      showSetup,
      closeSetup: () => setShowSetup(false),
      onSetupSaved,
    }),
    [
      bootstrapped,
      configured,
      loading,
      nativeAvailable,
      onSetupSaved,
      request,
      showSetup,
      signIn,
    ]
  );

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleSignIn() {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) {
    throw new Error('useGoogleSignIn must be used within GoogleAuthProvider');
  }
  return ctx;
}
