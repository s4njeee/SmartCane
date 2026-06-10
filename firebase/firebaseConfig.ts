// firebase/firebaseConfig.ts
// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyBkawM_qrgFgVifZu9_B8O6YfqlXNsUbKk",
//   authDomain: "smartcane-ddedd.firebaseapp.com",
//   projectId: "smartcane-ddedd",
//   storageBucket: "smartcane-ddedd.firebasestorage.app",
//   messagingSenderId: "461252608555",
//   appId: "1:461252608555:web:6c3763928782825a4c606e"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);


import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import  ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {GoogleAuthProvider, signInWithCredential, } from 'firebase/auth';
// import { initializeAuth, getReactNativePersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBkawM_qrgFgVifZu9_B8O6YfqlXNsUbKk",
  authDomain: "smartcane-ddedd.firebaseapp.com",
  projectId: "smartcane-ddedd",
  storageBucket: "smartcane-ddedd.firebasestorage.app",
  messagingSenderId: "461252608555",
  appId: "1:461252608555:web:6c3763928782825a4c606e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth
export const auth = getAuth(app);

// Export Firestore DB
export const db = getFirestore(app);



export default app;