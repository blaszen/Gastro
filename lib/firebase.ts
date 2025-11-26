import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  appId: "...",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);


//(You’ll drop your Firebase values here.)