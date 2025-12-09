// lib/firebase.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

// Only initialize if no app exists
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
