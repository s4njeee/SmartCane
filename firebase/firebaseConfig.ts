import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBkawM_qrgFgVifZu9_B8O6YfqlXNsUbKk',
  authDomain: 'smartcane-ddedd.firebaseapp.com',
  projectId: 'smartcane-ddedd',
  storageBucket: 'smartcane-ddedd.firebasestorage.app',
  messagingSenderId: '461252608555',
  appId: '1:461252608555:web:6c3763928782825a4c606e',
};

export { googleWebClientId } from '../constants/googleOAuth';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createAuth() {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    const { getReactNativePersistence } = require('@firebase/auth/dist/rn/index.js') as {
      getReactNativePersistence?: (storage: typeof ReactNativeAsyncStorage) => Persistence;
    };

    if (typeof getReactNativePersistence === 'function') {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    }
  } catch (error: any) {
    if (error?.code === 'auth/already-initialized') {
      return getAuth(app);
    }
  }

  return getAuth(app);
}

export const auth = createAuth();
export const db = getFirestore(app);

export default app;
