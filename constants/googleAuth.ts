import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
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

/** HTTPS redirect required for Expo Go — Google rejects exp:// URIs on Web OAuth clients. */
export function getExpoProxyRedirectUri(): string {
  try {
    return AuthSession.getRedirectUrl();
  } catch {
    const owner = Constants.expoConfig?.owner ?? 'sanjeeee';
    const slug = Constants.expoConfig?.slug ?? 'smartcane';
    return `https://auth.expo.io/@${owner}/${slug}`;
  }
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

export function getGoogleRedirectUri(): string {
  if (isExpoGo()) {
    return getExpoProxyRedirectUri();
  }
  return getNativeRedirectUri();
}

/** All redirect URIs to register in Google Cloud OAuth credentials. */
export function getGoogleRedirectUrisForSetup(): string[] {
  return [...new Set([getExpoProxyRedirectUri(), getNativeRedirectUri()])];
}

export function buildGoogleClientConfig(webClientId: string) {
  const expoGo = isExpoGo();
  const iosClientId = extra.googleIosClientId?.trim() || webClientId;
  const androidClientId = extra.googleAndroidClientId?.trim() || webClientId;

  return {
    webClientId,
    iosClientId: expoGo ? webClientId : iosClientId,
    androidClientId: expoGo ? webClientId : androidClientId,
    redirectUri: getGoogleRedirectUri(),
    useExpoProxy: expoGo,
    useIdTokenFlow: expoGo,
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
