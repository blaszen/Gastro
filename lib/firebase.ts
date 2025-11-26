import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
const firebaseConfig = {
  apiKey: "AIzaSyAYK-wZWF8wP_fkkC9EbDW6yR7m2un70Xk",
  authDomain: "personal-assistant-3be0e.firebaseapp.com",
  projectId: "personal-assistant-3be0e",
  appId: "1:1065525712304:web:8774102c52ac9119a37275"};

const app = initializeApp(firebaseConfig);
// Required for React Native apps
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

//(You’ll drop your Firebase values here.)