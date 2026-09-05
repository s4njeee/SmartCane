import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { AuthSessionResult } from 'expo-auth-session';
import { discovery } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { saveUserProfile } from '../firebase/appData';

type GoogleAuthRequestLike = {
  makeAuthUrlAsync: (issuer: typeof discovery) => Promise<string>;
  parseReturnUrl: (url: string) => AuthSessionResult;
};

/** Expo Go must use the auth.expo.io proxy — Google blocks exp:// redirect URIs. */
export async function promptGoogleAuthExpoGo(
  request: GoogleAuthRequestLike,
  proxyRedirectUri: string,
  options?: { showInRecents?: boolean }
): Promise<AuthSessionResult> {
  const returnUrl = AuthSession.getDefaultReturnUrl();
  const authUrl = await request.makeAuthUrlAsync(discovery);
  const startUrl = `${proxyRedirectUri}/start?${new URLSearchParams({
    authUrl,
    returnUrl,
  }).toString()}`;

  const browserResult = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl, {
    showInRecents: options?.showInRecents ?? true,
  });

  if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
    return { type: browserResult.type };
  }
  if (browserResult.type !== 'success') {
    return { type: 'cancel' };
  }

  return request.parseReturnUrl(browserResult.url);
}

const PAYMENT_KEYWORDS = [
  'billing',
  'payment',
  'blaze',
  'upgrade your plan',
  'identity platform',
  'enable billing',
  'paid plan',
  'subscription',
  'credit card',
];

export function isPaymentRelatedError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  const code = String((error as { code?: string })?.code ?? '').toLowerCase();
  const description = String(
    (error as { error_description?: string })?.error_description ?? ''
  ).toLowerCase();

  const combined = `${message} ${code} ${description}`;
  return PAYMENT_KEYWORDS.some((keyword) => combined.includes(keyword));
}

export function isPaymentRelatedUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('billing') ||
    lower.includes('payment') ||
    lower.includes('cloudconsole.googleapis.com/billing') ||
    lower.includes('console.cloud.google.com/freetrial')
  );
}

export function showPaymentBlockedAlert() {
  Alert.alert(
    'Google Sign-In Stopped',
    'Google asked for billing or payment setup. Sign-in was cancelled. You can still use email login — Firebase Spark (free) does not require payment for Google sign-in.'
  );
}

function getErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong.';
  if (typeof error === 'string') return error;
  const message = (error as { message?: string }).message;
  if (message) return message;
  return 'Google sign-in failed. Please try again.';
}

export function formatGoogleAuthError(error: unknown): string {
  if (isPaymentRelatedError(error)) {
    return 'Google requested billing or payment. Sign-in was not completed.';
  }
  return getErrorMessage(error);
}

export async function signIntoFirebaseWithGoogle(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  const user = userCredential.user;

  const snapshot = await getDoc(doc(db, 'users', user.uid));
  if (!snapshot.exists()) {
    const displayName = user.displayName?.trim() || 'SmartCane User';
    if (!user.displayName) {
      await updateProfile(user, { displayName });
    }
    await saveUserProfile(user.uid, {
      displayName,
      email: user.email ?? '',
      avatar_url: user.photoURL ?? null,
      createdAt: new Date().toISOString(),
      authProvider: 'google',
    });
  }

  return user;
}