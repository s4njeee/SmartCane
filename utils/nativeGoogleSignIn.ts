import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getStaticGoogleWebClientId } from '../constants/googleAuth';

type NativeSignInResult = {
  idToken: string;
};

type GoogleSigninModule = {
  GoogleSignin: {
    configure: (options: {
      webClientId: string;
      offlineAccess?: boolean;
      forceCodeForRefreshToken?: boolean;
    }) => void;
    hasPlayServices: (options?: {
      showPlayServicesUpdateDialog?: boolean;
    }) => Promise<boolean>;
    signIn: () => Promise<{ data?: { idToken?: string | null } | null; type?: string } | { idToken?: string | null }>;
    signOut: () => Promise<null>;
  };
  isErrorWithCode: (error: unknown) => boolean;
  statusCodes: {
    SIGN_IN_CANCELLED: string | number;
    IN_PROGRESS: string | number;
    PLAY_SERVICES_NOT_AVAILABLE: string | number;
  };
  isSuccessResponse?: (response: unknown) => boolean;
};

let cachedModule: GoogleSigninModule | null | undefined;
let configuredClientId: string | null = null;

function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function getNativeModule(): GoogleSigninModule | null {
  if (Platform.OS === 'web' || isExpoGo()) return null;
  if (cachedModule !== undefined) return cachedModule;
  try {
    // Native module — only available in a development / production build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/** True when the phone can show Google’s native account picker (no website). */
export function canUseNativeGoogleSignIn() {
  return getNativeModule() != null;
}

function ensureConfigured(webClientId: string) {
  const mod = getNativeModule();
  if (!mod) return;
  if (configuredClientId === webClientId) return;
  mod.GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
  configuredClientId = webClientId;
}

function extractIdToken(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const value = response as {
    type?: string;
    data?: { idToken?: string | null };
    idToken?: string | null;
  };
  if (value.type === 'cancelled' || value.type === 'noSavedCredentialFound') {
    return null;
  }
  return value.data?.idToken || value.idToken || null;
}

/**
 * Opens the native Google account sheet on the phone (no browser redirect).
 * Requires a development build or release APK/IPA — not Expo Go.
 */
export async function signInWithNativeGoogle(
  webClientId = getStaticGoogleWebClientId()
): Promise<NativeSignInResult | null> {
  const mod = getNativeModule();
  if (!mod) {
    throw new Error(
      'Native Google Sign-In needs a development build. Expo Go still opens the browser.'
    );
  }
  if (!webClientId.includes('.apps.googleusercontent.com')) {
    throw new Error('Google Web Client ID is not configured.');
  }

  ensureConfigured(webClientId);

  if (Platform.OS === 'android') {
    await mod.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }

  try {
    const response = await mod.GoogleSignin.signIn();
    const idToken = extractIdToken(response);
    if (!idToken) return null;
    return { idToken };
  } catch (error) {
    if (mod.isErrorWithCode(error)) {
      const code = (error as { code?: string | number }).code;
      if (code === mod.statusCodes.SIGN_IN_CANCELLED) {
        return null;
      }
      if (code === mod.statusCodes.IN_PROGRESS) {
        throw new Error('Google sign-in is already in progress.');
      }
      if (code === mod.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is missing or out of date.');
      }
    }
    throw error;
  }
}
