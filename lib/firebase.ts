import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyAOWDHBpfsWLRTHej5mNo1KL03o0OGpuFE",
  authDomain: "gastro-b11b1.firebaseapp.com",
  projectId: "gastro-b11b1",
  storageBucket: "gastro-b11b1.firebasestorage.app",
  messagingSenderId: "518513988174",
  appId: "1:518513988174:web:58ef3918356d60a458a91f",
  measurementId: "G-CZND4LLG3K"
};

const app = initializeApp(firebaseConfig);
// Required for React Native apps
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

//(You’ll drop your Firebase values here.)