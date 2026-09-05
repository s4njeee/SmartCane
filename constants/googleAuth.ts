import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { googleWebClientId as firebaseGoogleClientId } from './googleOAuth';

type GoogleAuthExtra = {
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as GoogleAuthExtra;

export const GOOGLE_REDIRECT_SCHEME = 'smartcane';
export const EXPO_PROJECT_NAME = '@sanjeeee/smartcane';

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function getStaticGoogleWebClientId(): string {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    extra.googleWebClientId?.trim() ||
    firebaseGoogleClientId?.trim() ||
    ''
  );
}

/** HTTPS redirect for Web OAuth clients. Never use a custom scheme with a Web client ID. */
export function getExpoProxyRedirectUri(): string {
  const owner = Constants.expoConfig?.owner ?? 'sanjeeee';
  const slug = Constants.expoConfig?.slug ?? 'smartcane';
  return `https://auth.expo.io/@${owner}/${slug}`;
}

export function getNativeRedirectUri(): string {
  const bundleId =
    Constants.expoConfig?.ios?.bundleIdentifier ??
    Constants.expoConfig?.android?.package ??
    'com.anonymous.smartcane';

  return AuthSession.makeRedirectUri({
    scheme: GOOGLE_REDIRECT_SCHEME,
    path: 'oauthredirect',
    native: `${bundleId}:/oauthredirect`,
  });
}

export function hasNativeGoogleClientId(): boolean {
  const iosClientId = extra.googleIosClientId?.trim() ?? '';
  const androidClientId = extra.googleAndroidClientId?.trim() ?? '';
  if (Platform.OS === 'ios') return iosClientId.length > 0;
  if (Platform.OS === 'android') return androidClientId.length > 0;
  return true;
}

export function getGoogleRedirectUri(): string {
  if (isExpoGo() || !hasNativeGoogleClientId()) {
    return getExpoProxyRedirectUri();
  }
  return getNativeRedirectUri();
}

/** All redirect URIs to register in Google Cloud OAuth credentials. */
export function getGoogleRedirectUrisForSetup(): string[] {
  return [getExpoProxyRedirectUri()];
}

export function buildGoogleClientConfig(webClientId: string) {
  const useExpoProxy = isExpoGo() || !hasNativeGoogleClientId();
  const iosClientId = extra.googleIosClientId?.trim() || '';
  const androidClientId = extra.googleAndroidClientId?.trim() || '';

  return {
    webClientId,
    iosClientId,
    androidClientId,
    redirectUri: getGoogleRedirectUri(),
    useExpoProxy,
    useIdTokenFlow: useExpoProxy,
  };
}

export function getGoogleClientConfig(webClientId?: string) {
  const id = webClientId ?? getStaticGoogleWebClientId();
  return buildGoogleClientConfig(id);
}

export function isGoogleAuthConfigured(webClientId?: string): boolean {
  const id = webClientId ?? getStaticGoogleWebClientId();
  return id.length > 0 && id.includes('.apps.googleusercontent.com');
}