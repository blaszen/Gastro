// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
import { secureStorage } from "./secureStorage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOWDHBpfsWLRTHej5mNo1KL03o0OGpuFE",
  authDomain: "gastro-b11b1.firebaseapp.com",
  projectId: "gastro-b11b1",
  storageBucket: "gastro-b11b1.firebasestorage.app",
  messagingSenderId: "518513988174",
  appId: "1:518513988174:web:58ef3918356d60a458a91f",
  measurementId: "G-CZND4LLG3K",
};

// Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with SecureStore (Keychain) persistence
const auth =
  getApps().length === 1
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(secureStorage),
      })
    : getAuth(app);

const db = getFirestore(app);

export { app, auth, db };
/** 
  apiKey: "AIzaSyAOWDHBpfsWLRTHej5mNo1KL03o0OGpuFE",
  authDomain: "gastro-b11b1.firebaseapp.com",
  projectId: "gastro-b11b1",
  storageBucket: "gastro-b11b1.firebasestorage.app",
  messagingSenderId: "518513988174",
  appId: "1:518513988174:web:58ef3918356d60a458a91f",
  measurementId: "G-CZND4LLG3K",
*/


